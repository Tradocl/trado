import { useMemo } from "react";

// Confeti liviano, solo CSS: papelitos que caen desde arriba y se van. `mucho` para el 6 de 6.
const COLORES = ["#10B981", "#FBBF24", "#FF6B4A", "#7C3AED", "#38BDF8", "#FFFFFF", "#F472B6"];

export const Confeti = ({ mucho = false }: { mucho?: boolean }) => {
  const piezas = useMemo(
    () =>
      Array.from({ length: mucho ? 90 : 36 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * (mucho ? 1.2 : 0.5),
        dur: 1.8 + Math.random() * 1.6,
        color: COLORES[i % COLORES.length],
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 8,
        giro: Math.random() * 720 - 360,
        deriva: Math.random() * 120 - 60,
        redondo: Math.random() < 0.25,
      })),
    [mucho],
  );
  return (
    <div className="confeti pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {piezas.map((p, i) => (
        <span
          key={i}
          className="confeti-pieza absolute -top-6"
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.redondo ? p.w : p.h,
            background: p.color,
            borderRadius: p.redondo ? "9999px" : "2px",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            ["--giro" as string]: `${p.giro}deg`,
            ["--deriva" as string]: `${p.deriva}px`,
          }}
        />
      ))}
    </div>
  );
};
