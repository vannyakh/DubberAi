/**
 * Record a 3s test video (canvas + spoken-ish beeps) in headless Chrome
 * and save it as scripts/test-video.webm for AI transcription testing.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(
  join(process.cwd(), "node_modules", ".pnpm", "ws@8.21.0", "node_modules", "ws", "package.json"),
);
const WebSocket = require("ws");
const port = 9345;

const chrome = spawn(
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  [
    "--headless=new",
    "--no-first-run",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "chrome-vid-"))}`,
    "--autoplay-policy=no-user-gesture-required",
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
ws.on("message", (raw) => {
  const msg = JSON.parse(raw.toString());
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result ?? msg.error);
    pending.delete(msg.id);
  }
});

await send("Runtime.enable");
const res = await send("Runtime.evaluate", {
  expression: `(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 320; canvas.height = 240;
    const ctx2d = canvas.getContext("2d");
    let t = 0;
    const draw = () => {
      ctx2d.fillStyle = "#123456"; ctx2d.fillRect(0, 0, 320, 240);
      ctx2d.fillStyle = "#fff"; ctx2d.font = "30px sans-serif";
      ctx2d.fillText("test " + (t++), 40, 120);
    };
    draw();
    const drawInt = setInterval(draw, 100);

    const audioCtx = new AudioContext();
    const dest = audioCtx.createMediaStreamDestination();
    const osc = audioCtx.createOscillator();
    osc.frequency.value = 300;
    const gain = audioCtx.createGain();
    gain.gain.value = 0.4;
    osc.connect(gain).connect(dest);
    osc.start();

    const stream = new MediaStream([
      ...canvas.captureStream(10).getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);
    const rec = new MediaRecorder(stream, { mimeType: "video/webm" });
    const chunks = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    const done = new Promise((r) => (rec.onstop = r));
    rec.start();
    await new Promise((r) => setTimeout(r, 3000));
    rec.stop();
    await done;
    clearInterval(drawInt);
    const blob = new Blob(chunks, { type: "video/webm" });
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  })()`,
  awaitPromise: true,
  returnByValue: true,
});

if (res.exceptionDetails) {
  console.error("ERR:", res.exceptionDetails.exception?.description ?? res.exceptionDetails.text);
} else {
  const b64 = res.result.value;
  writeFileSync("scripts/test-video.webm", Buffer.from(b64, "base64"));
  console.log("WROTE scripts/test-video.webm bytes:", Buffer.from(b64, "base64").length);
}

ws.close();
chrome.kill();
process.exit(0);
