// Arma los archivos de las poleras con Chrome:
// - espalda-a.png, espalda-b.png y frente-logo.png: fondo transparente, 300 dpi, tamaño real
//   (estos son los que se llevan a estampar).
// - boceto.png: vista de cómo quedan sobre la polera.
// Uso: node EtMday/Poleras/generar.mjs
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const cm = (v) => Math.round((v / 2.54) * 96); // px CSS
const DPI = 300 / 96;
const piezas = [
  { html: "espalda-a.html", w: cm(28), h: cm(36), escala: DPI, transparente: true },
  { html: "espalda-b.html", w: cm(28), h: cm(36), escala: DPI, transparente: true },
  { html: "frente-logo.html", w: cm(9), h: cm(3.16), escala: DPI, transparente: true },
  { html: "boceto.html", w: 1800, h: 800, escala: 1, transparente: false },
];

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const puerto = 9850 + Math.floor(Math.random() * 60);
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

for (const p of piezas) {
  await cdp("Emulation.setDeviceMetricsOverride", { width: p.w, height: p.h, deviceScaleFactor: p.escala, mobile: false });
  await cdp("Emulation.setDefaultBackgroundColorOverride", p.transparente ? { color: { r: 0, g: 0, b: 0, a: 0 } } : {});
  await cdp("Page.navigate", { url: pathToFileURL(join(aqui, p.html)).href });
  await espera(3500);
  const png = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, clip: { x: 0, y: 0, width: p.w, height: p.h, scale: 1 } });
  writeFileSync(join(aqui, p.html.replace(/\.html$/, ".png")), Buffer.from(png.result.data, "base64"));
  console.log("listo:", p.html);
}
ws.close(); chrome.kill();
