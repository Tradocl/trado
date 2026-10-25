import { interpolate, spring } from "remotion";

export const W = 1080, H = 1920, FPS = 30;

// Mismos colores que reels/motor.py
export const C = {
  azul: "#2230C2",
  medio: "#4B35D6",
  violeta: "#7C3AED",
  verde: "#10B981",
  naranjo: "#FF6B4A",
  tinta: "#0F1424",
  blanco: "#FFFFFF",
  gris: "#6E7487",
  linea: "#E8EAF2",
  rojo: "#E83E3E",
};

export const FUENTE = "Plus Jakarta Sans";

export const DEGRADADO = `linear-gradient(135deg, ${C.azul} 0%, ${C.medio} 55%, ${C.violeta} 100%)`;
export const OSCURO = "linear-gradient(180deg, #0F1424 0%, #19203C 100%)";

// Instagram tapa ~220 px arriba y ~420 px abajo: lo importante entre estas dos.
export const ZONA_SEGURA = { arriba: 240, abajo: 1500 };

/** Entrada con rebote (0 → 1), como ease_back de motor.py. */
export const rebote = (frame: number, desde: number, fps = FPS) =>
  spring({ frame: frame - desde, fps, config: { damping: 12, stiffness: 160, mass: 0.7 } });

/** Entrada suave (0 → 1) en `dur` cuadros. */
export const suave = (frame: number, desde: number, dur = 12) =>
  interpolate(frame, [desde, desde + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - (1 - t) ** 3,
  });

export const s = (seg: number) => Math.round(seg * FPS);
