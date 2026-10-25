import React from "react";
import { AbsoluteFill, Audio, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import { FPS, FUENTE, suave } from "../marca";
import { Fondo, SubtituloVoz } from "./base";

// Dónde queda el centro de tu cara en los recortes (cuadro de 1080×1920, medido en las tomas).
const CARA = { x: 535, y: 1060 };

/** Cómo sales en pantalla. Cambiar de modo en cada frase es lo que hace los "jump cuts".
 *  "real" es el video original, con tu fondo de verdad; los demás son el recorte sobre la marca. */
export type Modo = "real" | "abajo" | "cerca" | "izq" | "der" | "burbujaIzq" | "burbujaDer" | "burbujaCentro" | "cerrada" | "fuera";

// Ventana (x, y, w, h, r) donde se ve el recorte; k es la escala del video y fx, fy
// dónde queda tu cara dentro de la ventana. `fondo` 1 = burbuja con fondo claro y borde.
type Pose = { x: number; y: number; w: number; h: number; r: number; fondo: number; k: number; fx: number; fy: number };
const PANTALLA = { x: 0, y: 0, w: 1080, h: 1920, r: 0, fondo: 0 };
const D = 340;
const burbuja = (cx: number, cy: number, d = D): Pose => ({ x: cx - d / 2, y: cy - d / 2, w: d, h: d, r: d / 2, fondo: 1, k: 0.62, fx: d / 2, fy: d / 2 + 25 });
const POSES: Record<Modo, Pose> = {
  real: { ...PANTALLA, k: 1, fx: CARA.x, fy: CARA.y },
  abajo: { ...PANTALLA, k: 0.7, fx: 540, fy: 1320 },
  cerca: { ...PANTALLA, k: 1.25, fx: 540, fy: 880 },
  izq: { ...PANTALLA, k: 0.8, fx: 290, fy: 1260 },
  der: { ...PANTALLA, k: 0.8, fx: 790, fy: 1260 },
  burbujaIzq: burbuja(230, 1250),
  burbujaDer: burbuja(850, 1250),
  burbujaCentro: burbuja(540, 1150),
  cerrada: burbuja(540, 1150, 0),
  fuera: { ...PANTALLA, k: 0.7, fx: 540, fy: 2700 },
};

const mezcla = (a: Pose, b: Pose, p: number): Pose => {
  const r = {} as Pose;
  (Object.keys(a) as (keyof Pose)[]).forEach((k) => { r[k] = a[k] + (b[k] - a[k]) * p; });
  return r;
};

// El paso entre lo real y la marca: el fondo real se cierra en un círculo hacia tu cara
// (o se abre desde ella). Mientras el círculo se mueve tú no te mueves, así no se ve doble.
const IRIS = 10;
const RADIO = 1300; // cubre la pantalla entera desde la cara

/** Tramos de una toma que se conservan (en segundos de la toma): lo demás son pausas que se cortan.
 *  `en(seg)` convierte un segundo de la toma al cuadro de la escena ya cortada. */
export type Tramo = [number, number];
export type Linea = { tramos: Tramo[]; dur: number; en: (seg: number) => number };
export const linea = (tramos: Tramo[]): Linea => ({
  tramos,
  dur: Math.round(tramos.reduce((t, [a, b]) => t + b - a, 0) * FPS),
  en: (seg) => {
    let acc = 0;
    for (const [a, b] of tramos) {
      if (seg < a) return Math.round(acc * FPS);
      if (seg <= b) return Math.round((acc + seg - a) * FPS);
      acc += b - a;
    }
    return Math.round(acc * FPS);
  },
});

/** Una toma tuya: fondo de marca o tu video original (modo "real"), la animación (`children`), tú encima según `modos`,
 *  lo que va sobre ti (`encima`) y subtítulos con los tiempos reales.
 *  Todos los tiempos van en segundos de la toma original; `linea` los acomoda a los cortes.
 *  `archivo`: nombre base en public/material/generado/ (sale de scripts/recorte.py y audio.py).
 *  `origen`: segundo de prueba-1.mp4 donde empieza esa toma, para el fondo real. */
export const Toma: React.FC<{
  archivo: string;
  origen: number;
  linea: Linea;
  palabras: [string, number][][];
  modos: [number, Modo][];
  golpes?: number[];
  sacudidas?: number[];
  encima?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ archivo, origen, linea: L, palabras, modos, golpes = [], sacudidas = [], encima, children }) => {
  const f = useCurrentFrame();

  // Pose actual: salto con resorte desde la anterior
  const cambios = modos.map(([seg, m]) => [L.en(seg), m] as const);
  let i = 0;
  cambios.forEach(([en], j) => { if (en <= f) i = j; });
  const [cuando, modo] = cambios[i];
  const previo = cambios[Math.max(0, i - 1)][1];
  const deReal = i > 0 && previo === "real" && modo !== "real";
  const aReal = i > 0 && modo === "real" && previo !== "real";
  // Al salir de lo real primero se cierra el círculo y después te mueves; al entrar, al revés
  const p = i === 0 ? 1 : spring({ frame: f - cuando - (deReal ? IRIS : 0), fps: FPS, config: { damping: 22, stiffness: 170, mass: 0.7 } });
  const pose = mezcla(POSES[previo], POSES[modo], p);
  const iris = modo === "real" ? (aReal ? suave(f, cuando + 12, IRIS) : 1) : deReal ? 1 - suave(f, cuando, IRIS) : 0;

  // Golpe de zoom en las palabras fuertes: acerca toda la imagen hacia tu cara
  const golpe = Math.max(0, ...golpes.map((g) => interpolate(f - L.en(g), [0, 3, 12], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  const k = pose.k;

  // Sacudida de pantalla
  const sac = Math.max(0, ...sacudidas.map((g) => interpolate(f - L.en(g), [0, 14], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  const dx = Math.sin(f * 2.3) * 22 * sac, dy = Math.cos(f * 3.1) * 16 * sac;

  return (
    <AbsoluteFill style={{ fontFamily: FUENTE, overflow: "hidden" }}>
      <Fondo tipo="marca" />
      <AbsoluteFill style={{ transform: `translate(${dx}px, ${dy}px) scale(${1 + 0.06 * golpe + 0.04 * sac})`, transformOrigin: `${CARA.x}px ${CARA.y}px` }}>
        {iris > 0 && (
          <AbsoluteFill style={{ clipPath: iris < 1 ? `circle(${RADIO * iris}px at ${CARA.x}px ${CARA.y}px)` : undefined }}>
            {tramosDe(L).map(({ a, inicio, largo }) => (
              <Sequence key={a} from={inicio} durationInFrames={largo} layout="none">
                <OffthreadVideo muted trimBefore={Math.round((origen + a) * FPS)} src={staticFile("material/videos/prueba-1.mp4")}
                  style={{ position: "absolute", inset: 0, width: 1080, height: 1920 }} />
              </Sequence>
            ))}
          </AbsoluteFill>
        )}
        {iris > 0 && iris < 1 && (
          <div style={{ position: "absolute", left: CARA.x - RADIO * iris, top: CARA.y - RADIO * iris, width: 2 * RADIO * iris, height: 2 * RADIO * iris,
            borderRadius: "50%", boxShadow: "0 0 0 12px rgba(255,255,255,0.9)" }} />
        )}
        {children}
        <div style={{ position: "absolute", left: pose.x, top: pose.y, width: pose.w, height: pose.h, borderRadius: pose.r, overflow: "hidden",
          boxShadow: `0 0 0 ${10 * pose.fondo}px rgba(255,255,255,${pose.fondo}), 0 24px 60px rgba(10,10,40,${0.35 * pose.fondo})` }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, #FFFFFF 0%, #D9D3FF 100%)", opacity: Math.min(1, Math.max(0, pose.fondo)) }} />
          {tramosDe(L).map(({ a, inicio, largo }) => {
            return (
              <Sequence key={a} from={inicio} durationInFrames={largo} layout="none">
                <OffthreadVideo transparent muted trimBefore={Math.round(a * FPS)} src={staticFile(`material/generado/${archivo}.webm`)}
                  style={{ position: "absolute", left: pose.fx - CARA.x * k, top: pose.fy - CARA.y * k, width: 1080 * k, height: 1920 * k }} />
                {/* Fundido de 2 cuadros en cada corte para que no haga clic */}
                <Audio trimBefore={Math.round(a * FPS)} src={staticFile(`material/generado/${archivo}.wav`)}
                  volume={(c) => interpolate(c, [0, 2, largo - 2, largo], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
              </Sequence>
            );
          })}
        </div>
        {encima}
      </AbsoluteFill>
      <SubtituloVoz grupos={palabras.map((g) => g.map(([w, t]) => [w, L.en(t) / FPS] as [string, number]))} y={1460} />
    </AbsoluteFill>
  );
};

/** Dónde cae cada tramo dentro de la escena ya cortada. */
const tramosDe = (L: Linea) => {
  let desde = 0;
  return L.tramos.map(([a, b]) => {
    const largo = Math.round((b - a) * FPS);
    const t = { a, inicio: desde, largo };
    desde += largo;
    return t;
  });
};
