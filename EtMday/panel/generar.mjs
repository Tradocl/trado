// Genera los PDF para imprimir y las vistas previas PNG del panel NFC y de las caras de tarjeta.
// Uso: node EtMday/panel/generar.mjs   (requiere Chrome; para panel-2xA4.pdf, Python con pypdf)
//  - panel-A3.pdf        panel completo, A3 vertical (imprenta)
//  - panel-2xA4.pdf      el mismo panel en 2 hojas A4 horizontales para unir (corte entre filas)
//  - tarjetas-A4.pdf     las 9 caras a tamaño tarjeta de crédito, para recortar y pegar
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const puerto = 9800 + Math.floor(Math.random() * 60);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${puerto}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "cdp-"))}`, "--allow-file-access-from-files", "about:blank"], { stdio: "ignore" });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
await espera(2500);
const tabs = await (await fetch(`http://127.0.0.1:${puerto}/json`)).json();
const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const px = (mm) => Math.round((mm / 25.4) * 96);
await cdp("Page.enable");

for (const [html, pdf, png, anchoMm, altoMm] of [
  ["panel.html", "panel-A3.pdf", "panel-vista-previa.png", 297, 420],
  ["tarjetas.html", "tarjetas-A4.pdf", "tarjetas-vista-previa.png", 297, 210],
]) {
  await cdp("Emulation.setDeviceMetricsOverride", { width: px(anchoMm), height: px(altoMm), deviceScaleFactor: 1.5, mobile: false });
  await cdp("Page.navigate", { url: pathToFileURL(join(AQUI, html)).href });
  await espera(4000);
  const p = await cdp("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(AQUI, png), Buffer.from(p.result.data, "base64"));
  const d = await cdp("Page.printToPDF", { printBackground: true, preferCSSPageSize: true, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 });
  writeFileSync(join(AQUI, pdf), Buffer.from(d.result.data, "base64"));
}
ws.close(); chrome.kill();

// A3 vertical = 2 × A4 horizontal: mitad de arriba y mitad de abajo (vectorial, sin re-render)
const py = `
import sys
from pypdf import PdfReader, PdfWriter
from pypdf.generic import RectangleObject
r = PdfReader(sys.argv[1]); w = PdfWriter()
pag = r.pages[0]; W = float(pag.mediabox.width); H = float(pag.mediabox.height)
for y0, y1 in ((H / 2, H), (0, H / 2)):
    p = w.add_page(pag)
    p.mediabox = RectangleObject([0, y0, W, y1]); p.cropbox = RectangleObject([0, y0, W, y1])
w.write(sys.argv[2])
`;
const r = spawnSync("python", ["-c", py, join(AQUI, "panel-A3.pdf"), join(AQUI, "panel-2xA4.pdf")], { encoding: "utf8" });
console.log(r.status === 0 ? "listo: panel-A3.pdf, panel-2xA4.pdf, tarjetas-A4.pdf y vistas previas" : r.stderr);
