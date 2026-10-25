import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { C, FUENTE, rebote, s, suave } from "./marca";
import { DURACION_HOOK, Hook } from "./Hook";
import { Pildora, Sfx, Titulo } from "./piezas/base";
import { Chat } from "./piezas/Chat";
import { Mapa } from "./piezas/Mapa";
import { Sala } from "./piezas/Sala";
import { Toma } from "./piezas/Toma";

// Reel «Desde donde quieras», armado con las tomas de prueba-1.mp4.
// Cada escena es una toma tuya recortada abajo (green screen) con la animación arriba.
// Los tiempos de las palabras son relativos al inicio de cada toma (faster-whisper).
//
// toma      origen en prueba-1.mp4
// duda      22,8–35,1
// mira      46,8–50,8
// nomkt     59,2–65,8
// medio     92,8–103,3  (la segunda toma, la completa)
// cierre    125,5–130,5
// trado     135,3–136,7
const ESCENAS: { id: string; dur: number; C: React.FC }[] = [
  { id: "hook", dur: DURACION_HOOK, C: Hook },
  { id: "duda", dur: s(12.3), C: () => <Duda /> },
  { id: "mira", dur: s(4.0), C: () => <Mira /> },
  { id: "nomkt", dur: s(6.6), C: () => <NoMarketplace /> },
  { id: "medio", dur: s(10.5), C: () => <AlMedio /> },
  { id: "cierre", dur: s(5.0), C: () => <DondeQuieras /> },
  { id: "trado", dur: s(2.6), C: () => <Final /> },
];

export const DURACION_REEL = ESCENAS.reduce((t, e) => t + e.dur, 0);

export const Reel: React.FC = () => {
  let desde = 0;
  return (
    <AbsoluteFill style={{ fontFamily: FUENTE, background: C.tinta }}>
      {ESCENAS.map((e, i) => {
        const inicio = desde;
        desde += e.dur;
        return (
          <Sequence key={e.id} from={inicio} durationInFrames={e.dur}>
            <e.C />
            {/* Corte con whoosh, como los videos de green screen */}
            {i > 0 && <Sfx nombre="whoosh_baja" en={0} vol={0.35} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

/** Emoji grande que salta encima de la animación. */
const Salto: React.FC<{ emoji: string; en: number; style: React.CSSProperties; giro?: number }> = ({ emoji, en, style, giro = -10 }) => {
  const f = useCurrentFrame();
  if (f < en) return null;
  const k = rebote(f, en);
  return <div style={{ position: "absolute", fontSize: 220, transform: `scale(${k}) rotate(${giro * k}deg)`, ...style }}>{emoji}</div>;
};

// «Y ahí es donde empieza la duda…»: el chat con el vendedor, y después al revés
const Duda: React.FC = () => (
  <Toma archivo="duda" palabras={[
    [["Y", 0.16], ["ahí", 0.3], ["es", 0.76], ["donde", 1.14]],
    [["empieza", 1.38], ["la", 1.62], ["duda.", 1.84]],
    [["Y", 2.58], ["si", 2.7], ["no", 2.78], ["hay", 2.84]],
    [["en", 2.92], ["persona,", 2.98]],
    [["¿cómo", 3.84], ["lo", 3.94], ["hago?", 4.16]],
    [["Pago", 5.1], ["y", 5.56], ["rezo", 5.82]],
    [["para", 6.0], ["que", 6.22], ["me", 6.32], ["llegue.", 6.5]],
    [["¿Y", 6.98], ["qué", 7.04], ["pasa", 7.14], ["si", 7.3]],
    [["me", 7.44], ["llega", 7.64], ["una", 7.8], ["piedra?", 8.0]],
    [["¿O", 9.3], ["envío", 9.56], ["y", 10.18]],
    [["no", 11.5], ["me", 11.64], ["pagan?", 11.8]],
  ]}>
    <Sequence durationInFrames={s(9.2)}>
      <Chat y={250} titulo="Vendedor · Arica" mensajes={[
        { de: "otro", texto: "¡Hola! Sí, está disponible 🚲", en: s(0.4) },
        { de: "yo", texto: "¿Y cómo lo hacemos? Estoy en Santiago", en: s(3.8) },
        { de: "otro", texto: "Transfiéreme y te lo mando 😉", en: s(4.6) },
      ]} />
      <Salto emoji="🙏" en={s(5.8)} style={{ left: 120, top: 790 }} />
      <Salto emoji="🪨" en={s(8.0)} style={{ right: 120, top: 790 }} giro={12} />
    </Sequence>
    {/* Ahora eres tú el que vende */}
    <Sequence from={s(9.2)}>
      <Chat y={250} titulo="Comprador · Punta Arenas" mensajes={[
        { de: "yo", texto: "Listo, te lo envié 📦", en: s(0.4) },
        { de: "yo", texto: "¿Me transfieres?", en: s(2.3), visto: s(2.8) },
      ]} />
    </Sequence>
    <Sfx nombre="pop" en={s(0.4)} />
    <Sfx nombre="pop_agudo" en={s(3.8)} />
    <Sfx nombre="pop" en={s(4.6)} />
    <Sfx nombre="pop_grave" en={s(5.8)} />
    <Sfx nombre="fracaso" en={s(8.0)} vol={0.7} />
    <Sfx nombre="pop_agudo" en={s(9.6)} />
    <Sfx nombre="pop_agudo" en={s(11.5)} />
    <Sfx nombre="fracaso" en={s(12.0)} vol={0.5} />
  </Toma>
);

// «Mira, ahí está tu producto después de haberlo pagado»: la caja trae una piedra
const Mira: React.FC = () => {
  const f = useCurrentFrame();
  const entra = rebote(f, s(0.2));
  // La caja tiembla hasta que se abre
  const tiembla = f < s(1.55) ? Math.sin(f * 1.7) * 6 * suave(f, s(0.6), 10) : 0;
  const abre = rebote(f, s(1.6));
  return (
    <Toma archivo="mira" palabras={[
      [["Mira,", 0.19]],
      [["ahí", 1.57], ["está", 1.77], ["tu", 1.85], ["producto", 1.99]],
      [["después", 2.41], ["de", 2.79], ["haberlo", 2.89], ["pagado.", 3.13]],
    ]}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 560, textAlign: "center", fontSize: 380, transform: `scale(${entra}) rotate(${tiembla}deg)` }}>📦</div>
      {f >= s(1.6) && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 560, textAlign: "center", fontSize: 260, transform: `translateY(${-300 * abre}px) rotate(${-14 * abre}deg)` }}>🪨</div>
      )}
      <Pildora texto="Pagado: $180.000" fondo={C.naranjo} color={C.blanco}
        style={{ top: 230, left: "50%", fontSize: 50, transform: `translateX(-50%) scale(${rebote(f, s(3.1))}) rotate(-4deg)`, whiteSpace: "nowrap" }} />
      <Sfx nombre="whoosh_sube" en={s(0.2)} vol={0.5} />
      <Sfx nombre="golpe" en={s(1.6)} />
      <Sfx nombre="fracaso" en={s(1.9)} vol={0.7} />
      <Sfx nombre="pop" en={s(3.1)} />
    </Toma>
  );
};

// «Trado no es un marketplace. Sigues donde ya lo haces: Marketplace, Instagram, WhatsApp»
// Solo el nombre en texto: sin logos ni colores de otras marcas.
const DONDE = [
  { texto: "Marketplace", en: s(4.37), giro: -4 },
  { texto: "Instagram", en: s(4.85), giro: 3 },
  { texto: "WhatsApp", en: s(5.55), giro: -2 },
];
const NoMarketplace: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Toma archivo="nomkt" palabras={[
      [["Trado", 0.21], ["no", 0.45], ["es", 0.65]],
      [["un", 0.77], ["Marketplace.", 0.91]],
      [["Sigues", 1.83], ["vendiendo", 2.05], ["y", 2.47], ["comprando", 2.71]],
      [["donde", 3.05], ["ya", 3.29], ["lo", 3.43], ["haces.", 3.69]],
      [["Marketplace,", 4.37], ["Instagram,", 4.85], ["WhatsApp.", 5.55]],
    ]}>
      <div style={{ position: "absolute", top: 230, width: "100%", textAlign: "center", color: C.blanco, fontWeight: 800, fontSize: 170, letterSpacing: "-0.04em", transform: `scale(${rebote(f, s(0.2))})` }}>trado</div>
      <Titulo texto="no es un marketplace." marca="marketplace" colorMarca={C.naranjo} y={450} size={72} desde={s(0.6)} />
      {DONDE.map((d, i) => (
        <Pildora key={d.texto} texto={d.texto} style={{ top: 640 + i * 130, left: "50%", fontSize: 54, padding: "18px 44px",
          transform: `translateX(-50%) scale(${rebote(f, d.en)}) rotate(${d.giro}deg)` }} />
      ))}
      <Sfx nombre="golpe" en={s(0.2)} />
      {DONDE.map((d) => <Sfx key={d.texto} nombre="pop_agudo" en={d.en} />)}
    </Toma>
  );
};

// «Nosotros nos ponemos al medio…»: la sala de Trado se va marcando con lo que dices.
// Textos verificados en la app: "Pago retenido en escrow", 72 h para revisar, el comprador libera.
const AlMedio: React.FC = () => (
  <Toma archivo="medio" palabras={[
    [["Nosotros", 0.2], ["nos", 0.76], ["ponemos", 1.02]],
    [["al", 1.34], ["medio.", 1.56]],
    [["Pagas", 2.66], ["en", 2.94], ["Trado.", 3.1]],
    [["El", 4.02], ["vendedor", 4.16], ["envía", 4.58]],
    [["el", 4.82], ["producto", 5.08], ["y", 5.44]],
    [["el", 5.9], ["comprador", 6.14]],
    [["al", 6.38], ["recibirlo,", 6.62]],
    [["revisa", 7.96], ["y", 8.56]],
    [["libera", 9.1], ["el", 9.36], ["pago.", 9.5]],
  ]}>
    <Sala y={250} desde={s(1.2)} producto="Bicicleta" monto="$180.000"
      estado={[
        { texto: "Esperando pago", color: "#B26B00", fondo: "#FFF1D6", en: 0 },
        { texto: "Pago retenido en escrow", color: "#047857", fondo: "#D1FAE5", en: s(2.7) },
        { texto: "72 h para revisar", color: "#C2410C", fondo: "#FFEDD5", en: s(6.6) },
        { texto: "Pago liberado", color: "#047857", fondo: "#D1FAE5", en: s(9.1) },
      ]}
      pasos={[
        { texto: "Pagas en Trado", en: s(2.7) },
        { texto: "El vendedor envía con su courier", en: s(4.6) },
        { texto: "Llega: 72 h para revisar", en: s(6.6) },
        { texto: "Liberas el pago", en: s(9.1) },
      ]} />
    <Sfx nombre="whoosh_sube" en={s(1.2)} vol={0.5} />
    {[2.7, 4.6, 6.6].map((t) => <Sfx key={t} nombre="tic" en={s(t)} />)}
    <Sfx nombre="campanas" en={s(9.1)} />
  </Toma>
);

// «Así da lo mismo dónde esté tu producto. Compra y vende donde quieras»: Chile entero
const DondeQuieras: React.FC = () => (
  <Toma archivo="cierre" palabras={[
    [["Así", 0.16], ["da", 0.46], ["lo", 0.72], ["mismo", 0.9]],
    [["donde", 1.06], ["esté", 1.28], ["tu", 1.44], ["producto.", 1.62]],
    [["Compra", 2.64], ["y", 2.8], ["vende", 3.06]],
    [["donde", 3.38], ["quieras.", 3.74]],
  ]}>
    <Mapa x={380} y={200} escala={0.5} desde={0}
      ciudades={["arica", "calama", "laSerena", "santiago", "concepcion", "puertoMontt", "coyhaique", "puntaArenas"]}
      rutas={[
        { de: "arica", a: "santiago", desde: s(2.64), dur: 26 },
        { de: "puertoMontt", a: "calama", desde: s(2.9), dur: 26 },
        { de: "puntaArenas", a: "laSerena", desde: s(3.2), dur: 26 },
      ]} />
    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Sfx key={i} nombre="tic" en={30 + i * 4} vol={0.4} />)}
    <Sfx nombre="whoosh_sube" en={s(2.64)} vol={0.6} />
  </Toma>
);

// «En trado.cl»: tarjeta final; tú sales al terminar la frase
const Final: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Toma archivo="trado" duracionClip={s(1.4)} palabras={[[["En", 0.18], ["trado.cl", 0.3]]]}>
      <div style={{ position: "absolute", top: 330, width: "100%", textAlign: "center", color: C.blanco, fontWeight: 800, fontSize: 190, letterSpacing: "-0.04em", transform: `scale(${rebote(f, 0)})` }}>trado</div>
      <Titulo texto="Compra y vende desde donde quieras." marca="quieras" y={600} size={64} desde={4} />
      <Pildora texto="trado.cl" style={{ top: 820, left: "50%", transform: `translateX(-50%) scale(${rebote(f, 10)})`, fontSize: 60, color: C.azul, padding: "22px 70px" }} />
      <Sfx nombre="golpe" en={0} />
    </Toma>
  );
};
