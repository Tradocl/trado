// Renderiza las historias destacadas (portada + slide-*.html) a PNG 1080x1920.
// Uso, desde _sistema/destacadas:  node render.mjs
// Cada destacada queda en "3 Historias destacadas/<carpeta>": 00 portada.png, 01.png, 02.png...
// Lo que no se genera acá (las señales, la foto del Fintech Forum) vive solo en esa carpeta.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const NAVEGADORES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
];
const navegador = NAVEGADORES.find(existsSync);
if (!navegador) throw new Error("No encontré Chrome ni Edge instalado.");

const AQUI = dirname(fileURLToPath(import.meta.url));
const SALIDA = resolve(AQUI, "../../3 Historias destacadas");

// fuente (en esta carpeta) → carpeta de salida + ícono de la portada (ver portada.html)
const DESTACADAS = [
  { fuente: "1-como-va", salida: "1 Como va", icono: "custodia" },
  { fuente: "2-precios", salida: "2 Precios", icono: "precios" },
  { fuente: "3-senales", salida: "3 Senales", icono: "senales" },
  { fuente: "4-nosotros", salida: "4 Nosotros", icono: "nosotros" },
  { fuente: "5-dudas", salida: "5 Dudas", icono: "dudas" },
];

function capturar(url, archivo) {
  execFileSync(navegador, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--allow-file-access-from-files",
    "--force-device-scale-factor=1",
    "--window-size=1080,1920",
    "--virtual-time-budget=4000", // deja cargar las fuentes antes de capturar
    `--screenshot=${archivo}`,
    url,
  ], { stdio: "ignore" });
  console.log("listo:", archivo);
}

for (const { fuente, salida, icono } of DESTACADAS) {
  const destino = join(SALIDA, salida);
  mkdirSync(destino, { recursive: true });
  capturar(`${pathToFileURL(join(AQUI, "portada.html")).href}?i=${icono}`, join(destino, "00 portada.png"));

  const carpeta = join(AQUI, fuente);
  if (!existsSync(carpeta)) continue;
  for (const html of readdirSync(carpeta).filter((f) => /^slide-\d+\.html$/.test(f)).sort()) {
    const n = html.match(/\d+/)[0];
    capturar(pathToFileURL(join(carpeta, html)).href, join(destino, `${n}.png`));
  }
}
