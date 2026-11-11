// Genera el PDF para imprenta y una vista previa PNG del panel NFC.
// Uso: node EtMday/panel/generar.mjs   (requiere Chrome instalado)
import { spawn } from "node:child_process";
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

// A3 a 96 dpi: 1123 × 1587 px
await cdp("Emulation.setDeviceMetricsOverride", { width: 1123, height: 1587, deviceScaleFactor: 1, mobile: false });
await cdp("Page.enable");
await cdp("Page.navigate", { url: pathToFileURL(join(AQUI, "panel.html")).href });
await espera(4000);
const png = await cdp("Page.captureScreenshot", { format: "png" });
writeFileSync(join(AQUI, "panel-vista-previa.png"), Buffer.from(png.result.data, "base64"));
const pdf = await cdp("Page.printToPDF", { printBackground: true, preferCSSPageSize: true, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 });
writeFileSync(join(AQUI, "panel-A3.pdf"), Buffer.from(pdf.result.data, "base64"));
console.log("listo: panel-A3.pdf y panel-vista-previa.png");
ws.close(); chrome.kill();
