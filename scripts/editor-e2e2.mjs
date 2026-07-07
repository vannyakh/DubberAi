/**
 * Deep E2E: timeline element insertion via commands, split, undo/redo,
 * and WASM compositor pixel readback.
 *
 * Usage: node scripts/editor-e2e2.mjs [baseUrl]
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(
  join(process.cwd(), "node_modules", ".pnpm", "ws@8.21.0", "node_modules", "ws", "package.json"),
);
const WebSocket = require("ws");

const baseUrl = process.argv[2] ?? "http://127.0.0.1:3001";
const port = 9335;

const chrome = spawn(
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  [
    "--headless=new",
    "--no-first-run",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "chrome-e2e2-"))}`,
    "--window-size=1720,980",
    "--enable-unsafe-webgpu",
    "--enable-unsafe-swiftshader",
    "--use-angle=swiftshader",
    "about:blank",
  ],
  { stdio: "ignore" },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === "page");
      if (page) return page;
    } catch {}
    await sleep(250);
  }
  throw new Error("Chrome debugger not reachable");
}

const target = await getTarget();
const ws = new WebSocket(target.webSocketDebuggerUrl, { perMessageDeflate: false });
await new Promise((resolve, reject) => {
  ws.once("open", resolve);
  ws.once("error", reject);
});

let msgId = 0;
const pending = new Map();
function send(method, params = {}) {
  const id = ++msgId;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve) => pending.set(id, resolve));
}

const logs = [];
ws.on("message", (raw) => {
  const msg = JSON.parse(raw.toString());
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result ?? msg.error);
    pending.delete(msg.id);
    return;
  }
  if (msg.method === "Runtime.consoleAPICalled") {
    const text = msg.params.args.map((a) => a.value ?? a.description ?? "").join(" ");
    logs.push(`[console.${msg.params.type}] ${text}`);
  } else if (msg.method === "Runtime.exceptionThrown") {
    const d = msg.params.exceptionDetails;
    logs.push(`[exception] ${d.text} ${d.exception?.description ?? ""}`);
  }
});

async function evalAsync(expression, attempt = 0) {
  const res = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (res.exceptionDetails) {
    return { error: (res.exceptionDetails.exception?.description ?? res.exceptionDetails.text).slice(0, 600) };
  }
  // Vite may trigger a full page reload when the eval imports modules that
  // cause dependency re-optimization; wait for the reload and retry.
  if (res.code === -32000 && attempt < 3) {
    await sleep(8000);
    return evalAsync(expression, attempt + 1);
  }
  return { value: res.result?.value };
}

await send("Runtime.enable");
await send("Page.enable");
await send("Page.navigate", { url: `${baseUrl}/projects` });
await sleep(8000);

const created = await evalAsync(`(async () => {
  const { EditorCore } = await import("/src/core/index.ts");
  const editor = EditorCore.getInstance();
  return await editor.project.createNewProject({ name: "E2E Deep" });
})()`);
console.log("CREATE:", JSON.stringify(created));

await send("Page.navigate", { url: `${baseUrl}/editor/${created.value}` });
await sleep(10000);

const sanity = await send("Runtime.evaluate", {
  expression: "1+1",
  returnByValue: true,
});
console.log("SANITY:", JSON.stringify(sanity));

// Insert media + text elements through the real command pipeline.
const insert = await evalAsync(`(async () => {
  try {
  const { EditorCore } = await import("/src/core/index.ts");
  const { buildElementFromMedia, buildTextElement } = await import("/src/timeline/element-utils.ts");
  const { processMediaAssets } = await import("/src/media/processing.ts");
  const { AddMediaAssetCommand } = await import("/src/commands/media/index.ts");
  const { InsertElementCommand } = await import("/src/commands/timeline/index.ts");
  const { BatchCommand } = await import("/src/commands/index.ts");
  const { mediaTimeFromSeconds, ZERO_MEDIA_TIME } = await import("/src/wasm/index.ts");
  const { DEFAULT_NEW_ELEMENT_DURATION } = await import("/src/timeline/creation.ts");
  const editor = EditorCore.getInstance();
  const project = editor.project.getActive();

  const canvas = document.createElement("canvas");
  canvas.width = 640; canvas.height = 360;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ff6600"; ctx.fillRect(0, 0, 640, 360);
  const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
  const file = new File([blob], "bg.png", { type: "image/png" });
  const [processed] = await processMediaAssets({ files: [file] });

  const addMediaCmd = new AddMediaAssetCommand(project.metadata.id, processed);
  const assetId = addMediaCmd.getAssetId();
  const element = buildElementFromMedia({
    mediaId: assetId,
    mediaType: processed.type,
    name: processed.name,
    duration: DEFAULT_NEW_ELEMENT_DURATION,
    startTime: ZERO_MEDIA_TIME,
  });
  const insertCmd = new InsertElementCommand({
    element,
    placement: { mode: "auto", trackType: "video" },
  });
  editor.command.execute({ command: new BatchCommand([addMediaCmd, insertCmd]) });

  const text = buildTextElement({
    raw: { content: "Hello WASM", duration: mediaTimeFromSeconds({ seconds: 3 }) },
    startTime: ZERO_MEDIA_TIME,
  });
  editor.command.execute({ command: new InsertElementCommand({
    element: text,
    placement: { mode: "auto", trackType: "text" },
  }) });

  const scene = editor.scenes.getActiveScene();
  return JSON.stringify({
    main: scene.tracks.main.elements.length,
    overlay: scene.tracks.overlay.map(t => t.elements.length),
    audio: scene.tracks.audio.length,
    assets: editor.media.getAssets().length,
  });
  } catch (e) {
    return "ERR: " + (e && e.stack ? e.stack : String(e));
  }
})()`);
console.log("INSERT:", JSON.stringify(insert));

const undoRedo = await evalAsync(`(async () => {
  try {
  const { EditorCore } = await import("/src/core/index.ts");
  const editor = EditorCore.getInstance();
  const before = editor.scenes.getActiveScene().tracks.main.elements.length +
    editor.scenes.getActiveScene().tracks.overlay.reduce((a, t) => a + t.elements.length, 0);
  editor.command.undo();
  const afterUndo = editor.scenes.getActiveScene().tracks.main.elements.length +
    editor.scenes.getActiveScene().tracks.overlay.reduce((a, t) => a + t.elements.length, 0);
  editor.command.redo();
  const afterRedo = editor.scenes.getActiveScene().tracks.main.elements.length +
    editor.scenes.getActiveScene().tracks.overlay.reduce((a, t) => a + t.elements.length, 0);
  return JSON.stringify({ before, afterUndo, afterRedo, canUndo: editor.command.canUndo(), canRedo: editor.command.canRedo() });
  } catch (e) {
    return "ERR: " + (e && e.stack ? e.stack : String(e));
  }
})()`);
console.log("UNDO/REDO:", JSON.stringify(undoRedo));

// Give the preview RAF a moment, then read compositor canvas pixels.
await sleep(3000);
const pixels = await evalAsync(`(async () => {
  const canvases = Array.from(document.querySelectorAll("canvas"));
  const readings = [];
  for (const c of canvases) {
    try {
      const probe = document.createElement("canvas");
      probe.width = Math.min(c.width, 64) || 1;
      probe.height = Math.min(c.height, 64) || 1;
      const ctx = probe.getContext("2d");
      ctx.drawImage(c, 0, 0, probe.width, probe.height);
      const data = ctx.getImageData(0, 0, probe.width, probe.height).data;
      let nonZero = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] || data[i+1] || data[i+2]) nonZero++;
      }
      readings.push({ w: c.width, h: c.height, cls: c.className.slice(0, 60), nonZeroPx: nonZero });
    } catch (e) {
      readings.push({ error: String(e).slice(0, 120) });
    }
  }
  return readings;
})()`);
console.log("CANVAS PIXELS:", JSON.stringify(pixels));

console.log("=== CONSOLE (errors) ===");
for (const line of logs.filter((l) => /error|exception/i.test(l)).slice(0, 20)) {
  console.log(line.slice(0, 400));
}

ws.close();
chrome.kill();
process.exit(0);
