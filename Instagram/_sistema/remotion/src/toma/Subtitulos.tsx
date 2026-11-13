import React from "react";
import { useCurrentFrame } from "remotion";
import { C, FUENTE } from "../marca";

/** Subtítulo con los tiempos reales de la voz (salen de faster-whisper).
 *  `grupos`: frases cortas que se muestran de a una, cada palabra con el segundo en que empieza. */
export const SubtituloVoz: React.FC<{ grupos: [string, number][][]; y?: number }> = ({ grupos, y = 1180 }) => {
  const f = useCurrentFrame();
  const t = f / 30;
  let g = -1;
  grupos.forEach((grupo, i) => { if (grupo[0][1] <= t) g = i; });
  if (g < 0) return null;
  return (
    <div style={{ position: "absolute", top: y, left: 60, right: 60, textAlign: "center", fontFamily: FUENTE, fontWeight: 800, fontSize: 76, lineHeight: 1.2, color: C.blanco, textShadow: "0 4px 18px rgba(0,0,0,0.6)" }}>
      {grupos[g].map(([p, en], i) => {
        const dicha = en <= t;
        const siguiente = grupos[g][i + 1];
        const actual = dicha && (!siguiente || siguiente[1] > t);
        return (
          <span key={i} style={{ display: "inline-block", margin: "0 0.04em", padding: "0 0.1em", borderRadius: 14, background: actual ? C.verde : "transparent", opacity: dicha ? 1 : 0.4 }}>
            {p}
          </span>
        );
      })}
    </div>
  );
};
