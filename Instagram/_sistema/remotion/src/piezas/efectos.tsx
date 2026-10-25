import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { C, FUENTE, rebote } from "../marca";

/** Emoji grande que salta con rebote. */
export const Salto: React.FC<{ emoji: string; en: number; style: React.CSSProperties; giro?: number; size?: number }> = ({ emoji, en, style, giro = -10, size = 220 }) => {
  const f = useCurrentFrame();
  if (f < en) return null;
  const k = rebote(f, en);
  return <div style={{ position: "absolute", fontSize: size, lineHeight: 1, transform: `scale(${k}) rotate(${giro * k}deg)`, ...style }}>{emoji}</div>;
};

/** Texto que entra gigante y se clava en su lugar. */
export const Palabra: React.FC<{ texto: string; en: number; y: number; size?: number; color?: string; fondo?: string; giro?: number; style?: React.CSSProperties }> = ({ texto, en, y, size = 110, color = C.blanco, fondo, giro = -3, style }) => {
  const f = useCurrentFrame();
  if (f < en) return null;
  const k = rebote(f, en);
  return (
    <div style={{ position: "absolute", top: y, left: 0, right: 0, display: "flex", justifyContent: "center", ...style }}>
      <div style={{ fontFamily: FUENTE, fontWeight: 800, fontSize: size, lineHeight: 1.05, letterSpacing: "-0.035em", color, textAlign: "center",
        background: fondo, padding: fondo ? "0.08em 0.35em" : 0, borderRadius: 0.3 * size, boxShadow: fondo ? "0 16px 40px rgba(10,10,40,0.3)" : undefined,
        textShadow: fondo ? undefined : "0 8px 30px rgba(10,10,40,0.35)",
        transform: `scale(${1 + 1.3 * (1 - k)}) rotate(${giro}deg)`, opacity: Math.min(1, k * 2), whiteSpace: "pre-line" }}>
        {texto}
      </div>
    </div>
  );
};

/** Fogonazo blanco: marca un golpe o un cambio de escena. */
export const Destello: React.FC<{ en: number; fuerza?: number }> = ({ en, fuerza = 0.55 }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [en, en + 7], [fuerza, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (f < en || o <= 0) return null;
  return <AbsoluteFill style={{ background: C.blanco, opacity: o }} />;
};

/** Rayos que giran detrás de algo que se revela. */
export const Rayos: React.FC<{ en: number; x: number; y: number; r?: number }> = ({ en, x, y, r = 520 }) => {
  const f = useCurrentFrame();
  if (f < en) return null;
  const k = rebote(f, en);
  return (
    <div style={{ position: "absolute", left: x - r, top: y - r, width: 2 * r, height: 2 * r, borderRadius: "50%", transform: `scale(${k})`,
      background: `repeating-conic-gradient(from ${(f - en) * 1.5}deg, rgba(255,255,255,0.22) 0deg 9deg, rgba(255,255,255,0) 9deg 18deg)`,
      WebkitMaskImage: "radial-gradient(circle, black 25%, transparent 70%)" }} />
  );
};

const COLORES = [C.verde, C.naranjo, C.blanco, "#FFD23F", "#A78BFA"];

/** Lluvia de confeti que sale disparada desde (x, y). */
export const Confeti: React.FC<{ en: number; x: number; y: number; n?: number; semilla?: string }> = ({ en, x, y, n = 70, semilla = "c" }) => {
  const f = useCurrentFrame();
  const t = (f - en) / 30;
  if (t < 0 || t > 2.4) return null;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const r = (k: string) => random(`${semilla}-${i}-${k}`);
        const vx = (r("x") - 0.5) * 1500;
        const vy = -(700 + r("y") * 1100);
        const px = x + vx * t;
        const py = y + vy * t + 0.5 * 2200 * t * t;
        const giro = r("g") * 900 * t;
        const o = interpolate(t, [1.6, 2.4], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return <div key={i} style={{ position: "absolute", left: px, top: py, width: 16 + r("w") * 14, height: 10, borderRadius: 3, background: COLORES[i % COLORES.length], opacity: o, transform: `rotate(${giro}deg)` }} />;
      })}
    </>
  );
};
