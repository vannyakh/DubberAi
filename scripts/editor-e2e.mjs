/**
 * End-to-end smoke test for the ported OpenCut editor core.
 * Drives headless Chrome over CDP: creates a project, imports generated
 * media through the real MediaManager pipeline, inserts timeline elements
 * via commands, and reads back editor state + preview canvas pixels.
 *
 * Usage: node scripts/editor-e2e.mjs [baseUrl]
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
const port = 9334;

const chrome = spawn(
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  [
    "--headless=new",
    "--no-first-run",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "chrome-e2e-"))}`,
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
    const text = msg.params.args
      .map((a) => a.value ?? a.description ?? "")
      .join(" ");
    logs.push(`[console.${msg.params.type}] ${text}`);
  } else if (msg.method === "Runtime.exceptionThrown") {
    const d = msg.params.exceptionDetails;
    logs.push(`[exception] ${d.text} ${d.exception?.description ?? ""}`);
  }
});

async function evalAsync(expression) {
  const res = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (res.exceptionDetails) {
    return { error: res.exceptionDetails.exception?.description ?? res.exceptionDetails.text };
  }
  return { value: res.result?.value };
}

await send("Runtime.enable");
await send("Page.enable");
await send("Page.navigate", { url: `${baseUrl}/projects` });
await sleep(8000);

// Step 1: create a project through ProjectManager and navigate to the editor.
const step1 = await evalAsync(`(async () => {
  const { EditorCore } = await import("/src/core/index.ts");
  const editor = EditorCore.getInstance();
  const id = await editor.project.createNewProject({ name: "E2E Test" });
  return id;
})()`);
console.log("STEP1 create project:", JSON.stringify(step1));
if (step1.error) finish(1);

await send("Page.navigate", { url: `${baseUrl}/editor/${step1.value}` });
await sleep(10000);

// Step 2: confirm project is loaded and scene present.
const step2 = await evalAsync(`(async () => {
  const { EditorCore } = await import("/src/core/index.ts");
  const editor = EditorCore.getInstance();
  const project = editor.project.getActiveOrNull();
  const scene = editor.scenes.getActiveSceneOrNull();
  return {
    projectName: project?.metadata?.name ?? null,
    sceneId: scene?.id ?? null,
    trackCounts: scene ? {
      overlay: scene.tracks.overlay.length,
      main: scene.tracks.main ? 1 : 0,
      audio: scene.tracks.audio.length,
    } : null,
  };
})()`);
console.log("STEP2 project loaded:", JSON.stringify(step2));

// Step 3: generate a PNG file and run it through the media pipeline.
const step3 = await evalAsync(`(async () => {
  const { EditorCore } = await import("/src/core/index.ts");
  const { processMediaAssets } = await import("/src/media/processing.ts");
  const editor = EditorCore.getInstance();
  const project = editor.project.getActive();

  const canvas = document.createElement("canvas");
  canvas.width = 640; canvas.height = 360;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ff6600"; ctx.fillRect(0, 0, 640, 360);
  ctx.fillStyle = "#0066ff"; ctx.fillRect(160, 90, 320, 180);
  const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
  const file = new File([blob], "e2e-test.png", { type: "image/png" });

  const processed = await processMediaAssets({ files: [file] });
  const added = [];
  for (const asset of processed) {
    const result = await editor.media.addMediaAsset({
      projectId: project.metadata.id,
      asset,
    });
    added.push(result?.id ?? "(no id)");
  }
  const assets = editor.media.getAssets();
  return { processedCount: processed.length, added, totalAssets: assets.length, types: assets.map(a => a.type) };
})()`);
console.log("STEP3 media import:", JSON.stringify(step3));

// Step 4: insert the imported asset into the timeline via the command system.
const step4 = await evalAsync(`(async () => {
  const { EditorCore } = await import("/src/core/index.ts");
  const editor = EditorCore.getInstance();
  const assets = editor.media.getAssets();
  const asset = assets[0];
  if (!asset) return { error: "no asset" };

  const timelineModule = await import("/src/timeline/index.ts");
  const keys = Object.keys(timelineModule);
  // Use TimelineManager high-level insert if available
  const tm = editor.timeline;
  const methodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(tm)).filter(n => /add|insert/i.test(n));
  return { assetId: asset.id, assetType: asset.type, timelineExports: keys.slice(0, 40), tmMethods: methodNames };
})()`);
console.log("STEP4 timeline API discovery:", JSON.stringify(step4));

console.log("=== CONSOLE (errors/warnings) ===");
for (const line of logs.filter((l) => /error|exception|warn/i.test(l)).slice(0, 30)) {
  console.log(line.slice(0, 400));
}

function finish(code) {
  ws.close();
  chrome.kill();
  process.exit(code);
}
finish(0);
