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
const port = 9341;

const chrome = spawn(
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  [
    "--headless=new",
    "--no-first-run",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "chrome-dubdbg-"))}`,
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
ws.on("message", (raw) => {
  const msg = JSON.parse(raw.toString());
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result ?? msg.error);
    pending.delete(msg.id);
  }
});

async function evalAsync(expression) {
  const res = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (res.exceptionDetails) {
    return { error: (res.exceptionDetails.exception?.description ?? res.exceptionDetails.text).slice(0, 600) };
  }
  return { value: res.result?.value };
}

await send("Runtime.enable");
await send("Page.enable");
await send("Page.navigate", { url: `${baseUrl}/projects` });
await sleep(8000);

const created = await evalAsync(`(async () => {
  const { EditorCore } = await import("/src/core/index.ts");
  return await EditorCore.getInstance().project.createNewProject({ name: "Dub Debug" });
})()`);
console.log("CREATE:", JSON.stringify(created));

await send("Page.navigate", { url: `${baseUrl}/editor/${created.value}` });
await sleep(10000);

const result = await evalAsync(`(async () => {
  try {
    const { EditorCore } = await import("/src/core/index.ts");
    const { processMediaAssets } = await import("/src/media/processing.ts");
    const { pcmBase64ToWavFile } = await import("/src/dubbing/apply-to-timeline.ts");
    const editor = EditorCore.getInstance();
    const out = {};

    const sampleRate = 24000;
    const pcm = new Int16Array(sampleRate);
    for (let i = 0; i < pcm.length; i++) pcm[i] = Math.round(Math.sin((2*Math.PI*440*i)/sampleRate)*12000);
    const bytes = new Uint8Array(pcm.buffer);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const b64 = btoa(bin);

    const wav = pcmBase64ToWavFile({ base64: b64, name: "dbg.wav" });
    const processed = await processMediaAssets({ files: [wav] });
    out.processedCount = processed.length;
    out.processedNames = processed.map((p) => p.name);
    out.assetsBefore = editor.media.getAssets().length;

    const { AddMediaAssetCommand } = await import("/src/commands/media/index.ts");
    const cmd = new AddMediaAssetCommand(editor.project.getActive().metadata.id, processed[0]);
    editor.command.execute({ command: cmd });
    out.assetsAfterAdd = editor.media.getAssets().length;

    // tab store identity check
    const { useAssetsPanelStore } = await import("/src/components/editor/panels/assets/assets-panel-store.tsx");
    useAssetsPanelStore.getState().setActiveTab("dubbing");
    await new Promise((r) => setTimeout(r, 1200));
    out.activeTab = useAssetsPanelStore.getState().activeTab;
    out.dubButtonVisible = Array.from(document.querySelectorAll("button")).some((b) => b.textContent.includes("Dub video"));
    out.tabButtons = Array.from(document.querySelectorAll('[role="tab"], button')).map((b) => b.getAttribute("aria-label") || "").filter((t) => /dub/i.test(t));

    return JSON.stringify(out);
  } catch (e) {
    return "ERR: " + (e && e.stack ? e.stack.slice(0, 900) : String(e));
  }
})()`);
console.log("DEBUG:", JSON.stringify(result));

ws.close();
chrome.kill();
process.exit(0);
