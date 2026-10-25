import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, staticFile } from "remotion";
import { FUENTE } from "../marca";
import { Clip, Fondo, SubtituloVoz } from "./base";

// Recortado y anclado abajo, como los videos de green screen. La cabeza queda
// cerca de y 1120: lo animado va entre y 190 y 1050.
export const RECORTE: React.CSSProperties = { position: "absolute", left: 160, bottom: 0, width: 760, height: 1351, objectFit: "cover" };

/** Una toma tuya en formato green screen: fondo de marca, la animación (`children`) arriba,
 *  tú recortado abajo, tu audio limpio y los subtítulos con los tiempos reales.
 *  `archivo`: nombre base en public/material/generado/ (sale de scripts/recorte.py y audio.py). */
export const Toma: React.FC<{ archivo: string | null; palabras: [string, number][][]; duracionClip?: number; children?: React.ReactNode }> = ({ archivo, palabras, duracionClip, children }) => (
  <AbsoluteFill style={{ fontFamily: FUENTE }}>
    <Fondo tipo="marca" />
    {children}
    {archivo ? (
      <Sequence durationInFrames={duracionClip} layout="none">
        <OffthreadVideo transparent src={staticFile(`material/generado/${archivo}.webm`)} style={RECORTE} muted />
        <Audio src={staticFile(`material/generado/${archivo}.wav`)} />
      </Sequence>
    ) : (
      <Clip src={null} etiqueta="Tú abajo, recortado" style={{ top: 1060, left: 140, right: 140, bottom: 0 }} />
    )}
    <SubtituloVoz grupos={palabras} y={1500} />
  </AbsoluteFill>
);
