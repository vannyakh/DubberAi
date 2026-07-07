/**
 * E2E export test: build a small scene, run the mediabunny/WebCodecs
 * SceneExporter, and verify a non-empty MP4/WebM buffer comes back.
 *
 * Usage: node scripts/editor-e2e-export.mjs [baseUrl]
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
const port = 9337;

const chrome = spawn(
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  [
    "--headless=new",
    "--no-first-run",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "chrome-export-"))}`,
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

await send("Runtime.enable");
await send("Page.enable");
await send("Page.navigate", { url: `${baseUrl}/projects` });
await sleep(8000);

const created = await evalAsync(`(async () => {
  const { EditorCore } = await import("/src/core/index.ts");
  return await EditorCore.getInstance().project.createNewProject({ name: "E2E Export" });
})()`);
console.log("CREATE:", JSON.stringify(created));

await send("Page.navigate", { url: `${baseUrl}/editor/${created.value}` });
await sleep(10000);

const result = await evalAsync(`(async () => {
  try {
    const { EditorCore } = await import("/src/core/index.ts");
    const { buildTextElement } = await import("/src/timeline/element-utils.ts");
    const { InsertElementCommand } = await import("/src/commands/timeline/index.ts");
    const { mediaTimeFromSeconds, ZERO_MEDIA_TIME } = await import("/src/wasm/index.ts");
    const editor = EditorCore.getInstance();

    const text = buildTextElement({
      raw: { content: "Export Test", duration: mediaTimeFromSeconds({ seconds: 1 }) },
      startTime: ZERO_MEDIA_TIME,
    });
    editor.command.execute({ command: new InsertElementCommand({
      element: text, placement: { mode: "auto", trackType: "text" },
    }) });

    const supported = {
      videoEncoder: typeof VideoEncoder !== "undefined",
      audioEncoder: typeof AudioEncoder !== "undefined",
    };

    const res = await editor.project.export({
      options: { format: "mp4", quality: "medium", includeAudio: false },
    });
    return JSON.stringify({
      supported,
      success: res?.success,
      bufferBytes: res?.buffer ? res.buffer.byteLength : 0,
      error: res?.error ?? null,
    });
  } catch (e) {
    return "ERR: " + (e && e.stack ? e.stack.slice(0, 800) : String(e));
  }
})()`);
console.log("EXPORT:", JSON.stringify(result));

console.log("=== CONSOLE (errors) ===");
for (const line of logs.filter((l) => /error|exception/i.test(l)).slice(0, 20)) {
  console.log(line.slice(0, 300));
}

ws.close();
chrome.kill();
process.exit(0);
