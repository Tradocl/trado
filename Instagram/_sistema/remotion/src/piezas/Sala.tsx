import React from "react";
import { useCurrentFrame } from "remotion";
import { C, FUENTE, rebote, suave } from "../marca";

// Textos según la app: transaction-labels.ts ("Pago retenido en escrow") y el
// flujo de envío de auto-release-escrow (72 h para revisar desde "recibido").
export type Paso = { texto: string; en: number };

/** Tarjeta de sala de Trado con los pasos que se van marcando. */
export const Sala: React.FC<{
  y: number;
  desde: number;
  producto: string;
  monto: string;
  estado: { texto: string; color: string; fondo: string; en: number }[];
  pasos: Paso[];
}> = ({ y, desde, producto, monto, estado, pasos }) => {
  const f = useCurrentFrame();
  const k = rebote(f, desde);
  const e = [...estado].reverse().find((x) => f >= x.en) ?? estado[0];
  return (
    <div style={{ position: "absolute", top: y, left: 90, right: 90, background: C.blanco, borderRadius: 44, padding: "48px 52px", fontFamily: FUENTE, color: C.tinta,
      boxShadow: "0 30px 80px rgba(10,10,50,0.35)", transform: `translateY(${(1 - k) * 120}px) scale(${0.85 + 0.15 * k})`, opacity: Math.min(1, k * 1.5) }}>
      <div style={{ fontSize: 32, fontWeight: 600, color: C.gris }}>Sala · {producto} · Por envío</div>
      <div style={{ fontSize: 108, fontWeight: 800, letterSpacing: "-0.03em", margin: "6px 0 18px" }}>{monto}</div>
      <div style={{ display: "inline-block", fontSize: 34, fontWeight: 800, color: e.color, background: e.fondo, padding: "12px 26px", borderRadius: 999 }}>{e.texto}</div>
      <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 20 }}>
        {pasos.map((p, i) => {
          const hecho = suave(f, p.en, 8);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 22, fontSize: 38, fontWeight: hecho > 0.5 ? 800 : 600, color: hecho > 0.5 ? C.tinta : "#A3A8B8" }}>
              <div style={{ width: 46, height: 46, borderRadius: 999, flexShrink: 0, border: `4px solid ${hecho > 0.5 ? C.verde : C.linea}`, background: hecho > 0.5 ? C.verde : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${1 + 0.25 * Math.sin(Math.PI * hecho)})` }}>
                {hecho > 0.5 && (
                  <svg width={26} height={26} viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" /></svg>
                )}
              </div>
              {p.texto}
            </div>
          );
        })}
      </div>
    </div>
  );
};
