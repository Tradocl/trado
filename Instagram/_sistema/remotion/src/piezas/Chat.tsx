import React from "react";
import { useCurrentFrame } from "remotion";
import { C, FUENTE, rebote, suave } from "../marca";

export type Mensaje = { de: "yo" | "otro"; texto: string; en: number; visto?: number };

/** Chat genérico (sin marcas ajenas): burbujas que entran con rebote. */
export const Chat: React.FC<{ mensajes: Mensaje[]; y: number; titulo?: string }> = ({ mensajes, y, titulo }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", top: y, left: 60, right: 60, fontFamily: FUENTE, display: "flex", flexDirection: "column", gap: 22 }}>
      {titulo && (
        <div style={{ display: "flex", alignItems: "center", gap: 18, color: C.blanco, opacity: 0.85, fontSize: 34, fontWeight: 700, marginBottom: 6 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
            {titulo.slice(0, 1)}
          </div>
          {titulo}
        </div>
      )}
      {mensajes.map((m, i) => {
        const k = rebote(f, m.en);
        if (f < m.en) return null;
        const yo = m.de === "yo";
        return (
          <div key={i} style={{ alignSelf: yo ? "flex-end" : "flex-start", maxWidth: 760, transform: `scale(${0.6 + 0.4 * k})`, transformOrigin: yo ? "right bottom" : "left bottom", opacity: Math.min(1, k * 1.4),
            background: yo ? C.medio : "#252C48", color: C.blanco, fontSize: 46, fontWeight: 700, lineHeight: 1.25, padding: "26px 34px",
            position: "relative", borderRadius: 36, borderBottomRightRadius: yo ? 10 : 36, borderBottomLeftRadius: yo ? 36 : 10, boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
            {m.texto}
            {/* "Visto" sin respuesta, bajo la burbuja */}
            {m.visto !== undefined && f >= m.visto && (
              <div style={{ position: "absolute", right: 8, bottom: -50, fontSize: 30, fontWeight: 700, color: C.blanco, opacity: 0.8 * suave(f, m.visto, 6) }}>Visto ✓✓</div>
            )}
          </div>
        );
      })}
    </div>
  );
};
