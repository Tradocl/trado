import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, FUENTE, rebote, suave } from "../marca";

// Feed de publicaciones genérico (no copia la interfaz ni el logo de ninguna app):
// baja, se detiene en la que buscabas y va marcando precio y ubicación.

type Item = { emoji: string; fondo: string; titulo: string; precio: string; lugar: string };

const FEED: Item[] = [
  { emoji: "🛋️", fondo: "#E9E3FF", titulo: "Sillón 3 cuerpos", precio: "$95.000", lugar: "Rancagua" },
  { emoji: "🎸", fondo: "#FFE8D6", titulo: "Guitarra electroacústica", precio: "$140.000", lugar: "Calama" },
  { emoji: "🎮", fondo: "#DDF3FF", titulo: "Consola + 2 controles", precio: "$210.000", lugar: "Castro" },
  { emoji: "📷", fondo: "#E6F7EC", titulo: "Cámara réflex con lente", precio: "$260.000", lugar: "Valdivia" },
];
const BUSCADA: Item = { emoji: "🚲", fondo: "#D8F5E8", titulo: "Bicicleta aro 29, como nueva", precio: "$180.000", lugar: "Arica" };

const ALTO_TARJETA = 300;
const SEP = 28;

const Tarjeta: React.FC<{ item: Item; destacada?: boolean; f?: number; marcas?: { precio: number; lugar: number; duda: number } }> = ({ item, destacada, f = 0, marcas }) => {
  const kPrecio = marcas ? suave(f, marcas.precio, 8) : 0;
  const kLugar = marcas ? rebote(f, marcas.lugar) : 0;
  return (
    <div style={{ height: ALTO_TARJETA, display: "flex", gap: 30, background: C.blanco, borderRadius: 34, padding: 26, boxShadow: "0 18px 40px rgba(10,10,40,0.18)", fontFamily: FUENTE, position: "relative" }}>
      <div style={{ width: 248, borderRadius: 24, background: item.fondo, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 130 }}>{item.emoji}</div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
        <div style={{ position: "relative", isolation: "isolate", alignSelf: "flex-start", fontSize: 58, fontWeight: 800, color: C.tinta, letterSpacing: "-0.02em" }}>
          {item.precio}
          {destacada && <div style={{ position: "absolute", left: -10, right: -10, bottom: 2, height: 22, borderRadius: 999, background: C.verde, opacity: 0.45, transform: `scaleX(${kPrecio})`, transformOrigin: "left", zIndex: -1 }} />}
        </div>
        <div style={{ fontSize: 34, fontWeight: 600, color: "#3A4160", lineHeight: 1.2 }}>{item.titulo}</div>
        <div style={{ alignSelf: "flex-start", fontSize: 32, fontWeight: 700, borderRadius: 999,
          color: destacada && kLugar > 0.01 ? C.blanco : "#6B7290",
          background: destacada && kLugar > 0.01 ? C.naranjo : "transparent",
          padding: destacada && kLugar > 0.01 ? "6px 20px" : 0,
          transform: destacada ? `scale(${1 + 0.35 * kLugar})` : undefined, transformOrigin: "left center" }}>
          📍 {item.lugar}
        </div>
      </div>
      {destacada && marcas && (
        <div style={{ position: "absolute", right: 40, top: 40, fontSize: 130, fontWeight: 800, color: C.naranjo, transform: `scale(${rebote(f, marcas.duda)}) rotate(12deg)` }}>?</div>
      )}
    </div>
  );
};

/** `marcas`: cuadros (relativos a la escena) en que se marcan precio, ubicación y la duda. */
export const Publicacion: React.FC<{ y: number; alto: number; paraEn: number; marcas: { precio: number; lugar: number; duda: number } }> = ({ y, alto, paraEn, marcas }) => {
  const f = useCurrentFrame();
  const items = [...FEED, ...FEED.slice(0, 2)];
  const paso = ALTO_TARJETA + SEP;
  // La buscada queda al final de la lista; el scroll frena dejándola abajo, justo sobre tu cabeza
  const final = items.length * paso - (alto - ALTO_TARJETA - 50);
  const avance = interpolate(f, [0, paraEn], [0, 1], { extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) });
  const scroll = avance * final;
  // Al frenar, la buscada se acerca y el resto se apaga
  const foco = suave(f, paraEn, 10);
  return (
    <div style={{ position: "absolute", left: 30, right: 30, top: y, height: alto, overflow: "hidden", padding: "0 40px" }}>
      <div style={{ transform: `translateY(${-scroll}px)`, display: "flex", flexDirection: "column", gap: SEP }}>
        {items.map((it, i) => <div key={i} style={{ opacity: 0.85 - 0.6 * foco }}><Tarjeta item={it} /></div>)}
        <div style={{ transform: `scale(${1 + 0.06 * foco})` }}><Tarjeta item={BUSCADA} destacada f={f} marcas={marcas} /></div>
      </div>
    </div>
  );
};
