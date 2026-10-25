import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// Paisajes de Chile dibujados en vectores, planos y en la paleta cálida de la
// marca. Son ilustración a propósito: se nota que es un "viaje" de juego, no
// una foto falsa. Cada uno se mueve un poco (parallax) para que no se vea quieto.
export type Region = "desierto" | "playa" | "cordillera" | "sur";

export const Postal: React.FC<{ region: Region }> = ({ region }) => {
  const f = useCurrentFrame();
  const Dib = { desierto: Desierto, playa: Playa, cordillera: Cordillera, sur: Sur }[region];
  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <Dib f={f} />
      </svg>
    </AbsoluteFill>
  );
};

type P = { f: number };

const Cielo: React.FC<{ id: string; de: string; a: string }> = ({ id, de, a }) => (
  <>
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={de} />
        <stop offset="1" stopColor={a} />
      </linearGradient>
    </defs>
    <rect width={1080} height={1920} fill={`url(#${id})`} />
  </>
);

// Calama / Atacama: atardecer, el Licancabur al fondo, dunas y un cardón.
const Desierto: React.FC<P> = ({ f }) => (
  <g>
    <Cielo id="c-des" de="#FF9A62" a="#FFD9A0" />
    <circle cx={760} cy={620 + f * 0.3} r={150} fill="#FFF1C9" opacity={0.95} />
    <polygon points="380,1080 640,700 900,1080" fill="#B4637A" />
    <polygon points="575,795 640,700 705,795 672,780 640,800 608,782" fill="#F6E7EA" />
    <path d={`M-40 1150 Q ${300 - f * 0.4} 1000 620 1130 T 1120 1100 V1920 H-40Z`} fill="#E89A5B" />
    <path d={`M-40 1380 Q ${420 + f * 0.5} 1200 760 1360 T 1120 1320 V1920 H-40Z`} fill="#D9783F" />
    <path d={`M-40 1620 Q 300 1480 ${640 - f * 0.6} 1600 T 1120 1560 V1920 H-40Z`} fill="#C2612F" />
    <g transform="translate(170,1330)" fill="#5E7D3A">
      <rect x={-18} y={-210} width={36} height={230} rx={18} />
      <rect x={-78} y={-150} width={30} height={110} rx={15} />
      <rect x={-78} y={-60} width={70} height={28} rx={14} />
      <rect x={48} y={-180} width={30} height={120} rx={15} />
      <rect x={8} y={-80} width={70} height={28} rx={14} />
    </g>
  </g>
);

// La Serena: mar, olas que se mueven y el faro.
const Playa: React.FC<P> = ({ f }) => {
  const ola = (y: number, amp: number, fase: number, col: string) => {
    let d = `M-40 ${y}`;
    for (let x = -40; x <= 1120; x += 60) d += ` L${x} ${y + Math.sin(x / 90 + f / 8 + fase) * amp}`;
    return <path d={`${d} V1920 H-40Z`} fill={col} />;
  };
  return (
    <g>
      <Cielo id="c-pla" de="#7CC8F2" a="#D9F1FF" />
      <circle cx={260} cy={560} r={120} fill="#FFF3B8" />
      <ellipse cx={720 + f * 0.8} cy={470} rx={150} ry={46} fill="#fff" opacity={0.9} />
      {ola(1020, 10, 0, "#2E8BC9")}
      {ola(1110, 12, 1.4, "#3FA2DC")}
      {ola(1200, 14, 2.6, "#62BCE8")}
      <path d="M-40 1330 Q 540 1250 1120 1340 V1920 H-40Z" fill="#F2D59A" />
      <path d="M-40 1520 Q 540 1440 1120 1530 V1920 H-40Z" fill="#E9C47F" />
      <g transform="translate(860,1300)">
        <rect x={-38} y={-380} width={76} height={380} fill="#FFFFFF" />
        <rect x={-38} y={-300} width={76} height={60} fill="#E83E3E" />
        <rect x={-38} y={-160} width={76} height={60} fill="#E83E3E" />
        <rect x={-54} y={-440} width={108} height={60} rx={8} fill="#E83E3E" />
        <rect x={-30} y={-428} width={60} height={36} fill="#FFF3B8" opacity={0.6 + 0.4 * Math.sin(f / 5)} />
        <polygon points="-62,-440 0,-500 62,-440" fill="#8B1E1E" />
      </g>
    </g>
  );
};

// Cordillera: cerros nevados en capas.
const Cordillera: React.FC<P> = ({ f }) => (
  <g>
    <Cielo id="c-cor" de="#5B8FE0" a="#CFE4FF" />
    <ellipse cx={300 - f * 0.6} cy={420} rx={170} ry={50} fill="#fff" opacity={0.85} />
    <polygon points="-80,1200 260,640 600,1200" fill="#6E7FB8" />
    <polygon points="190,755 260,640 330,755 300,740 262,770 222,742" fill="#fff" />
    <polygon points="300,1240 720,560 1160,1240" fill="#56639C" />
    <polygon points="630,705 720,560 810,705 770,690 722,725 672,690" fill="#fff" />
    <path d={`M-40 1260 Q ${300 + f * 0.4} 1160 600 1250 T 1120 1230 V1920 H-40Z`} fill="#6FAE5C" />
    <path d={`M-40 1460 Q 400 1340 ${760 - f * 0.5} 1450 T 1120 1420 V1920 H-40Z`} fill="#4F9446" />
    <path d="M-40 1640 Q 540 1560 1120 1650 V1920 H-40Z" fill="#3D7A38" />
  </g>
);

// Chiloé: palafitos de colores sobre el agua, bosque y lluvia.
const Sur: React.FC<P> = ({ f }) => {
  const casas = ["#E83E3E", "#FFC23D", "#3FA2DC", "#7CC46A", "#B56CE0"];
  return (
    <g>
      <Cielo id="c-sur" de="#8FA6B8" a="#D5DFE6" />
      {Array.from({ length: 9 }).map((_, i) => (
        <polygon key={i} points={`${i * 140 - 40},1000 ${i * 140 + 40},720 ${i * 140 + 120},1000`} fill={i % 2 ? "#2F5D46" : "#3B6E53"} />
      ))}
      <rect y={1000} width={1080} height={920} fill="#4F7F92" />
      {casas.map((c, i) => (
        <g key={i} transform={`translate(${70 + i * 200},1010)`}>
          {[20, 70, 120].map((x) => <rect key={x} x={x} y={130} width={10} height={170} fill="#5A4636" />)}
          <rect x={0} y={0} width={150} height={140} fill={c} />
          <polygon points="-12,4 75,-70 162,4" fill="#3A2F2A" />
          <rect x={52} y={40} width={46} height={50} fill="#FFF3D1" />
        </g>
      ))}
      <rect y={1310} width={1080} height={610} fill="#3F6E80" />
      {Array.from({ length: 6 }).map((_, i) => (
        <rect key={i} x={60 + i * 170 + ((f * 2) % 40)} y={1360 + i * 60} width={120} height={8} rx={4} fill="#fff" opacity={0.25} />
      ))}
      {Array.from({ length: 70 }).map((_, i) => {
        const x = (i * 157) % 1100, y = ((i * 263 + f * 38) % 2000) - 80;
        return <line key={i} x1={x} y1={y} x2={x - 14} y2={y + 60} stroke="#fff" strokeWidth={4} opacity={0.35} />;
      })}
    </g>
  );
};
