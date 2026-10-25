// Genera src/chile.ts: el contorno de Chile continental como path SVG y las
// ciudades ya proyectadas al mismo lienzo. Fuente: Natural Earth (dominio
// público) vía world-atlas. Se corre una vez con `npm run mapa`.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { feature } from "topojson-client";
import { geoMercator, geoPath } from "d3-geo";

const require = createRequire(import.meta.url);
const topo = JSON.parse(readFileSync(require.resolve("world-atlas/countries-50m.json"), "utf8"));
const chile = feature(topo, topo.objects.countries).features.find((f) => f.id === "152");

// Sólo el continente y sus islas pegadas (Chiloé, Tierra del Fuego): fuera
// Rapa Nui, Juan Fernández y las Desventuradas, que achicarían todo el mapa.
const polys = chile.geometry.coordinates.filter((poly) => poly[0].every(([lon]) => lon > -77));
const continental = { type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates: polys } };

const ANCHO = 420, ALTO = 1640;
const proj = geoMercator().fitSize([ANCHO, ALTO], continental);
const d = geoPath(proj)(continental);

const CIUDADES = {
  arica: [-70.31, -18.48],
  calama: [-68.93, -22.46],
  antofagasta: [-70.4, -23.65],
  laSerena: [-71.25, -29.9],
  valparaiso: [-71.62, -33.05],
  santiago: [-70.67, -33.45],
  concepcion: [-73.05, -36.83],
  temuco: [-72.59, -38.74],
  puertoMontt: [-72.94, -41.47],
  castro: [-73.76, -42.48],
  coyhaique: [-72.07, -45.57],
  puntaArenas: [-70.91, -53.16],
};
const ciudades = Object.fromEntries(
  Object.entries(CIUDADES).map(([k, ll]) => [k, proj(ll).map((v) => Math.round(v * 10) / 10)]),
);

writeFileSync(
  new URL("../src/chile.ts", import.meta.url),
  `// Generado por scripts/chile.mjs (Natural Earth, dominio público). No editar a mano.\n` +
    `export const CHILE_ANCHO = ${ANCHO};\nexport const CHILE_ALTO = ${ALTO};\n` +
    `export const CHILE_PATH = ${JSON.stringify(d.replace(/(\d+\.\d)\d+/g, "$1"))};\n` +
    `export const CIUDADES = ${JSON.stringify(ciudades)} as const;\n` +
    `export type Ciudad = keyof typeof CIUDADES;\n`,
);
console.log("src/chile.ts listo:", polys.length, "polígonos,", d.length, "caracteres");
