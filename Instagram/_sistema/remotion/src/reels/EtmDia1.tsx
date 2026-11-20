import React from "react";
import { AbsoluteFill, Audio, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { C, DEGRADADO, FPS, FUENTE, rebote, suave } from "../marca";
import { Confeti, Destello, Palabra, Sfx } from "../piezas/efectos";

/**
 * «EtMday día 1»: resumen del primer día del stand (19 nov 2026) con rock.
 * Fotos y clips del celular (por WhatsApp) en public/material/etmday-dia1/ (fuera de git):
 *   fotos/F1..F19.jpeg y v/V1..V12.mp4 (ya rotados a 1080 de ancho y 30 fps).
 * Música: public/sfx/musica_rock.wav (scripts/recursos/rock.py), 140 BPM. Cada corte cae en
 * un pulso; el golpe final de la canción cae en el pulso 64, justo cuando aparece el logo.
 */

const CARPETA = "material/etmday-dia1";
const PULSO = 60 / 140;
const p = (n: number) => Math.round(n * PULSO * FPS); // pulso → cuadro
const foto = (n: number) => staticFile(`${CARPETA}/fotos/F${n}.jpeg`);
const clip = (n: number) => staticFile(`${CARPETA}/v/V${n}.mp4`);

// Entrevista (V8): dos tramos, sin la pausa del medio
const VOZ = [
  { desde: 3.58, hasta: 6.82 },
  { desde: 7.3, hasta: 11.9 },
];
const VOZ_LARGO = VOZ.reduce((a, t) => a + Math.round((t.hasta - t.desde) * FPS), 0);
// Subtítulos: lo que se dice, con el segundo del clip en que empieza cada palabra
const SUBS: [number, string][] = [
  [3.62, "Tú"], [4.28, "concretas"], [5.2, "tu"], [5.36, "venta"], [5.66, "en"], [5.78, "Marketplace"], [6.28, "o"], [6.4, "en"], [6.48, "Instagram"],
  [7.34, "y"], [7.74, "le"], [8.02, "mandas"], [8.28, "un"], [8.44, "link"], [8.7, "de"], [8.86, "la"], [8.98, "sala"], [9.18, "de"], [9.3, "pago"], [9.5, "de"], [9.62, "Trado,"],
  [10.08, "que"], [10.2, "básicamente"], [10.58, "es"], [10.82, "una"], [10.9, "sala"], [11.1, "de"], [11.2, "pago"], [11.38, "segura."],
];
const FRASES = [[0, 9], [9, 21], [21, 29]]; // índices de SUBS por frase en pantalla

// Escenas en pulsos (4 por compás)
const E = {
  gancho: [0, 8],
  reglas: [8, 16],
  tiros: [16, 22],
  ganadores: [22, 30],
  entrevista: [30, 50], // la voz dura VOZ_LARGO; el resto sigue el clip sin sonido
  stand: [50, 58],
  manana: [58, 64],
  logo: [64, 73],
} as const;
export const DURACION = p(E.logo[1]);

// ── Piezas de esta pieza ───────────────────────────────────────────────────

/** Foto o clip a pantalla completa con un acercamiento lento (Ken Burns). */
const Fondo: React.FC<{ foto?: number; clip?: number; desde?: number; largo: number; zoom?: [number, number]; origen?: string; oscuro?: number; sonido?: boolean }> =
  ({ foto: f, clip: c, desde = 0, largo, zoom = [1.05, 1.18], origen = "50% 45%", oscuro = 0.25, sonido = false }) => {
    const fr = useCurrentFrame();
    const z = interpolate(fr, [0, largo], zoom, { extrapolateRight: "clamp" });
    const estilo: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover", transform: `scale(${z})`, transformOrigin: origen };
    return (
      <AbsoluteFill style={{ background: C.tinta, overflow: "hidden" }}>
        {f !== undefined && <Img src={foto(f)} style={estilo} />}
        {c !== undefined && <OffthreadVideo src={clip(c)} muted={!sonido} trimBefore={Math.round(desde * FPS)} style={estilo} />}
        <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(10,12,30,${oscuro + 0.25}) 0%, rgba(10,12,30,${oscuro}) 35%, rgba(10,12,30,${oscuro}) 65%, rgba(10,12,30,${oscuro + 0.3}) 100%)` }} />
      </AbsoluteFill>
    );
  };

/** Foto apaisada: se ve entera al medio, con la misma foto borrosa de fondo. */
const FotoAncha: React.FC<{ n: number; largo: number }> = ({ n, largo }) => {
  const fr = useCurrentFrame();
  const z = interpolate(fr, [0, largo], [1, 1.08]);
  return (
    <AbsoluteFill style={{ background: C.tinta, overflow: "hidden" }}>
      <Img src={foto(n)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(40px) brightness(0.55)", transform: "scale(1.2)" }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Img src={foto(n)} style={{ width: 1080, transform: `scale(${z}) rotate(-2deg)`, borderRadius: 28, boxShadow: "0 30px 80px rgba(0,0,0,0.5)", border: "10px solid white" }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Etiqueta chica arriba (antetítulo). */
const Pildora: React.FC<{ texto: string; en?: number; y?: number; fondo?: string; color?: string }> = ({ texto, en = 0, y = 270, fondo = C.blanco, color = C.tinta }) => {
  const fr = useCurrentFrame();
  if (fr < en) return null;
  const k = rebote(fr, en);
  return (
    <div style={{ position: "absolute", top: y, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div style={{ fontFamily: FUENTE, fontWeight: 800, fontSize: 46, letterSpacing: "0.02em", textTransform: "uppercase", color, background: fondo,
        padding: "14px 34px", borderRadius: 999, transform: `scale(${k})`, boxShadow: "0 12px 30px rgba(0,0,0,0.3)" }}>{texto}</div>
    </div>
  );
};

/** Sello que cae de golpe, girado, como timbre. */
const Sello: React.FC<{ texto: string; en?: number; y: number; fondo: string; giro?: number; size?: number }> = ({ texto, en = 0, y, fondo, giro = -8, size = 120 }) => {
  const fr = useCurrentFrame();
  if (fr < en) return null;
  const k = rebote(fr, en);
  return (
    <div style={{ position: "absolute", top: y, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div style={{ fontFamily: FUENTE, fontWeight: 800, fontSize: size, lineHeight: 1, color: C.blanco, background: fondo, padding: "0.18em 0.42em",
        borderRadius: 24, border: "8px solid white", transform: `scale(${2.4 - 1.4 * k}) rotate(${giro}deg)`, opacity: Math.min(1, k * 3),
        boxShadow: "0 20px 60px rgba(0,0,0,0.45)", letterSpacing: "-0.03em" }}>{texto}</div>
    </div>
  );
};

// ── Escenas ─────────────────────────────────────────────────────────────────

const Gancho: React.FC = () => (
  <AbsoluteFill>
    <Fondo clip={9} desde={0} largo={p(8)} zoom={[1.25, 1.05]} oscuro={0.35} />
    <Palabra texto="DÍA 1" en={0} y={520} size={260} giro={-4} />
    <Sfx nombre="golpe" en={0} vol={0.7} />
    <Palabra texto="EtMday" en={p(2)} y={800} size={170} color="#FFD23F" giro={3} />
    <Sfx nombre="golpe" en={p(2)} vol={0.6} />
    <Pildora texto="Zona Roja · Fintech" en={p(4)} y={1080} />
    <Sfx nombre="pop" en={p(4)} vol={0.5} />
    <Palabra texto={"y la\nrompimos"} en={p(6)} y={1200} size={120} giro={-3} />
    <Sfx nombre="golpe" en={p(6)} vol={0.6} />
  </AbsoluteFill>
);

const Reglas: React.FC = () => (
  <AbsoluteFill>
    <Fondo clip={10} desde={0} largo={p(8)} zoom={[1.1, 1.2]} origen="60% 55%" oscuro={0.45} />
    <Pildora texto="El juego" y={270} />
    <Palabra texto="2 DADOS" en={0} y={420} size={150} giro={-3} />
    <Palabra texto="5 caras de estafa" en={p(2)} y={640} size={92} fondo={C.rojo} giro={2} />
    <Sfx nombre="tachon" en={p(2)} vol={0.5} />
    <Palabra texto="1 cara trado" en={p(4)} y={820} size={92} fondo={C.azul} giro={-2} />
    <Sfx nombre="pop_agudo" en={p(4)} vol={0.5} />
    <Palabra texto={"¿Doble trado?\nTE LLEVAS PREMIO"} en={p(6)} y={1040} size={96} color="#FFD23F" giro={-2} />
    <Sfx nombre="brillo" en={p(6)} vol={0.5} />
  </AbsoluteFill>
);

const TIROS = [
  { clip: 1, desde: 0.5 },
  { clip: 6, desde: 1.0 },
  { clip: 12, desde: 3.4 },
];
const Tiros: React.FC = () => (
  <AbsoluteFill>
    {TIROS.map((t, i) => (
      <Sequence key={i} from={p(2 * i)} durationInFrames={p(2)}>
        <Fondo clip={t.clip} desde={t.desde} largo={p(2)} zoom={[1.15, 1.3]} oscuro={0.15} />
        <Palabra texto="¡TIRA!" en={0} y={1180} size={170} color="#FFD23F" giro={i % 2 ? 6 : -6} />
        <Sfx nombre="whoosh_baja" en={0} vol={0.4} />
      </Sequence>
    ))}
  </AbsoluteFill>
);

const GANADORES = [1, 2, 3, 14];
const Ganadores: React.FC = () => (
  <AbsoluteFill>
    {GANADORES.map((n, i) => (
      <Sequence key={n} from={p(2 * i)} durationInFrames={p(2)}>
        <Fondo foto={n} largo={p(2)} zoom={[1.12, 1.02]} origen="50% 40%" oscuro={0.1} />
        <Sello texto="¡GANASTE!" y={1230} fondo={i % 2 ? C.verde : C.azul} giro={i % 2 ? 7 : -7} />
        <Destello en={0} fuerza={0.35} />
        <Confeti en={0} x={540} y={1260} n={50} semilla={`g${i}`} />
        <Sfx nombre={i === 3 ? "campanas" : "pop_agudo"} en={0} vol={0.55} />
      </Sequence>
    ))}
    <Pildora texto="Ganadores del día" y={270} fondo={C.verde} color={C.blanco} />
  </AbsoluteFill>
);

const Entrevista: React.FC = () => {
  const fr = useCurrentFrame();
  let off = 0;
  const tramos = VOZ.map((t) => {
    const r = { ...t, from: off, dur: Math.round((t.hasta - t.desde) * FPS) };
    off += r.dur;
    return r;
  });
  // segundo del clip original que se ve en este cuadro
  const tr = tramos.find((t) => fr >= t.from && fr < t.from + t.dur) ?? tramos[tramos.length - 1];
  const seg = tr.desde + (fr - tr.from) / FPS;
  const frase = FRASES.find(([a, b]) => seg >= SUBS[a][0] - 0.15 && (b >= SUBS.length || seg < SUBS[b][0] - 0.15)) ?? FRASES[0];
  return (
    <AbsoluteFill>
      {tramos.map((t, i) => (
        <Sequence key={i} from={t.from} durationInFrames={t.dur}>
          <Fondo clip={8} desde={t.desde} largo={t.dur} zoom={i ? [1.22, 1.28] : [1.08, 1.14]} origen="62% 30%" oscuro={0.12} sonido />
        </Sequence>
      ))}
      <Sequence from={off} durationInFrames={p(20) - off}>
        <Fondo clip={8} desde={VOZ[1].hasta} largo={p(20) - off} zoom={[1.28, 1.32]} origen="62% 30%" oscuro={0.12} />
      </Sequence>
      <Pildora texto="Qué es trado, en 8 segundos" y={270} fondo={C.azul} color={C.blanco} />
      <div style={{ position: "absolute", top: 1130, left: 60, right: 60, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px 18px",
        background: "rgba(15,20,36,0.82)", borderRadius: 32, padding: "26px 30px" }}>
        {SUBS.slice(frase[0], frase[1]).map(([t, w], i) => {
          const dicha = seg >= t;
          const marca = /Trado|segura|link/.test(w);
          return (
            <span key={i} style={{ fontFamily: FUENTE, fontWeight: 800, fontSize: 72, lineHeight: 1.15, letterSpacing: "-0.02em",
              color: dicha ? (marca ? "#FFD23F" : C.blanco) : "rgba(255,255,255,0.45)", textShadow: "0 4px 18px rgba(0,0,0,0.7)" }}>{w}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Stand: React.FC = () => (
  <AbsoluteFill>
    <Sequence durationInFrames={p(4)}>
      <Fondo clip={9} desde={6} largo={p(4)} zoom={[1.3, 1.15]} origen="55% 55%" oscuro={0.2} />
      <Palabra texto={"STAND\nLLENO"} en={0} y={1050} size={170} giro={-4} />
      <Sfx nombre="golpe" en={0} vol={0.5} />
    </Sequence>
    <Sequence from={p(4)} durationInFrames={p(2)}>
      <Fondo clip={7} desde={6.35} largo={p(2)} zoom={[1.05, 1.15]} origen="50% 40%" oscuro={0.05} />
    </Sequence>
    <Sequence from={p(6)} durationInFrames={p(2)}>
      <FotoAncha n={18} largo={p(2)} />
      <Pildora texto="El equipo" y={330} />
    </Sequence>
  </AbsoluteFill>
);

const Manana: React.FC = () => (
  <AbsoluteFill>
    <Fondo foto={7} largo={p(6)} zoom={[1.05, 1.15]} origen="40% 40%" oscuro={0.5} />
    <Palabra texto={"MAÑANA\nSEGUIMOS"} en={0} y={430} size={150} giro={-3} />
    <Sfx nombre="golpe" en={0} vol={0.5} />
    <Pildora texto="Viernes 20 y sábado 21" en={p(2)} y={850} fondo="#FFD23F" />
    <Sfx nombre="pop" en={p(2)} vol={0.5} />
    <Palabra texto={"Zona Roja · Fintech\natrás de Mercado Pago"} en={p(3)} y={990} size={64} />
    <Sfx nombre="pop_agudo" en={p(3)} vol={0.45} />
  </AbsoluteFill>
);

const Logo: React.FC = () => {
  const fr = useCurrentFrame();
  const k = rebote(fr, 0);
  return (
    <AbsoluteFill style={{ background: C.blanco, justifyContent: "center", alignItems: "center" }}>
      <Img src={staticFile("logos/trado degradado.svg")} style={{ width: 640, transform: `scale(${0.6 + 0.4 * k})`, opacity: Math.min(1, k * 2), marginTop: -160 }} />
      <div style={{ position: "absolute", top: 1060, fontFamily: FUENTE, fontWeight: 800, fontSize: 64, color: C.tinta, opacity: suave(fr, 10), letterSpacing: "-0.02em" }}>
        Ven a tirar los dados
      </div>
      <div style={{ position: "absolute", top: 1170, fontFamily: FUENTE, fontWeight: 700, fontSize: 48, color: C.blanco, background: DEGRADADO, padding: "12px 34px",
        borderRadius: 999, opacity: suave(fr, 18), transform: `translateY(${20 * (1 - suave(fr, 18))}px)` }}>
        @trado_cl
      </div>
      <Destello en={0} fuerza={0.8} />
    </AbsoluteFill>
  );
};

// ── Armado ──────────────────────────────────────────────────────────────────

const ESCENAS: [readonly [number, number], React.FC][] = [
  [E.gancho, Gancho], [E.reglas, Reglas], [E.tiros, Tiros], [E.ganadores, Ganadores],
  [E.entrevista, Entrevista], [E.stand, Stand], [E.manana, Manana], [E.logo, Logo],
];

const Musica: React.FC = () => {
  const a = p(E.entrevista[0]), b = a + VOZ_LARGO;
  // baja ~16 dB mientras hablas, para que la voz quede unos 11 dB arriba
  return (
    <Audio src={staticFile("sfx/musica_rock.wav")}
      volume={(f) => interpolate(f, [a - 6, a + 4, b - 4, b + 6], [0.9, 0.15, 0.15, 0.9], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
  );
};

export const EtmDia1: React.FC<{ musica?: boolean }> = ({ musica = true }) => (
  <AbsoluteFill style={{ fontFamily: FUENTE, background: C.tinta }}>
    {musica && <Musica />}
    {ESCENAS.map(([[a, b], Escena], i) => (
      <Sequence key={i} from={p(a)} durationInFrames={p(b) - p(a)}>
        <Escena />
        {i > 0 && <Destello en={0} fuerza={0.2} />}
      </Sequence>
    ))}
  </AbsoluteFill>
);
