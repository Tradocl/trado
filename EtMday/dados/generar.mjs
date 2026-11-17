// Genera los PDF de las caras del dado (5, 7 y 10 cm; círculos de 15 cm en A4 y A3) y del dado de papel armable (6 cm),
// más vistas previas PNG. Uso: node EtMday/dados/generar.mjs   (requiere Chrome)
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const puerto = 9700 + Math.floor(Math.random() * 60);
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

for (const [query, nombre, w, h] of [
  ["lado=50", "dado-caras-5cm", 210, 297],
  ["lado=70", "dado-caras-7cm", 210, 297],
  ["lado=100", "dado-caras-10cm", 210, 297],
  ["armable=60", "dado-armable-6cm", 297, 210],
  ["circulo=150", "dado-circulos-15cm-A4", 210, 297],
  ["circulo=150&hoja=A3", "dado-circulos-15cm-A3", 297, 420],
]) {
  await cdp("Emulation.setDeviceMetricsOverride", { width: px(w), height: px(h), deviceScaleFactor: 1.5, mobile: false });
  await cdp("Page.navigate", { url: pathToFileURL(join(AQUI, "dados.html")).href + "?" + query });
  await espera(3500);
  const png = await cdp("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(AQUI, `${nombre}-vista-previa.png`), Buffer.from(png.result.data, "base64"));
  const pdf = await cdp("Page.printToPDF", { paperWidth: w / 25.4, paperHeight: h / 25.4, printBackground: true, preferCSSPageSize: false, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 });
  writeFileSync(join(AQUI, `${nombre}.pdf`), Buffer.from(pdf.result.data, "base64"));
  console.log("listo:", nombre);
}
ws.close(); chrome.kill();
