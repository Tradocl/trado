// Graba presentacion.html (una vuelta completa) a EtMday/video/trado-stand-1920x1080.mp4.
// Uso: node EtMday/video/presentacion/grabar.mjs   (requiere Chrome y ffmpeg; ruta de ffmpeg abajo)
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const SALIDA = join(aqui, "..", "trado-stand-1920x1080.mp4");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const FFMPEG = process.env.FFMPEG || "C:/Users/josep/AppData/Local/Microsoft/WinGet/Packages/yt-dlp.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-N-126374-g089a48eb36-win64-gpl/bin/ffmpeg.exe";
const puerto = 9150 + Math.floor(Math.random() * 40);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${puerto}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "cdp-"))}`, "--allow-file-access-from-files", "about:blank"], { stdio: "ignore" });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
await espera(2500);
const tabs = await (await fetch(`http://127.0.0.1:${puerto}/json`)).json();
const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); const cuadros = []; let grabando = false;
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.method === "Page.screencastFrame") {
    if (grabando) cuadros.push({ t: d.params.metadata.timestamp, data: d.params.data });
    cdp("Page.screencastFrameAck", { sessionId: d.params.sessionId });
  }
  if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); }
};
await cdp("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
await cdp("Page.enable"); await cdp("Runtime.enable");
await cdp("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
await cdp("Page.navigate", { url: pathToFileURL(join(aqui, "presentacion.html")).href });
await espera(2000);
const total = (await cdp("Runtime.evaluate", { expression: "window.DURACION_MS", returnByValue: true })).result.result.value;
grabando = true;
await espera(total + 200);
grabando = false;
await cdp("Page.stopScreencast");
ws.close(); chrome.kill();

const dir = mkdtempSync(join(tmpdir(), "cuadros-"));
let lista = "";
cuadros.forEach((c, k) => {
  const f = join(dir, `f${String(k).padStart(5, "0")}.jpg`);
  writeFileSync(f, Buffer.from(c.data, "base64"));
  const dur = k < cuadros.length - 1 ? Math.max(0.01, cuadros[k + 1].t - c.t) : 0.1;
  lista += `file '${f.replace(/\\/g, "/")}'\nduration ${dur.toFixed(3)}\n`;
});
writeFileSync(join(dir, "lista.txt"), lista);
const r = spawnSync(FFMPEG, ["-y", "-f", "concat", "-safe", "0", "-i", join(dir, "lista.txt"), "-vf", "scale=1920:1080,fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-movflags", "+faststart", SALIDA], { encoding: "utf8" });
console.log(cuadros.length, "cuadros,", (total / 1000).toFixed(1), "s ->", SALIDA, r.status === 0 ? "ok" : r.stderr.slice(-300));
