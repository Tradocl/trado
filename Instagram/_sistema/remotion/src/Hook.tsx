import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, staticFile } from "remotion";
import { FUENTE, s } from "./marca";
import { MATERIAL } from "./material";
import { Clip, Fondo, Sfx, SubtituloVoz } from "./piezas/base";
import { Publicacion } from "./piezas/Publicacion";

// Hook en formato green screen: el feed atrás y tú recortado abajo, comentándolo.
// Los tiempos salen de la toma 1 de prueba-1.mp4 (desde el segundo 0,4).
export const DURACION_HOOK = s(5.2);

const PALABRAS: [string, number][][] = [
  [["Lo", 0.45], ["encontraste,", 0.88]],
  [["precio", 1.82], ["perfecto,", 2.04]],
  [["pero", 3.0], ["el", 3.14], ["vendedor", 3.26]],
  [["está", 3.68], ["en", 4.0], ["Arica.", 4.12]],
];

export const Hook: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FUENTE }}>
    <Fondo tipo="marca" />
    <Publicacion y={190} alto={860} paraEn={s(1.6)} marcas={{ precio: s(2.0), lugar: s(4.1), duda: s(4.6) }} />
    {MATERIAL.hookRecorte ? (
      // Recortado y anclado abajo, como los videos de green screen
      <OffthreadVideo transparent src={staticFile(MATERIAL.hookRecorte)}
        style={{ position: "absolute", left: 160, bottom: 0, width: 760, height: 1351, objectFit: "cover" }} muted />
    ) : (
      <Clip src={null} etiqueta="Tú abajo, recortado" style={{ top: 1060, left: 140, right: 140, bottom: 0 }} />
    )}
    {MATERIAL.hookAudio && <Audio src={staticFile(MATERIAL.hookAudio)} />}
    <SubtituloVoz grupos={PALABRAS} y={1500} />
    <Sfx nombre="whoosh_sube" en={0} vol={0.5} />
    <Sfx nombre="tic" en={s(1.6)} />
    <Sfx nombre="pop" en={s(4.1)} />
    <Sfx nombre="fracaso" en={s(4.6)} vol={0.6} />
  </AbsoluteFill>
);
