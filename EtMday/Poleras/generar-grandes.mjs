// Arma una vista grande por polera (frente y espaldas A a F) en grande/*.png, a partir de
// los PNG que deja generar.mjs. Uso: node EtMday/Poleras/generar-grandes.mjs
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
mkdirSync(join(aqui, "grande"), { recursive: true });
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const puerto = 9650 + Math.floor(Math.random() * 40);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${puerto}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "cdp-"))}`, "--allow-file-access-from-files", "about:blank"], { stdio: "ignore" });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
await espera(2500);
const tabs = await (await fetch(`http://127.0.0.1:${puerto}/json`)).json();
const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await cdp("Page.enable");
await cdp("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1700, deviceScaleFactor: 1.5, mobile: false });
const solo = process.argv.slice(2);
for (const pieza of (solo.length ? solo : ["frente", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "aa", "ab", "ac", "ad", "ae", "af", "ag", "ah", "ai", "aj"])) {
  await cdp("Page.navigate", { url: pathToFileURL(join(aqui, "vista-grande.html")).href + "?pieza=" + pieza });
  await espera(3000);
  const png = await cdp("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(aqui, "grande", `polera-${pieza === "frente" ? "frente" : "espalda-" + pieza}.png`), Buffer.from(png.result.data, "base64"));
  console.log("listo:", pieza);
}
ws.close(); chrome.kill();
