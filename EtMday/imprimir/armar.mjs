// Arma los dos archivos para mandar del EtMday:
//  - EtMday/imprimir/Trado-EtMday-todo.pdf: hoja de qué imprimir y qué hacer + todas las piezas
//  - EtMday/imprimir/Trado-poleras-y-dados.zip: solo lo de la estampadora y los dados
// Requiere Chrome y Python con pypdf. Correr antes los generar.mjs de cada pieza.
// Uso: node EtMday/imprimir/armar.mjs
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const et = join(aqui, "..");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const puerto = 9600 + Math.floor(Math.random() * 40);
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
await cdp("Emulation.setDeviceMetricsOverride", { width: 794, height: 1123, deviceScaleFactor: 2, mobile: false }); // la vista previa es la hoja 1
await cdp("Page.navigate", { url: pathToFileURL(join(aqui, "portada.html")).href });
await espera(3500);
const png = await cdp("Page.captureScreenshot", { format: "png" });
writeFileSync(join(aqui, "portada-vista-previa.png"), Buffer.from(png.result.data, "base64"));
const pdf = await cdp("Page.printToPDF", { paperWidth: 210 / 25.4, paperHeight: 297 / 25.4, printBackground: true, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 });
const portada = join(aqui, "portada.pdf");
writeFileSync(portada, Buffer.from(pdf.result.data, "base64"));
ws.close(); chrome.kill();

// 1) Un solo PDF con todo, en el orden de la tabla de la portada
const piezas = [
  portada,
  join(et, "display", "display-mesa.pdf"),
  join(et, "panel", "panel-2xA4.pdf"),
  join(et, "panel", "tarjetas-A4.pdf"),
  join(et, "dados", "dado-circulos-15cm-A4.pdf"),
  join(et, "flyer", "flyer.pdf"),
  join(et, "one-pager", "one-pager.pdf"),
  join(et, "pitch", "pitch-y-respuestas.pdf"),
];
const py = `
import sys
from pypdf import PdfWriter
w = PdfWriter()
for f in sys.argv[2:]:
    w.append(f)
w.write(sys.argv[1])
print(len(w.pages), "páginas")
`;
const r = spawnSync("python", ["-c", py, join(aqui, "Trado-EtMday-todo.pdf"), ...piezas], { encoding: "utf8" });
console.log(r.status === 0 ? "Trado-EtMday-todo.pdf: " + r.stdout.trim() : r.stderr);

// 2) Carpeta + zip para la estampadora y los dados
const env = join(aqui, "Trado-poleras-y-dados");
rmSync(env, { recursive: true, force: true });
mkdirSync(env);
const pol = join(et, "Poleras");
for (const [de, a] of [
  [join(pol, "frente-logo-morado.pdf"), "1-polera-frente-logo-9cm.pdf"],
  [join(pol, "frente-logo-morado.png"), "1-polera-frente-logo-9cm-600dpi.png"],
  [join(pol, "espalda-g.pdf"), "2-polera-espalda-28x36cm.pdf"],
  [join(pol, "espalda-g.png"), "2-polera-espalda-28x36cm-600dpi.png"],
  [join(pol, "grande", "polera-frente.png"), "3-como-queda-frente.png"],
  [join(pol, "grande", "polera-espalda-g.png"), "3-como-queda-espalda.png"],
  [join(et, "dados", "dado-circulos-15cm-A4.pdf"), "4-dados-circulos-15cm-A4.pdf"],
]) copyFileSync(de, join(env, a));
writeFileSync(join(env, "LEEME.txt"), [
  "Trado · poleras y dados para el EtMday 2026",
  "",
  "POLERAS (blancas, estampado DTF):",
  "- Frente: logo trado morado, 9 cm de ancho, lado izquierdo del pecho, ~8 cm bajo el hombro.",
  "  Archivo: 1-polera-frente-logo-9cm.pdf (vectorial) o el .png a 600 dpi.",
  "- Espalda: grafica de 28 x 36 cm (el bloque morado mide 26 x 34,4 cm), centrada, ~6 cm bajo el cuello.",
  "  Archivo: 2-polera-espalda-28x36cm.pdf (vectorial) o el .png a 600 dpi. Fondo transparente.",
  "- El QR lleva a https://trado.cl. Por favor no achicarlo ni cambiarle el color.",
  "- 3-como-queda-*.png muestran como deben quedar.",
  "",
  "DADOS:",
  "- 4-dados-circulos-15cm-A4.pdf: 6 circulos de 15 cm de diametro, uno por hoja A4.",
  "- Imprimir al 100 % (tamano real). Cada hoja trae una regla que debe medir 50 mm.",
].join("\r\n"));
const zip = join(aqui, "Trado-poleras-y-dados.zip");
rmSync(zip, { force: true });
const z = spawnSync("powershell", ["-NoProfile", "-Command", `Compress-Archive -Path '${env}\\*' -DestinationPath '${zip}'`], { encoding: "utf8" });
console.log(z.status === 0 ? "Trado-poleras-y-dados.zip listo" : z.stderr);
