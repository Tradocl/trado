import React from "react";
import { C, FUENTE } from "../marca";

/** Píldora blanca con texto, para nombres de lugar y etiquetas. */
export const Pildora: React.FC<{ texto: string; style?: React.CSSProperties; color?: string; fondo?: string }> = ({ texto, style, color = C.tinta, fondo = C.blanco }) => (
  <div style={{ position: "absolute", fontFamily: FUENTE, fontWeight: 800, fontSize: 40, color, background: fondo, padding: "16px 34px", borderRadius: 999, boxShadow: "0 10px 30px rgba(10,10,40,0.25)", ...style }}>
    {texto}
  </div>
);
