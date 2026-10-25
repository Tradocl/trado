import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { C, DEGRADADO, FUENTE, OSCURO, rebote, suave } from "../marca";

export const Fondo: React.FC<{ tipo: "oscuro" | "marca" }> = ({ tipo }) => (
  <AbsoluteFill style={{ background: tipo === "oscuro" ? OSCURO : DEGRADADO }} />
);

/** "trado" arriba a la izquierda, igual que los reels de Pillow. */
export const Cabecera: React.FC = () => (
  <div style={{ position: "absolute", left: 80, top: 110, fontFamily: FUENTE, fontWeight: 800, fontSize: 64, color: C.blanco, letterSpacing: "-0.025em" }}>
    trado
  </div>
);

/** Título centrado; la palabra `marca` se subraya mientras entra (verde = alivio, naranjo = problema). */
export const Titulo: React.FC<{
  texto: string;
  marca?: string;
  colorMarca?: string;
  y: number;
  size?: number;
  desde?: number;
}> = ({ texto, marca, colorMarca = C.verde, y, size = 88, desde = 0 }) => {
  const f = useCurrentFrame();
  const palabras = texto.split(" ");
  return (
    <div style={{ position: "absolute", top: y, left: 80, right: 80, textAlign: "center", fontFamily: FUENTE, fontWeight: 800, fontSize: size, lineHeight: 1.12, color: C.blanco, letterSpacing: "-0.03em" }}>
      {palabras.map((p, i) => {
        const k = rebote(f, desde + i * 2);
        const limpia = p.replace(/[.,¿?¡!]/g, "");
        const esMarca = marca && limpia === marca;
        const ul = suave(f, desde + palabras.length * 2 + 4, 10);
        return (
          <span key={i} style={{ display: "inline-block", marginRight: "0.25em", transform: `translateY(${(1 - k) * 40}px)`, opacity: Math.min(1, k * 1.5), position: "relative" }}>
            {p}
            {esMarca && (
              <span style={{ position: "absolute", left: 0, bottom: -size * 0.06, height: size * 0.14, width: `${ul * 100}%`, background: colorMarca, borderRadius: 999 }} />
            )}
          </span>
        );
      })}
    </div>
  );
};

/** Un clip tuyo. Si todavía no está grabado, muestra el recuadro de lo que hay que grabar. */
export const Clip: React.FC<{ src: string | null; etiqueta: string; style?: React.CSSProperties }> = ({ src, etiqueta, style }) => {
  const base: React.CSSProperties = { position: "absolute", inset: 0, overflow: "hidden", ...style };
  if (src) {
    return (
      <div style={base}>
        <OffthreadVideo src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  return (
    <div style={{ ...base, background: "rgba(255,255,255,0.08)", border: "6px dashed rgba(255,255,255,0.45)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, fontFamily: FUENTE, color: C.blanco, textAlign: "center", padding: 60 }}>
      <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: "0.08em", opacity: 0.7 }}>TU CLIP</div>
      <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1.2, whiteSpace: "pre-line" }}>{etiqueta}</div>
    </div>
  );
};

/** Subtítulo palabra por palabra; la palabra que se está diciendo va en un recuadro verde.
 *  Por ahora los tiempos se reparten parejo; con la voz grabada salen de la transcripción. */
export const Subtitulo: React.FC<{ texto: string; desde: number; hasta: number; y?: number }> = ({ texto, desde, hasta, y = 1180 }) => {
  const f = useCurrentFrame();
  if (f < desde || f >= hasta) return null;
  const palabras = texto.split(" ");
  const actual = Math.floor(((f - desde) / (hasta - desde)) * palabras.length);
  return (
    <div style={{ position: "absolute", top: y, left: 70, right: 70, textAlign: "center", fontFamily: FUENTE, fontWeight: 800, fontSize: 72, lineHeight: 1.25, color: C.blanco, textShadow: "0 4px 18px rgba(0,0,0,0.55)" }}>
      {palabras.map((p, i) => (
        <span key={i} style={{ display: "inline-block", margin: "0 0.04em", padding: "0 0.1em", borderRadius: 14, background: i === actual ? C.verde : "transparent", opacity: i <= actual ? 1 : 0.35 }}>
          {p}
        </span>
      ))}
    </div>
  );
};

export const Sfx: React.FC<{ nombre: string; en: number; vol?: number }> = ({ nombre, en, vol = 1 }) => (
  <Sequence from={en} layout="none">
    <Audio src={staticFile(`sfx/${nombre}.wav`)} volume={vol} />
  </Sequence>
);

/** Píldora blanca con texto, para nombres de lugar y etiquetas. */
export const Pildora: React.FC<{ texto: string; style?: React.CSSProperties; color?: string; fondo?: string }> = ({ texto, style, color = C.tinta, fondo = C.blanco }) => (
  <div style={{ position: "absolute", fontFamily: FUENTE, fontWeight: 800, fontSize: 40, color, background: fondo, padding: "16px 34px", borderRadius: 999, boxShadow: "0 10px 30px rgba(10,10,40,0.25)", ...style }}>
    {texto}
  </div>
);
