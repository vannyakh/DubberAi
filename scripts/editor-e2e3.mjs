/**
 * Consolidated E2E: warm up module graph first, then run one eval that
 * exercises insert -> undo -> redo -> split -> playback -> renderer state.
 *
 * Usage: node scripts/editor-e2e3.mjs [baseUrl]
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
const port = 9336;

const chrome = spawn(
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  [
    "--headless=new",
    "--no-first-run",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "chrome-e2e3-"))}`,
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
    return { error: (res.exceptionDetails.exception?.description ?? res.exceptionDetails.text).slice(0, 800) };
  }
  if (res.code === -32000 && attempt < 4) {
    await sleep(8000);
    return evalAsync(expression, attempt + 1);
  }
  return { value: res.result?.value };
}

const WARMUP = `(async () => {
  await import("/src/core/index.ts");
  await import("/src/timeline/element-utils.ts");
  await import("/src/media/processing.ts");
  await import("/src/commands/media/index.ts");
  await import("/src/commands/timeline/index.ts");
  await import("/src/commands/index.ts");
  await import("/src/wasm/index.ts");
  await import("/src/timeline/creation.ts");
  return "warm";
})()`;

await send("Runtime.enable");
await send("Page.enable");
await send("Page.navigate", { url: `${baseUrl}/projects` });
await sleep(8000);
console.log("WARMUP1:", JSON.stringify(await evalAsync(WARMUP)));

const created = await evalAsync(`(async () => {
  const { EditorCore } = await import("/src/core/index.ts");
  return await EditorCore.getInstance().project.createNewProject({ name: "E2E Final" });
})()`);
console.log("CREATE:", JSON.stringify(created));

await send("Page.navigate", { url: `${baseUrl}/editor/${created.value}` });
await sleep(10000);
console.log("WARMUP2:", JSON.stringify(await evalAsync(WARMUP)));

const result = await evalAsync(`(async () => {
  try {
    const { EditorCore } = await import("/src/core/index.ts");
    const { buildElementFromMedia, buildTextElement } = await import("/src/timeline/element-utils.ts");
    const { processMediaAssets } = await import("/src/media/processing.ts");
    const { AddMediaAssetCommand } = await import("/src/commands/media/index.ts");
    const { InsertElementCommand, SplitElementsCommand } = await import("/src/commands/timeline/index.ts");
    const { BatchCommand } = await import("/src/commands/index.ts");
    const { mediaTimeFromSeconds, ZERO_MEDIA_TIME } = await import("/src/wasm/index.ts");
    const { DEFAULT_NEW_ELEMENT_DURATION } = await import("/src/timeline/creation.ts");
    const editor = EditorCore.getInstance();
    const project = editor.project.getActive();
    const out = {};

    const canvas = document.createElement("canvas");
    canvas.width = 640; canvas.height = 360;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ff6600"; ctx.fillRect(0, 0, 640, 360);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
    const file = new File([blob], "bg.png", { type: "image/png" });
    const [processed] = await processMediaAssets({ files: [file] });

    const addMediaCmd = new AddMediaAssetCommand(project.metadata.id, processed);
    const element = buildElementFromMedia({
      mediaId: addMediaCmd.getAssetId(),
      mediaType: processed.type,
      name: processed.name,
      duration: DEFAULT_NEW_ELEMENT_DURATION,
      startTime: ZERO_MEDIA_TIME,
    });
    editor.command.execute({ command: new BatchCommand([
      addMediaCmd,
      new InsertElementCommand({ element, placement: { mode: "auto", trackType: "video" } }),
    ]) });

    const text = buildTextElement({
      raw: { content: "Hello WASM", duration: mediaTimeFromSeconds({ seconds: 3 }) },
      startTime: ZERO_MEDIA_TIME,
    });
    editor.command.execute({ command: new InsertElementCommand({
      element: text, placement: { mode: "auto", trackType: "text" },
    }) });

    const countElements = () => {
      const s = editor.scenes.getActiveScene();
      return s.tracks.main.elements.length + s.tracks.overlay.reduce((a, t) => a + t.elements.length, 0);
    };
    out.afterInsert = countElements();

    editor.command.undo();
    out.afterUndo = countElements();
    editor.command.redo();
    out.afterRedo = countElements();

    // split the text element at 1.5s
    const scene = editor.scenes.getActiveScene();
    const overlayTrack = scene.tracks.overlay.find((t) => t.elements.length > 0);
    const textEl = overlayTrack.elements[0];
    editor.command.execute({ command: new SplitElementsCommand({
      elements: [{ trackId: overlayTrack.id, elementId: textEl.id }],
      splitTime: mediaTimeFromSeconds({ seconds: 1.5 }),
    }) });
    out.afterSplit = countElements();

    // playback
    editor.playback.play();
    await new Promise((r) => setTimeout(r, 700));
    editor.playback.pause();
    out.playheadAfterPlay = editor.playback.getCurrentTime();
    out.isDegradedRenderer = editor.renderer.isDegraded;

    out.isDirty = editor.save.getIsDirty();

    return JSON.stringify(out);
  } catch (e) {
    return "ERR: " + (e && e.stack ? e.stack.slice(0, 800) : String(e));
  }
})()`);
console.log("RESULT:", JSON.stringify(result));

// Let the preview RAF render the inserted content, then probe canvas pixels.
await sleep(4000);
const pixels = await evalAsync(`(async () => {
  const readings = [];
  for (const c of Array.from(document.querySelectorAll("canvas"))) {
    try {
      const probe = document.createElement("canvas");
      probe.width = 64; probe.height = 64;
      const ctx = probe.getContext("2d");
      ctx.drawImage(c, 0, 0, 64, 64);
      const data = ctx.getImageData(0, 0, 64, 64).data;
      let nonZero = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] || data[i + 1] || data[i + 2]) nonZero++;
      }
      readings.push({ w: c.width, h: c.height, nonZeroPx: nonZero });
    } catch (e) {
      readings.push({ error: String(e).slice(0, 100) });
    }
  }
  return JSON.stringify(readings);
})()`);
console.log("PIXELS:", JSON.stringify(pixels));

const shot = await send("Page.captureScreenshot", { format: "png" });
if (shot?.data) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync("scripts/editor-e2e-screenshot.png", Buffer.from(shot.data, "base64"));
  console.log("SCREENSHOT: scripts/editor-e2e-screenshot.png");
}

console.log("=== CONSOLE (errors) ===");
for (const line of logs.filter((l) => /error|exception/i.test(l)).slice(0, 20)) {
  console.log(line.slice(0, 300));
}

ws.close();
chrome.kill();
process.exit(0);
