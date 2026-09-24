// Genera la carpeta "4 Logos" completa: SVG vectoriales + PNG de cada variante.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const opentype = require('opentype.js');

const SCRATCH = __dirname;
const DEST = 'C:/Users/herna/trado/instagram/4 Logos';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

// ── Colores oficiales (src/components/Logo.tsx, trado-icon.svg, base.css) ──
const C = {
  indigo: '#1F25C1', violeta: '#7B46D8', negro: '#131924', oscuro: '#0F141C',
  blanco: '#FFFFFF', gris: '#F5F5FA',
};
const HERO = 'linear-gradient(135deg, #1225A8 0%, #3D4BCE 50%, #7B46D8 100%)';

// ── 1. Wordmark "trado" en Inter 600, letter-spacing -2.5/56 em (igual que Logo.tsx) ──
const font = opentype.parse(fs.readFileSync(path.join(SCRATCH, 'node_modules/@fontsource/inter/files/inter-latin-600-normal.woff')).buffer);
const SIZE = 1000, LS = -2.5 / 56 * SIZE;
let x = 0, d = '';
const glyphs = font.stringToGlyphs('trado');
glyphs.forEach((g, i) => {
  d += g.getPath(x, 0, SIZE).toPathData(2);
  x += g.advanceWidth * SIZE / font.unitsPerEm;
  if (i < glyphs.length - 1) x += font.getKerningValue(g, glyphs[i + 1]) * SIZE / font.unitsPerEm + LS;
});
const bb = new opentype.Path(); // bbox real de la tinta
{ let x2 = 0; glyphs.forEach((g, i) => { bb.extend(g.getPath(x2, 0, SIZE)); x2 += g.advanceWidth * SIZE / font.unitsPerEm; if (i < glyphs.length - 1) x2 += font.getKerningValue(g, glyphs[i + 1]) * SIZE / font.unitsPerEm + LS; }); }
const B = bb.getBoundingBox();
const W = { x: B.x1, y: B.y1, w: B.x2 - B.x1, h: B.y2 - B.y1, d };

// ── 2. Ícono "t." redibujado sobre el ícono real de la app (public/icon-512.png), punto como círculo exacto ──
const T_PATH = 'M 211 146 H 237 V 186 H 289 V 218 H 237 V 306 C 237 319.5 240.5 329.5 250.5 334.8 C 259 339 272 337.8 290.6 333 V 364.4 C 282 368.9 267 371 251.5 371 C 213.5 371 195 352 195 312 V 218 H 171 V 199.4 L 181 194 C 190 189 197.1 186 199.5 179 L 211 146 Z';
const DOT = { cx: 392, cy: 344, r: 35.75 };
// Caja de tinta del "t." dentro del cuadro de 512
const TI = { x: 171, y: 146, w: DOT.cx + DOT.r - 171, h: DOT.cy + DOT.r - 146 };

const grad = (id, dir) => dir === 'h'
  ? `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.indigo}"/><stop offset="1" stop-color="${C.violeta}"/></linearGradient>`
  : `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.indigo}"/><stop offset="1" stop-color="${C.violeta}"/></linearGradient>`;

// SVG del wordmark, recortado a la tinta con margen m (en unidades de 1000)
function svgWordmark(fill, { m = 60, bg = null, rel = false } = {}) {
  const vb = `${(W.x - m).toFixed(1)} ${(W.y - m).toFixed(1)} ${(W.w + 2 * m).toFixed(1)} ${(W.h + 2 * m).toFixed(1)}`;
  const defs = fill === 'grad' ? `<defs>${grad('g', 'h')}</defs>` : '';
  const f = fill === 'grad' ? 'url(#g)' : fill;
  const fondo = bg ? `<rect x="${(W.x - m).toFixed(1)}" y="${(W.y - m).toFixed(1)}" width="${(W.w + 2 * m).toFixed(1)}" height="${(W.h + 2 * m).toFixed(1)}" fill="${bg}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="Trado"><title>Trado</title>${defs}${fondo}<path fill="${f}" d="${W.d}"/></svg>\n`;
}

// SVG del ícono: forma = 'redondeado' | 'cuadrado' | 'circulo' | null (solo la t.)
function svgIcono({ fondo = 'grad', tinta = C.blanco, forma = 'redondeado' } = {}) {
  let defs = '', body = '';
  if (fondo === 'grad' || tinta === 'grad') defs = `<defs>${grad('g', 'd')}</defs>`;
  const fb = fondo === 'grad' ? 'url(#g)' : fondo;
  const ft = tinta === 'grad' ? 'url(#g)' : tinta;
  if (forma) {
    if (forma === 'circulo') body += `<circle cx="256" cy="256" r="256" fill="${fb}"/>`;
    else body += `<rect width="512" height="512" rx="${forma === 'redondeado' ? 112 : 0}" fill="${fb}"/>`;
    body += `<path fill="${ft}" d="${T_PATH}"/><circle cx="${DOT.cx}" cy="${DOT.cy}" r="${DOT.r}" fill="${ft}"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Trado"><title>Trado</title>${defs}${body}</svg>\n`;
  }
  // Solo la "t." recortada a su tinta; el degradado cubre la tinta
  const m = 14, vb = `${TI.x - m} ${TI.y - m} ${TI.w + 2 * m} ${TI.h + 2 * m}`;
  const gd = tinta === 'grad' ? `<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="${TI.x}" y1="${TI.y}" x2="${TI.x + TI.w}" y2="${TI.y + TI.h}"><stop offset="0" stop-color="${C.indigo}"/><stop offset="1" stop-color="${C.violeta}"/></linearGradient></defs>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="Trado"><title>Trado</title>${gd}<path fill="${ft}" d="${T_PATH}"/><circle cx="${DOT.cx}" cy="${DOT.cy}" r="${DOT.r}" fill="${ft}"/></svg>\n`;
}

// ── Render de HTML a PNG con Chrome headless ──
let n = 0;
function png(html, out, w, h, transparente) {
  const tmp = path.join(SCRATCH, `tmp-${n++}.html`);
  fs.writeFileSync(tmp, `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;${transparente ? 'background:transparent' : ''}}</style></head><body>${html}</body></html>`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const args = ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--force-device-scale-factor=1', `--window-size=${w},${h}`, '--virtual-time-budget=1500', `--screenshot=${out}`];
  if (transparente) args.push('--default-background-color=00000000');
  execFileSync(CHROME, [...args, 'file:///' + tmp.replace(/\\/g, '/')], { stdio: 'ignore' });
}
const inline = (svg, css) => svg.replace('<svg ', `<svg style="${css}" `);

// ── Estructura ──
for (const f of (fs.existsSync(DEST) ? fs.readdirSync(DEST, { recursive: true }) : [])) { const p = path.join(DEST, f); if (fs.statSync(p).isFile()) fs.unlinkSync(p); }
const D = (...p) => path.join(DEST, ...p);
const w = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };

// 1. Wordmark
const WM = [
  // [nombre, tinta, fondoCss, fondoSvg]
  ['trado degradado - fondo blanco', 'grad', C.blanco],
  ['trado degradado - fondo gris claro', 'grad', C.gris],
  ['trado indigo - fondo blanco', C.indigo, C.blanco],
  ['trado negro - fondo blanco', C.negro, C.blanco],
  ['trado blanco - fondo indigo', C.blanco, C.indigo],
  ['trado blanco - fondo degradado', C.blanco, HERO],
  ['trado blanco - fondo oscuro', C.blanco, C.oscuro],
];
WM.forEach(([nombre, tinta, fondo], i) => {
  const svg = svgWordmark(tinta, { m: 0 });
  // 2000x1000, logo de 1100 px de ancho centrado
  png(`<div style="width:2000px;height:1000px;background:${fondo};display:grid;place-items:center">${inline(svg, 'width:1100px;height:auto;display:block')}</div>`,
    D('1 Logo trado', 'Con fondo', `${String(i + 1).padStart(2, '0')} ${nombre}.png`), 2000, 1000);
});
const WMT = [['trado degradado', 'grad'], ['trado indigo', C.indigo], ['trado negro', C.negro], ['trado blanco', C.blanco]];
const ratio = (W.h + 120) / (W.w + 120);
WMT.forEach(([nombre, tinta]) => {
  const svg = svgWordmark(tinta, { m: 60 });
  const ww = 2400, hh = Math.round(ww * ratio);
  png(inline(svg, `width:${ww}px;height:${hh}px;display:block`), D('1 Logo trado', 'Sin fondo (transparente)', `${nombre}.png`), ww, hh, true);
  w(D('1 Logo trado', 'SVG (vectorial)', `${nombre}.svg`), svg);
});

// 2. Ícono t.
const IC = [
  ['icono degradado', 'grad', C.blanco],
  ['icono indigo', C.indigo, C.blanco],
  ['icono oscuro', C.oscuro, C.blanco],
  ['icono blanco con t degradado', C.blanco, 'grad'],
  ['icono blanco con t indigo', C.blanco, C.indigo],
];
IC.forEach(([nombre, fondo, tinta], i) => {
  const svg = svgIcono({ fondo, tinta, forma: 'redondeado' });
  // Redondeado (como en el celular), fondo transparente alrededor
  const borde = fondo === C.blanco ? 'filter:drop-shadow(0 0 1.5px rgba(19,25,36,.25))' : '';
  png(inline(svg, `width:1024px;height:1024px;display:block;${borde}`), D('2 Icono t', 'Redondeado (como en el celular)', `${String(i + 1).padStart(2, '0')} ${nombre}.png`), 1024, 1024, true);
  w(D('2 Icono t', 'SVG (vectorial)', `${nombre} - redondeado.svg`), svg);
  // Cuadrado lleno (para foto de perfil: Instagram lo recorta en círculo)
  const sq = svgIcono({ fondo, tinta, forma: 'cuadrado' });
  png(inline(sq, 'width:1080px;height:1080px;display:block'), D('2 Icono t', 'Cuadrado (foto de perfil)', `${String(i + 1).padStart(2, '0')} ${nombre}.png`), 1080, 1080);
  w(D('2 Icono t', 'SVG (vectorial)', `${nombre} - cuadrado.svg`), sq);
});
const TS = [['t degradado', 'grad'], ['t indigo', C.indigo], ['t negro', C.negro], ['t blanco', C.blanco]];
TS.forEach(([nombre, tinta]) => {
  const svg = svgIcono({ tinta, forma: null });
  const hh = 1200, ww = Math.round(hh * (TI.w + 28) / (TI.h + 28));
  png(inline(svg, `width:${ww}px;height:${hh}px;display:block`), D('2 Icono t', 'Solo la t (transparente)', `${nombre}.png`), ww, hh, true);
  w(D('2 Icono t', 'SVG (vectorial)', `solo la ${nombre}.svg`), svg);
});

fs.writeFileSync(path.join(SCRATCH, 'datos.json'), JSON.stringify({ W: { x: W.x, y: W.y, w: W.w, h: W.h }, TI, DOT }, null, 1));
module.exports = { svgWordmark, svgIcono, C, HERO };
console.log('listo', n, 'renders');
