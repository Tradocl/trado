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

/** Una piedra dibujada: el emoji 🪨 de Windows sale como un cristal blanco y no se lee como piedra.
 *  Gris tierra con contorno oscuro, cara de arriba iluminada, grietas y pintas, para que se note
 *  tanto sobre la pared clara como sobre el azul. */
export const Piedra: React.FC<{ ancho?: number; style?: React.CSSProperties }> = ({ ancho = 260, style }) => {
  const id = React.useId().replace(/:/g, "");
  return (
    <svg width={ancho} height={ancho * 0.8} viewBox="0 0 200 160" style={{ overflow: "visible", filter: "drop-shadow(0 18px 22px rgba(10,10,30,0.45))", ...style }}>
      <defs>
        <linearGradient id={`${id}c`} x1="0.15" y1="0.1" x2="0.85" y2="1">
          <stop offset="0" stopColor="#A49C91" />
          <stop offset="0.55" stopColor="#7C746A" />
          <stop offset="1" stopColor="#4F4943" />
        </linearGradient>
        <clipPath id={`${id}r`}>
          <path d={ROCA} />
        </clipPath>
      </defs>
      <path d={ROCA} fill={`url(#${id}c)`} />
      <g clipPath={`url(#${id}r)`}>
        {/* Cara de arriba, más clara: le da volumen */}
        <path d="M44 66 C62 40 104 26 136 34 C158 40 176 56 180 74 C150 84 110 88 74 84 C60 82 50 76 44 66 Z" fill="#C9C1B5" opacity={0.55} />
        {/* Sombra de abajo */}
        <ellipse cx={120} cy={168} rx={110} ry={44} fill="#2E2A26" opacity={0.45} />
        {/* Brillo */}
        <ellipse cx={86} cy={52} rx={26} ry={9} transform="rotate(-18 86 52)" fill="#FFFFFF" opacity={0.5} />
        {/* Pintas */}
        {[[62, 104, 4], [96, 118, 3], [146, 106, 4.5], [130, 132, 3], [78, 134, 3.5], [160, 84, 3], [110, 60, 2.5]].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill={i % 3 === 2 ? "#E4DDD2" : "#3B3631"} opacity={i % 3 === 2 ? 0.7 : 0.45} />
        ))}
      </g>
      {/* Grietas */}
      <path d="M126 86 L134 104 L126 120" fill="none" stroke="#3B3631" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
      <path d="M66 92 L80 102" fill="none" stroke="#3B3631" strokeWidth={3.5} strokeLinecap="round" opacity={0.6} />
      <path d={ROCA} fill="none" stroke="#35302B" strokeWidth={6} strokeLinejoin="round" />
    </svg>
  );
};
const ROCA = "M26 112 C14 88 24 58 52 46 C68 26 104 16 130 26 C158 30 184 52 186 84 C192 112 174 140 142 148 C112 158 62 156 40 142 C32 134 28 124 26 112 Z";

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
