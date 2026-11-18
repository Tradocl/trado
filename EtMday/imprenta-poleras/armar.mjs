// Arma la carpeta para la imprenta de las poleras (y su zip):
// - espaldas A y Z escaladas al tamaño final de 31,1 × 40 cm (el diseño es de 28 × 36 cm; se agranda en
//   proporción 10/9), en PDF vectorial y PNG a 600 dpi, con fondo transparente;
// - el logo del frente (9 × 3,16 cm), las vistas en polera y la ficha A4 con medidas y ubicación.
// Antes: node EtMday/Poleras/generar.mjs frente-logo.html  y  node EtMday/Poleras/generar-grandes.mjs frente a z
// Uso: node EtMday/imprenta-poleras/armar.mjs
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const pol = join(aqui, "..", "Poleras");
const sal = join(aqui, "Trado-poleras-para-imprenta");
rmSync(sal, { recursive: true, force: true });
mkdirSync(sal);

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
await cdp("Page.enable");
const px = (cm) => Math.round((cm / 2.54) * 96);

const ESCALA = 10 / 9;                      // 28 × 36 cm → 31,1 × 40 cm
const [W, H] = [28 * ESCALA, 36 * ESCALA];
for (const [letra, nombre] of [["a", "2-polera1-espalda-31,1x40cm"], ["z", "3-polera2-espalda-31,1x40cm"]]) {
  await cdp("Emulation.setDeviceMetricsOverride", { width: px(28), height: px(36), deviceScaleFactor: (600 / 96) * ESCALA, mobile: false });
  await cdp("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
  await cdp("Page.navigate", { url: pathToFileURL(join(pol, `espalda-${letra}.html`)).href });
  await espera(3500);
  await cdp("Runtime.evaluate", { expression: "document.fonts.ready.then(() => true)", awaitPromise: true });
  const png = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, clip: { x: 0, y: 0, width: px(28), height: px(36), scale: 1 } });
  writeFileSync(join(sal, nombre + "-600dpi.png"), Buffer.from(png.result.data, "base64"));
  const pdf = await cdp("Page.printToPDF", { paperWidth: W / 2.54, paperHeight: H / 2.54, scale: ESCALA, printBackground: true, preferCSSPageSize: false,
    marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, pageRanges: "1" });
  writeFileSync(join(sal, nombre + ".pdf"), Buffer.from(pdf.result.data, "base64"));
  console.log("listo:", nombre);
}

// Ficha A4
await cdp("Emulation.setDeviceMetricsOverride", { width: px(21), height: px(29.7), deviceScaleFactor: 2, mobile: false });
await cdp("Emulation.setDefaultBackgroundColorOverride", {});
await cdp("Page.navigate", { url: pathToFileURL(join(aqui, "ficha.html")).href });
await espera(3000);
await cdp("Runtime.evaluate", { expression: "document.fonts.ready.then(() => true)", awaitPromise: true });
const vista = await cdp("Page.captureScreenshot", { format: "png" });
writeFileSync(join(aqui, "ficha-vista-previa.png"), Buffer.from(vista.result.data, "base64"));
const ficha = await cdp("Page.printToPDF", { paperWidth: 21 / 2.54, paperHeight: 29.7 / 2.54, printBackground: true, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, pageRanges: "1" });
writeFileSync(join(sal, "0-LEER-PRIMERO-ficha-poleras.pdf"), Buffer.from(ficha.result.data, "base64"));
ws.close(); chrome.kill();

for (const [de, a] of [
  ["frente-logo.pdf", "1-frente-logo-9x3,16cm.pdf"],
  ["frente-logo.png", "1-frente-logo-9x3,16cm-600dpi.png"],
  ["grande/polera-frente.png", "4-como-queda-frente.png"],
  ["grande/polera-espalda-a.png", "4-como-queda-polera1-espalda.png"],
  ["grande/polera-espalda-z.png", "4-como-queda-polera2-espalda.png"],
]) copyFileSync(join(pol, de), join(sal, a));

const zip = join(aqui, "Trado-poleras-para-imprenta.zip");
rmSync(zip, { force: true });
const z = spawnSync("powershell", ["-NoProfile", "-Command", `Compress-Archive -Path '${sal}\\*' -DestinationPath '${zip}'`], { encoding: "utf8" });
console.log(z.status === 0 ? "Trado-poleras-para-imprenta.zip listo" : z.stderr);
