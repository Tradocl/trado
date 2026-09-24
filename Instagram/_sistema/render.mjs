// Renderiza cada slide-*.html de una carpeta a PNG 1080x1350 con Chrome headless.
// Uso:  node render.mjs posts/post-4   [carpeta de salida opcional]
// Por defecto el PNG queda al lado de su HTML.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, mkdirSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { pathToFileURL } from "node:url";

const NAVEGADORES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
];

const navegador = NAVEGADORES.find(existsSync);
if (!navegador) throw new Error("No encontré Chrome ni Edge instalado.");

const origen = resolve(process.argv[2] ?? ".");
const destino = resolve(process.argv[3] ?? origen);
mkdirSync(destino, { recursive: true });

const slides = readdirSync(origen).filter((f) => /^slide-.*\.html$/.test(f)).sort();
if (!slides.length) throw new Error(`No hay slide-*.html en ${origen}`);

for (const archivo of slides) {
  const salida = join(destino, basename(archivo, ".html") + ".png");
  execFileSync(navegador, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--allow-file-access-from-files",
    "--force-device-scale-factor=1",
    "--window-size=1080,1350",
    "--virtual-time-budget=4000", // deja cargar las fuentes antes de capturar
    `--screenshot=${salida}`,
    pathToFileURL(join(origen, archivo)).href,
  ], { stdio: "ignore" });
  console.log("✓", salida);
}
