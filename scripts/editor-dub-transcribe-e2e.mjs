/**
 * Real transcription E2E: import scripts/test-video.webm into the editor,
 * run the dubbing transcription step (extract audio -> API -> Gemini),
 * and print the resulting transcript.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(
  join(process.cwd(), "node_modules", ".pnpm", "ws@8.21.0", "node_modules", "ws", "package.json"),
);
const WebSocket = require("ws");

const baseUrl = process.argv[2] ?? "http://127.0.0.1:3001";
const port = 9347;

const chrome = spawn(
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  [
    "--headless=new",
    "--no-first-run",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "chrome-dubt-"))}`,
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
await new Promise((res, rej) => { ws.once("open", res); ws.once("error", rej); });

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
    logs.push(`[${msg.params.type}] ${text}`);
  } else if (msg.method === "Runtime.exceptionThrown") {
    const d = msg.params.exceptionDetails;
    logs.push(`[exception] ${d.text} ${d.exception?.description ?? ""}`);
  }
});

async function evalAsync(expression, attempt = 0) {
  const res = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (res.exceptionDetails) {
    return { error: (res.exceptionDetails.exception?.description ?? res.exceptionDetails.text).slice(0, 800) };
  }
  if (res.code === -32000 && attempt < 4) {
    await sleep(8000);
    return evalAsync(expression, attempt + 1);
  }
  return { value: res.result?.value };
}

const videoB64 = readFileSync("scripts/test-video.webm").toString("base64");

await send("Runtime.enable");
await send("Page.enable");
await send("Page.navigate", { url: `${baseUrl}/projects` });
await sleep(8000);

console.log("WARMUP:", JSON.stringify(await evalAsync(`(async () => {
  await import("/src/core/index.ts");
  await import("/src/dubbing/run-dub.ts");
  await import("/src/media/processing.ts");
  return "warm";
})()`)));

const created = await evalAsync(`(async () => {
  const { EditorCore } = await import("/src/core/index.ts");
  return await EditorCore.getInstance().project.createNewProject({ name: "Dub Transcribe E2E" });
})()`);
console.log("CREATE:", JSON.stringify(created));

await send("Page.navigate", { url: `${baseUrl}/editor/${created.value}` });
await sleep(10000);

const result = await evalAsync(`(async () => {
  try {
    const { EditorCore } = await import("/src/core/index.ts");
    const { processMediaAssets } = await import("/src/media/processing.ts");
    const { AddMediaAssetCommand } = await import("/src/commands/media/index.ts");
    const { runTranscription } = await import("/src/dubbing/run-dub.ts");
    const { useDubbingStore } = await import("/src/dubbing/dubbing-store.ts");
    const editor = EditorCore.getInstance();

    const bin = atob("${videoB64}");
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const file = new File([bytes], "test-video.webm", { type: "video/webm" });
    const [processed] = await processMediaAssets({ files: [file] });
    const cmd = new AddMediaAssetCommand(editor.project.getActive().metadata.id, processed);
    editor.command.execute({ command: cmd });
    const asset = editor.media.getAssets()[0];

    await runTranscription({ asset });
    const s = useDubbingStore.getState();
    return JSON.stringify({
      status: s.status,
      error: s.error,
      detectedLanguage: s.detectedLanguage,
      segments: s.transcriptSegments.length,
      transcriptPreview: s.transcript.slice(0, 200),
    });
  } catch (e) {
    return "ERR: " + (e && e.stack ? e.stack.slice(0, 900) : String(e));
  }
})()`);
console.log("RESULT:", JSON.stringify(result));

console.log("=== CONSOLE (warn/error) ===");
for (const line of logs.filter((l) => /warn|error|exception/i.test(l)).slice(0, 10)) {
  console.log(line.slice(0, 300));
}

ws.close();
chrome.kill();
process.exit(0);
