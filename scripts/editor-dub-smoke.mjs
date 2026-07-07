/**
 * Smoke test for the Dubbing panel: boot editor, switch to the dubbing tab,
 * check the view renders and pcm->wav + text-segment apply works end-to-end
 * (without calling the Gemini API).
 *
 * Usage: node scripts/editor-dub-smoke.mjs [baseUrl]
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
const port = 9339;

const chrome = spawn(
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  [
    "--headless=new",
    "--no-first-run",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "chrome-dub-"))}`,
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

const warm = await evalAsync(`(async () => {
  await import("/src/core/index.ts");
  await import("/src/dubbing/apply-to-timeline.ts");
  await import("/src/dubbing/dubbing-store.ts");
  return "warm";
})()`);
console.log("WARMUP:", JSON.stringify(warm));

const created = await evalAsync(`(async () => {
  const { EditorCore } = await import("/src/core/index.ts");
  return await EditorCore.getInstance().project.createNewProject({ name: "Dub Smoke" });
})()`);
console.log("CREATE:", JSON.stringify(created));

await send("Page.navigate", { url: `${baseUrl}/editor/${created.value}` });
await sleep(10000);

const result = await evalAsync(`(async () => {
  try {
    const { EditorCore } = await import("/src/core/index.ts");
    const { pcmBase64ToWavFile, applySegmentsAsTextElements, applyTtsAudioToTimeline } =
      await import("/src/dubbing/apply-to-timeline.ts");
    const { useAssetsPanelStore } = await import("/src/components/editor/panels/assets/assets-panel-store.tsx");
    const editor = EditorCore.getInstance();
    const out = {};

    // Switch to the dubbing tab via its real DOM button and confirm the view mounts.
    const tabButton = Array.from(document.querySelectorAll("button")).find(
      (b) => (b.getAttribute("aria-label") || "") === "Dubbing",
    );
    out.tabFound = Boolean(tabButton);
    tabButton?.click();
    await new Promise((r) => setTimeout(r, 1500));
    out.dubButtonVisible = Array.from(document.querySelectorAll("button"))
      .some((b) => b.textContent.includes("Dub video"));

    // 1s of synthetic 440Hz PCM as fake TTS output.
    const sampleRate = 24000;
    const pcm = new Int16Array(sampleRate);
    for (let i = 0; i < pcm.length; i++) {
      pcm[i] = Math.round(Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 12000);
    }
    const bytes = new Uint8Array(pcm.buffer);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const b64 = btoa(bin);

    const wav = pcmBase64ToWavFile({ base64: b64, name: "dub-test.wav" });
    out.wavSize = wav.size;
    out.wavType = wav.type;

    await applyTtsAudioToTimeline({
      editor,
      audioBase64: b64,
      name: "dub-test.wav",
      startTimeSeconds: 1,
    });

    applySegmentsAsTextElements({
      editor,
      segments: [
        { time: 0, speaker: "Speaker 1", text: "Hello there", raw: "" },
        { time: 3, speaker: "Speaker 2", text: "General Kenobi", raw: "" },
      ],
    });

    const scene = editor.scenes.getActiveScene();
    out.audioElements = scene.tracks.audio.reduce((a, t) => a + t.elements.length, 0);
    out.textElements = scene.tracks.overlay.reduce((a, t) => a + t.elements.length, 0);
    out.mediaAssets = editor.media.getAssets().length;

    // Undo should remove the text batch in one step.
    editor.command.undo();
    const after = editor.scenes.getActiveScene();
    out.textAfterUndo = after.tracks.overlay.reduce((a, t) => a + t.elements.length, 0);

    return JSON.stringify(out);
  } catch (e) {
    return "ERR: " + (e && e.stack ? e.stack.slice(0, 900) : String(e));
  }
})()`);
console.log("RESULT:", JSON.stringify(result));

const shot = await send("Page.captureScreenshot", { format: "png" });
if (shot?.data) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync("scripts/editor-dub-screenshot.png", Buffer.from(shot.data, "base64"));
  console.log("SCREENSHOT: scripts/editor-dub-screenshot.png");
}

console.log("=== CONSOLE (errors) ===");
for (const line of logs.filter((l) => /error|exception/i.test(l)).slice(0, 15)) {
  console.log(line.slice(0, 300));
}

ws.close();
chrome.kill();
process.exit(0);
