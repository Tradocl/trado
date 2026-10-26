import React from "react";
import { AbsoluteFill, Audio, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import { FPS, FUENTE, suave } from "../marca";
import { Fondo, SubtituloVoz } from "./base";

// Cada reel tiene su carpeta en public/material/<reel>/ (fuera del repo):
//   video.mp4           la grabación completa, 1080×1920 y ya pasada a SDR (scripts/convertir.py)
//   generado/<toma>.*   cada toma recortada (.webm) y con la voz limpia (.wav) (scripts/tomas.py)
// Dónde queda el centro de tu cara (cuadro de 1080×1920). Cada toma trae la suya con `cara`,
// porque entre frase y frase te mueves un poco; esta es la de referencia.
export type Punto = { x: number; y: number };
const CARA: Punto = { x: 540, y: 1040 };

/** Cómo sales en pantalla. Cambiar de modo en cada frase es lo que hace los "jump cuts".
 *  "real" es el video original, con tu fondo de verdad; los demás son el recorte sobre la marca. */
export type Modo = "real" | "abajo" | "cerca" | "izq" | "der" | "fuera";

// k es la escala del recorte y fx, fy dónde queda el centro de tu cara en pantalla.
type Pose = { k: number; fx: number; fy: number };
const POSES: Record<Modo, Pose> = {
  real: { k: 1, fx: CARA.x, fy: CARA.y }, // se reemplaza por la cara de cada toma
  abajo: { k: 0.7, fx: 540, fy: 1320 },
  cerca: { k: 1.25, fx: 540, fy: 880 },
  izq: { k: 0.8, fx: 290, fy: 1260 },
  der: { k: 0.8, fx: 790, fy: 1260 },
  fuera: { k: 0.7, fx: 540, fy: 2700 },
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
 *  `carpeta`: la del reel en public/material/; `archivo`: nombre de la toma en su generado/.
 *  `origen`: segundo de video.mp4 donde empieza esa toma, para el fondo real.
 *  `cara`: centro de tu cara en esa toma (medido con scripts de detección, ver README). */
export const Toma: React.FC<{
  carpeta: string;
  archivo: string;
  origen: number;
  linea: Linea;
  palabras: [string, number][][];
  modos: [number, Modo][];
  cara?: Punto;
  encima?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ carpeta, archivo, origen, linea: L, palabras, modos, cara = CARA, encima, children }) => {
  const f = useCurrentFrame();
  const poses = { ...POSES, real: { k: 1, fx: cara.x, fy: cara.y } };

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
  const pose = mezcla(poses[previo], poses[modo], p);
  const iris = modo === "real" ? (aReal ? suave(f, cuando + 12, IRIS) : 1) : deReal ? 1 - suave(f, cuando, IRIS) : 0;

  return (
    <AbsoluteFill style={{ fontFamily: FUENTE, overflow: "hidden" }}>
      <Fondo tipo="marca" />
      <AbsoluteFill>
        {iris > 0 && (
          <AbsoluteFill style={{ clipPath: iris < 1 ? `circle(${RADIO * iris}px at ${cara.x}px ${cara.y}px)` : undefined }}>
            {tramosDe(L).map(({ a, inicio, largo }) => (
              <Sequence key={a} from={inicio} durationInFrames={largo} layout="none">
                <OffthreadVideo muted trimBefore={Math.round((origen + a) * FPS)} src={staticFile(`${carpeta}/video.mp4`)}
                  style={{ position: "absolute", inset: 0, width: 1080, height: 1920 }} />
              </Sequence>
            ))}
          </AbsoluteFill>
        )}
        {iris > 0 && iris < 1 && (
          <div style={{ position: "absolute", left: cara.x - RADIO * iris, top: cara.y - RADIO * iris, width: 2 * RADIO * iris, height: 2 * RADIO * iris,
            borderRadius: "50%", boxShadow: "0 0 0 12px rgba(255,255,255,0.9)" }} />
        )}
        {children}
        {tramosDe(L).map(({ a, inicio, largo }) => (
          <Sequence key={a} from={inicio} durationInFrames={largo} layout="none">
            <OffthreadVideo transparent muted trimBefore={Math.round(a * FPS)} src={staticFile(`${carpeta}/generado/${archivo}.webm`)}
              style={{ position: "absolute", left: pose.fx - cara.x * pose.k, top: pose.fy - cara.y * pose.k, width: 1080 * pose.k, height: 1920 * pose.k }} />
            {/* Fundido de 2 cuadros en cada corte para que no haga clic */}
            <Audio trimBefore={Math.round(a * FPS)} src={staticFile(`${carpeta}/generado/${archivo}.wav`)}
              volume={(c) => interpolate(c, [0, 2, largo - 2, largo], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
          </Sequence>
        ))}
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
