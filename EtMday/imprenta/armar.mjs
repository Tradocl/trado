// Arma los 3 PDF para mandar a imprenta (cada uno: ficha A4 + piezas a tamaño real con sangrado)
// y un zip con los tres. Requiere Chrome y Python con pypdf.
// Uso: node EtMday/imprenta/armar.mjs
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "imprenta-"));
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const puerto = 9550 + Math.floor(Math.random() * 40);
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
const px = (mm) => Math.round((mm / 25.4) * 96);
const url = pathToFileURL(join(aqui, "imprenta.html")).href;

let k = 0;
async function pdf(query, w, h, preview) {
  await cdp("Emulation.setDeviceMetricsOverride", { width: px(w), height: px(h), deviceScaleFactor: 2, mobile: false });
  await cdp("Page.navigate", { url: url + "?" + query });
  await espera(2500);
  if (preview) {
    const p = await cdp("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(aqui, preview), Buffer.from(p.result.data, "base64"));
  }
  const r = await cdp("Page.printToPDF", { paperWidth: w / 25.4, paperHeight: h / 25.4, printBackground: true, preferCSSPageSize: false, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, pageRanges: "1" });
  const f = join(tmp, `p${String(k++).padStart(3, "0")}.pdf`);
  writeFileSync(f, Buffer.from(r.result.data, "base64"));
  return f;
}

const B = 3;
const archivos = {
  "1-Trado-dado-circulos-15cm.pdf": [
    await pdf("ficha=dado", 210, 297, "vista-dado.png"),
    ...(await Promise.all([])),
  ],
};
for (let c = 0; c < 6; c++) archivos["1-Trado-dado-circulos-15cm.pdf"].push(await pdf(`pieza=dado&cara=${c}`, 150 + 2 * B, 150 + 2 * B));

archivos["2-Trado-tarjetas-adhesivas-8,56x5,4cm.pdf"] = [await pdf("ficha=tarjetas", 210, 297, "vista-tarjetas.png")];
for (let n = 1; n <= 9; n++) archivos["2-Trado-tarjetas-adhesivas-8,56x5,4cm.pdf"].push(await pdf(`pieza=carta&n=${n}`, 85.6 + 2 * B, 54 + 2 * B));
archivos["2-Trado-tarjetas-adhesivas-8,56x5,4cm.pdf"].push(await pdf("pieza=buena", 85.6 + 2 * B, 54 + 2 * B));
archivos["2-Trado-tarjetas-adhesivas-8,56x5,4cm.pdf"].push(await pdf("pieza=reverso", 85.6 + 2 * B, 54 + 2 * B));

archivos["3-Trado-stickers-extra-opcional.pdf"] = [
  await pdf("ficha=extra", 210, 297, "vista-extra.png"),
  await pdf("pieza=qr", 80 + 2 * B, 80 + 2 * B),
  await pdf("pieza=logo", 100 + 2 * B, 35 + 2 * B),
];
ws.close(); chrome.kill();

const sal = join(aqui, "Trado-para-imprenta");
rmSync(sal, { recursive: true, force: true });
mkdirSync(sal);
const py = `
import sys
from pypdf import PdfWriter
w = PdfWriter()
for f in sys.argv[2:]:
    w.append(f)
w.write(sys.argv[1])
print(len(w.pages))
`;
for (const [nombre, partes] of Object.entries(archivos)) {
  const r = spawnSync("python", ["-c", py, join(sal, nombre), ...partes], { encoding: "utf8" });
  console.log(nombre, r.status === 0 ? r.stdout.trim() + " páginas" : r.stderr);
}
const zip = join(aqui, "Trado-para-imprenta.zip");
rmSync(zip, { force: true });
const z = spawnSync("powershell", ["-NoProfile", "-Command", `Compress-Archive -Path '${sal}\\*' -DestinationPath '${zip}'`], { encoding: "utf8" });
console.log(z.status === 0 ? "Trado-para-imprenta.zip listo" : z.stderr);
