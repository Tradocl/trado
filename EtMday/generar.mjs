// Pasa una pieza HTML del EtMday a PDF (imprenta) y PNG (vista previa).
// Uso: node EtMday/generar.mjs <archivo.html> <ancho_mm|ancho_px> <alto_mm|alto_px> [png-solo]
// Ej.: node EtMday/generar.mjs EtMday/display/display-mesa.html 297mm 420mm
//      node EtMday/generar.mjs EtMday/post/post-etm.html 1080px 1350px png
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [archivo, ancho, alto, modo] = process.argv.slice(2);
const aPx = (v) => (v.endsWith("mm") ? Math.round((parseFloat(v) / 25.4) * 96) : parseInt(v));
const W = aPx(ancho), H = aPx(alto);
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
await cdp("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: modo === "png" ? 1 : 2, mobile: false });
await cdp("Page.enable");
await cdp("Page.navigate", { url: pathToFileURL(resolve(archivo)).href });
await espera(4000);
const base = archivo.replace(/\.html$/, "");
// Primera página o la pieza completa en PNG: siempre el tamaño de la hoja
const png = await cdp("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
writeFileSync(`${base}${modo === "png" ? "" : "-vista-previa"}.png`, Buffer.from(png.result.data, "base64"));
if (modo !== "png") {
  const pdf = await cdp("Page.printToPDF", { printBackground: true, preferCSSPageSize: true, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 });
  writeFileSync(`${base}.pdf`, Buffer.from(pdf.result.data, "base64"));
}
console.log("listo:", base);
ws.close(); chrome.kill();
