// Arma los archivos de las poleras con Chrome:
// - espalda-a a espalda-e y frente-logo, en dos formatos, ambos a tamaño real y con fondo transparente:
//   .pdf vectorial (texto y logo nítidos a cualquier tamaño; es el que conviene llevar a estampar)
//   y .png a 600 dpi (por si el local pide imagen).
// - boceto.png: vista de cómo quedan sobre la polera.
// Uso: node EtMday/Poleras/generar.mjs
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const cm = (v) => Math.round((v / 2.54) * 96); // px CSS
const DPI = 600 / 96;
const piezas = [
  { html: "espalda-a.html", w: cm(28), h: cm(36), escala: DPI, transparente: true, pdf: [28, 36] },
  { html: "espalda-b.html", w: cm(28), h: cm(36), escala: DPI, transparente: true, pdf: [28, 36] },
  { html: "espalda-c.html", w: cm(28), h: cm(36), escala: DPI, transparente: true, pdf: [28, 36] },
  { html: "espalda-d.html", w: cm(28), h: cm(36), escala: DPI, transparente: true, pdf: [28, 36] },
  { html: "espalda-e.html", w: cm(28), h: cm(36), escala: DPI, transparente: true, pdf: [28, 36] },
  { html: "frente-logo.html", w: cm(9), h: cm(3.16), escala: DPI, transparente: true, pdf: [9, 3.16] },
  { html: "boceto.html", w: 2300, h: 1460, escala: 1, transparente: false },
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
  if (p.pdf) {
    const [ancho, alto] = p.pdf.map((v) => v / 2.54); // pulgadas
    const pdf = await cdp("Page.printToPDF", { paperWidth: ancho, paperHeight: alto, printBackground: true, preferCSSPageSize: false,
      marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, pageRanges: "1" });
    writeFileSync(join(aqui, p.html.replace(/\.html$/, ".pdf")), Buffer.from(pdf.result.data, "base64"));
  }
  console.log("listo:", p.html);
}
ws.close(); chrome.kill();
