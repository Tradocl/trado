import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { CHILE_ALTO, CHILE_ANCHO, CHILE_PATH, CIUDADES, Ciudad } from "../chile";
import { C, FUENTE, suave } from "../marca";

type Ruta = { de: Ciudad; a: Ciudad; desde: number; dur: number; color?: string; dudosa?: boolean };

/** Chile continental que se dibuja solo, con ciudades y paquetes viajando entre ellas.
 *  `escala` 1 = 420×1640 px. `dudosa` dibuja la ruta punteada con un "?" en vez del paquete. */
export const Mapa: React.FC<{
  x: number;
  y: number;
  escala?: number;
  desde?: number;
  ciudades?: Ciudad[];
  rutas?: Ruta[];
  nombres?: boolean;
  opacidad?: number;
}> = ({ x, y, escala = 1, desde = 0, ciudades = [], rutas = [], nombres = true, opacidad = 1 }) => {
  const f = useCurrentFrame();
  const trazo = suave(f, desde, 36);
  const relleno = suave(f, desde + 20, 20);
  const LARGO = 9000;
  return (
    <svg
      width={CHILE_ANCHO * escala + 400}
      height={CHILE_ALTO * escala}
      viewBox={`-200 0 ${CHILE_ANCHO + 400 / escala} ${CHILE_ALTO}`}
      style={{ position: "absolute", left: x - 200, top: y, opacity: opacidad, overflow: "visible" }}
    >
      <path d={CHILE_PATH} fill={`rgba(255,255,255,${0.16 * relleno})`} stroke="rgba(255,255,255,0.9)" strokeWidth={3 / escala}
        strokeDasharray={LARGO} strokeDashoffset={LARGO * (1 - trazo)} strokeLinejoin="round" />
      {rutas.map((r, i) => {
        const [x0, y0] = CIUDADES[r.de];
        const [x1, y1] = CIUDADES[r.a];
        // Curva hacia el mar (a la izquierda), para que no corte el país
        const cx = Math.min(x0, x1) - 260, cy = (y0 + y1) / 2;
        const d = `M${x0},${y0} Q${cx},${cy} ${x1},${y1}`;
        const p = interpolate(f, [r.desde, r.desde + r.dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const t = 1 - (1 - p) ** 2;
        const bx = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t ** 2 * x1;
        const by = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t ** 2 * y1;
        const col = r.color ?? C.verde;
        return (
          <g key={i} opacity={p > 0 ? 1 : 0}>
            {r.dudosa ? (
              // Ruta de la que nadie se fía: punteada, aparece de a poco
              <path d={d} fill="none" stroke={col} strokeWidth={6 / escala} strokeDasharray={`${18 / escala} ${16 / escala}`} strokeLinecap="round" opacity={0.9 * p} />
            ) : (
              // Ruta segura: línea continua que avanza detrás del paquete
              <path d={d} fill="none" stroke={col} strokeWidth={6 / escala} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - t} />
            )}
            {r.dudosa ? (
              <text x={cx + 40} y={cy} fontFamily={FUENTE} fontWeight={800} fontSize={150 / escala} fill={C.naranjo} textAnchor="middle" opacity={suave(f, r.desde + 6, 10)}>?</text>
            ) : (
              <g transform={`translate(${bx},${by}) scale(${1 / escala})`}>
                <Paquete />
              </g>
            )}
          </g>
        );
      })}
      {ciudades.map((c, i) => {
        const [cx, cy] = CIUDADES[c];
        const k = suave(f, desde + 30 + i * 4, 10);
        const pulso = 1 + 0.25 * Math.max(0, Math.sin((f - desde) / 6));
        return (
          <g key={c} transform={`translate(${cx},${cy}) scale(${k / escala})`}>
            <circle r={26 * pulso} fill={C.verde} opacity={0.25} />
            <circle r={14} fill={C.verde} stroke={C.blanco} strokeWidth={5} />
            {nombres && (
              <text x={36} y={14} fontFamily={FUENTE} fontWeight={800} fontSize={40} fill={C.blanco}>{NOMBRES[c]}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

const Paquete: React.FC = () => (
  <g transform="translate(-34,-34)">
    <rect x={0} y={10} width={68} height={58} rx={8} fill="#C98B4E" />
    <polygon points="0,10 34,-6 68,10 34,24" fill="#E0A869" />
    <rect x={28} y={14} width={12} height={54} fill="#F3D9A9" opacity={0.8} />
  </g>
);

export const NOMBRES: Record<Ciudad, string> = {
  arica: "Arica",
  calama: "Calama",
  antofagasta: "Antofagasta",
  laSerena: "La Serena",
  valparaiso: "Valparaíso",
  santiago: "Santiago",
  concepcion: "Concepción",
  temuco: "Temuco",
  puertoMontt: "Puerto Montt",
  castro: "Castro",
  coyhaique: "Coyhaique",
  puntaArenas: "Punta Arenas",
};
