/**
 * Headless smoke test for the ported OpenCut editor.
 * Launches Chrome with remote debugging, navigates to the given URL,
 * captures console messages / page errors, and dumps a DOM snapshot.
 *
 * Usage: node scripts/editor-smoke.mjs <url> [waitMs]
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

const url = process.argv[2] ?? "http://127.0.0.1:3001/projects";
const waitMs = Number(process.argv[3] ?? 20000);
const port = 9333;

const chrome = spawn(
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  [
    "--headless=new",
    "--no-first-run",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "chrome-smoke-"))}`,
    "--window-size=1720,980",
    "--enable-unsafe-webgpu",
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
      .map((a) => a.value ?? a.description ?? JSON.stringify(a.preview?.properties ?? a))
      .join(" ");
    logs.push(`[console.${msg.params.type}] ${text}`);
  } else if (msg.method === "Runtime.exceptionThrown") {
    const d = msg.params.exceptionDetails;
    logs.push(
      `[exception] ${d.text} ${d.exception?.description ?? ""} at ${d.url ?? ""}:${d.lineNumber ?? ""}`,
    );
  } else if (msg.method === "Log.entryAdded") {
    logs.push(`[log.${msg.params.entry.level}] ${msg.params.entry.text}`);
  }
});

await send("Runtime.enable");
await send("Log.enable");
await send("Page.enable");
await send("Page.navigate", { url });
await sleep(waitMs);

const domResult = await send("Runtime.evaluate", {
  expression: "document.body ? document.body.innerText.slice(0, 2000) : '(no body)'",
  returnByValue: true,
});
const urlResult = await send("Runtime.evaluate", {
  expression: "location.href",
  returnByValue: true,
});
const canvasResult = await send("Runtime.evaluate", {
  expression: "document.querySelectorAll('canvas').length",
  returnByValue: true,
});

console.log("=== FINAL URL ===");
console.log(urlResult.result?.value);
console.log("=== CANVAS COUNT ===");
console.log(canvasResult.result?.value);
console.log("=== CONSOLE / ERRORS ===");
for (const line of logs) console.log(line.slice(0, 500));
console.log("=== BODY TEXT (first 2000 chars) ===");
console.log(domResult.result?.value);

ws.close();
chrome.kill();
process.exit(0);
