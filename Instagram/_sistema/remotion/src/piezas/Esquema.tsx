import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, FUENTE, rebote, suave } from "../marca";
import { Confeti } from "./efectos";

// Cómo funciona Trado, en un esquema: comprador, Trado al medio y vendedor.
// La plata va del comprador a Trado y se queda ahí; el paquete viaja; al llegar
// corren las 72 h para revisar y la plata pasa al vendedor.
// Textos según la app: "Pago retenido en escrow", 72 h desde que llega, el comprador libera.

export type Momentos = { aparece: number; medio: number; paga: number; envia: number; llega: number; revisa: number; libera: number };

const X = { comprador: 190, trado: 540, vendedor: 890 };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const Nodo: React.FC<{ x: number; y: number; k: number; emoji: string; etiqueta: string }> = ({ x, y, k, emoji, etiqueta }) => (
  <div style={{ position: "absolute", left: x - 100, top: y - 100, width: 200, transform: `scale(${k})`, opacity: Math.min(1, k * 1.5), fontFamily: FUENTE }}>
    <div style={{ width: 200, height: 200, borderRadius: 999, background: "rgba(255,255,255,0.16)", border: "6px solid rgba(255,255,255,0.85)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 110 }}>{emoji}</div>
    <div style={{ marginTop: 16, textAlign: "center", color: C.blanco, fontSize: 34, fontWeight: 800, whiteSpace: "nowrap", marginLeft: -60, marginRight: -60 }}>{etiqueta}</div>
  </div>
);

export const Esquema: React.FC<{ y: number; m: Momentos }> = ({ y, m }) => {
  const f = useCurrentFrame();
  const Y = y + 150; // centro de los nodos

  // Trado cae al medio
  const kT = rebote(f, m.medio);
  const lineas = suave(f, m.medio + 6, 12);

  // La plata: comprador -> Trado (se queda) -> vendedor
  const ida = suave(f, m.paga, 18);
  const vuelta = suave(f, m.libera, 18);
  const enViaje = f < m.libera ? ida : vuelta;
  const plataX = f < m.libera ? lerp(X.comprador, X.trado, ida) : lerp(X.trado, X.vendedor, vuelta);
  const plataY = Y - 170 - Math.sin(Math.PI * enViaje) * 60;

  // El paquete: vendedor -> comprador, dando saltitos
  const viaje = interpolate(f, [m.envia, m.llega], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const paqX = lerp(X.vendedor, X.comprador, viaje);
  const paqY = Y + 230 - Math.abs(Math.sin(viaje * Math.PI * 5)) * 34 * (viaje < 1 ? 1 : 0);

  // Las 72 h: el anillo alrededor del comprador se va llenando hasta que libera
  const reloj = interpolate(f, [m.llega, m.libera], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const R = 118, LARGO = 2 * Math.PI * R;

  const estado = f >= m.libera ? { t: "Pago liberado", c: "#047857", b: "#D1FAE5" }
    : f >= m.llega ? { t: "72 h para revisar", c: "#C2410C", b: "#FFEDD5" }
    : f >= m.paga ? { t: "Pago retenido en escrow", c: "#047857", b: "#D1FAE5" } : null;
  const estadoDesde = f >= m.libera ? m.libera : f >= m.llega ? m.llega : m.paga;

  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: FUENTE }}>
      {/* Las uniones: punteadas, pasan por Trado */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {[[X.comprador + 110, X.trado - 125], [X.trado + 125, X.vendedor - 110]].map(([a, b], i) => (
          <line key={i} x1={a} y1={Y} x2={lerp(a, b, lineas)} y2={Y} stroke="rgba(255,255,255,0.8)" strokeWidth={8} strokeDasharray="4 18" strokeLinecap="round" />
        ))}
        {f >= m.llega && (
          <circle cx={X.comprador} cy={Y} r={R} fill="none" stroke={f >= m.libera ? C.verde : C.naranjo} strokeWidth={14} strokeLinecap="round"
            strokeDasharray={LARGO} strokeDashoffset={LARGO * (1 - reloj)} transform={`rotate(-90 ${X.comprador} ${Y})`} />
        )}
      </svg>

      <Nodo x={X.comprador} y={Y} k={rebote(f, m.aparece)} emoji="🙋" etiqueta="Tú · Santiago" />
      <Nodo x={X.vendedor} y={Y} k={rebote(f, m.aparece + 5)} emoji="😎" etiqueta="Vende · Arica" />

      {/* Trado */}
      {f >= m.medio && (
        <div style={{ position: "absolute", left: X.trado - 125, top: Y - 125, width: 250, height: 250, borderRadius: 60, background: C.blanco,
          boxShadow: "0 24px 60px rgba(10,10,40,0.4)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          transform: `translateY(${(1 - kT) * -600}px) rotate(${(1 - kT) * 20}deg)` }}>
          <div style={{ fontSize: 66, fontWeight: 800, color: C.azul, letterSpacing: "-0.04em" }}>trado</div>
          <div style={{ fontSize: 64, marginTop: 4, transform: `scale(${f >= m.paga + 18 ? rebote(f, m.paga + 18) : 0})` }}>🔒</div>
        </div>
      )}

      {/* La plata */}
      {f >= m.paga && (
        <div style={{ position: "absolute", left: plataX, top: plataY, transform: `translate(-50%, -50%) scale(${rebote(f, m.paga)})`,
          background: C.verde, color: C.blanco, fontSize: 44, fontWeight: 800, padding: "14px 28px", borderRadius: 999, whiteSpace: "nowrap",
          boxShadow: "0 12px 30px rgba(10,10,40,0.3)" }}>💵 $180.000</div>
      )}

      {/* El paquete */}
      {f >= m.envia && (
        <div style={{ position: "absolute", left: paqX - 60, top: paqY - 60, fontSize: 120, lineHeight: 1, transform: `scale(${rebote(f, m.envia)})` }}>📦</div>
      )}
      {f >= m.revisa && (
        <div style={{ position: "absolute", left: X.comprador + 20, top: Y + 150, fontSize: 90, transform: `scale(${rebote(f, m.revisa)}) rotate(-12deg)` }}>🔍</div>
      )}
      {f >= m.revisa + 12 && (
        <div style={{ position: "absolute", left: X.comprador - 110, top: Y + 175, width: 70, height: 70, borderRadius: 999, background: C.verde, display: "flex", alignItems: "center", justifyContent: "center",
          transform: `scale(${rebote(f, m.revisa + 12)})`, boxShadow: "0 8px 20px rgba(0,0,0,0.25)" }}>
          <svg width={40} height={40} viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
      )}

      {/* Estado, igual que en la app */}
      {estado && (
        <div style={{ position: "absolute", top: Y + 380, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <div style={{ fontSize: 50, fontWeight: 800, color: estado.c, background: estado.b, padding: "16px 40px", borderRadius: 999,
            boxShadow: "0 14px 34px rgba(10,10,40,0.3)", transform: `scale(${rebote(f, estadoDesde)})` }}>{estado.t}</div>
        </div>
      )}

      <Confeti en={m.libera + 16} x={X.vendedor} y={Y} semilla="libera" />
    </div>
  );
};
