import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { C, FUENTE, rebote, s, suave } from "../marca";
import { Pildora, Sfx } from "../piezas/base";
import { Chat } from "../piezas/Chat";
import { Confeti, Destello, Palabra, Rayos, Salto } from "../piezas/efectos";
import { Esquema } from "../piezas/Esquema";
import { Mapa } from "../piezas/Mapa";
import { Publicacion } from "../piezas/Publicacion";
import { linea, Toma } from "../piezas/Toma";

// Reel «Desde donde quieras» (post 15), armado con la segunda grabación (prueba-2).
// Se alterna lo orgánico (tu video tal cual, con las animaciones entre tu fondo y tú)
// con la marca (tu recorte sobre el post, el chat o el esquema). El paso entre los dos
// es un círculo que se cierra hacia tu cara. En cada frase cambias de lugar y las pausas se cortan.
// Todos los tiempos de cada escena van en segundos de su toma.
//
// toma      origen en video.mp4                    cara
// hook      6,8–11,8                               534, 1009
// duda      19,2–29,7                              548, 1030
// mira      35,7–39,0                              598, 1040
// nomkt     42,0–50,6                              576, 1015
// medio     91,7–101,7  (la tercera, la completa)  594, 1032
// cierre    104,4–109,3                            579, 1015
// trado     118,9–120,6 (la tercera de cinco)      606, 1056

const CARPETA = "material/desde-donde-quieras";

const L_HOOK = linea([[0.08, 4.95]]);
const L_DUDA = linea([[0, 1.68], [1.82, 3.58], [3.96, 5.8], [5.9, 7.7], [7.78, 10.45]]);
const L_MIRA = linea([[0, 0.6], [0.72, 3.25]]);
const L_NOMKT = linea([[0, 4.62], [5.82, 8.6]]);
const L_MEDIO = linea([[0, 2.1], [2.4, 3.6], [3.8, 5.6], [5.85, 10.0]]);
const L_CIERRE = linea([[0, 2.3], [2.6, 4.85]]);
const L_TRADO = linea([[0, 1.45]]);

// Funciones (no componentes ya creados) porque las escenas se declaran más abajo
const ESCENAS: { id: string; dur: number; C: () => React.ReactElement }[] = [
  { id: "hook", dur: L_HOOK.dur, C: () => <Gancho /> },
  { id: "duda", dur: L_DUDA.dur, C: () => <Duda /> },
  { id: "mira", dur: L_MIRA.dur, C: () => <Mira /> },
  { id: "nomkt", dur: L_NOMKT.dur, C: () => <NoMarketplace /> },
  { id: "medio", dur: L_MEDIO.dur, C: () => <AlMedio /> },
  { id: "cierre", dur: L_CIERRE.dur, C: () => <DondeQuieras /> },
  { id: "trado", dur: L_TRADO.dur + s(1.1), C: () => <Final /> },
];

export const DURACION = ESCENAS.reduce((t, e) => t + e.dur, 0);

// Música de fondo sintetizada (scripts/musica.py). Con la prop musica = false sale sin ella
// (`python scripts/final.py DesdeDondeQuieras --sin-musica`), para usar una canción de Instagram.
const COMPAS = s(2.5); // un compás a 96 BPM, igual que en scripts/musica.py

const inicioDe = (id: string) => {
  let t = 0;
  for (const e of ESCENAS) { if (e.id === id) return t; t += e.dur; }
  return t;
};

const Musica: React.FC = () => {
  // El ritmo entra en el primer compás después de que aparece Trado al medio
  const ritmo = Math.ceil(inicioDe("medio") / COMPAS) * COMPAS;
  const sinVoz = inicioDe("trado") + s(1.3); // al final ya no hablas: la música sube un poco
  const cierra = Math.max(sinVoz + 9, DURACION - 20);
  const nivel = (f: number) => interpolate(f, [0, 15, sinVoz, sinVoz + 8, cierra, DURACION], [0, 1, 1, 1.6, 1.6, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      <Audio src={staticFile("sfx/musica_base.wav")} volume={(f) => 0.06 * nivel(f)} />
      <Sequence from={ritmo} layout="none">
        <Audio src={staticFile("sfx/musica_ritmo.wav")} volume={(f) => 0.15 * nivel(f + ritmo) * Math.min(1, f / 8)} />
      </Sequence>
    </>
  );
};

export const DesdeDondeQuieras: React.FC<{ musica?: boolean }> = ({ musica = true }) => {
  let desde = 0;
  return (
    <AbsoluteFill style={{ fontFamily: FUENTE, background: C.tinta }}>
      {musica && <Musica />}
      {ESCENAS.map((e, i) => {
        const inicio = desde;
        desde += e.dur;
        return (
          <Sequence key={e.id} from={inicio} durationInFrames={e.dur}>
            <Entrada>{e.C()}</Entrada>
            {i > 0 && <Destello en={0} fuerza={0.3} />}
            {i > 0 && <Sfx nombre="whoosh_baja" en={0} vol={0.35} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

/** Cada escena entra con un zoom corto: le da el empujón de los cortes de TikTok. */
const Entrada: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ transform: `scale(${1 + 0.04 * (1 - suave(f, 0, 10))})` }}>{children}</AbsoluteFill>;
};

/** Desplaza los cuadros de los hijos: así una Sequence anidada puede usar tiempos de la toma. */
const Desde: React.FC<{ en: number; hasta?: number; children: React.ReactNode }> = ({ en, hasta, children }) => (
  <Sequence from={en} durationInFrames={hasta === undefined ? undefined : hasta - en} layout="none">{children}</Sequence>
);

// «Lo encontraste. Precio perfecto, pero el vendedor está en Arica»
const Gancho: React.FC = () => {
  const L = L_HOOK;
  const f = useCurrentFrame();
  return (
    <Toma carpeta={CARPETA} archivo="hook" origen={6.8} cara={{ x: 534, y: 1009 }} linea={L}
      modos={[[0, "real"]]}
      palabras={[
        [["Lo", 0.19], ["encontraste,", 0.55]],
        [["el", 1.45], ["precio", 1.69], ["perfecto,", 1.89]],
        [["pero", 3.07], ["el", 3.13], ["vendedor", 3.27]],
        [["está", 3.89], ["en", 4.19], ["Arica.", 4.35]],
      ]}>
      {/* El feed corre en tu pieza, sobre tu cabeza, y frena en la bicicleta */}
      <Publicacion y={110} alto={680} paraEn={L.en(1.5)} marcas={{ precio: L.en(1.89), lugar: L.en(4.35), duda: L.en(4.6) }} />
      {/* A un lado, lo lejos que está */}
      <Mapa x={170} y={1040} escala={0.3} desde={L.en(3.07)} nombres
        ciudades={["arica", "santiago"]} rutas={[{ de: "arica", a: "santiago", desde: L.en(3.89), dur: 14, color: C.naranjo, dudosa: true }]} />
      {f >= L.en(4.35) && (
        <Pildora texto="≈ 2.000 km" fondo={C.naranjo} color={C.blanco}
          style={{ top: 1000, left: 735, fontSize: 42, whiteSpace: "nowrap", transform: `scale(${rebote(f, L.en(4.35))}) rotate(-5deg)` }} />
      )}
      <Sfx nombre="whoosh_sube" en={0} vol={0.5} />
      <Sfx nombre="tic" en={L.en(1.5)} />
      <Sfx nombre="golpe" en={L.en(4.35)} />
      <Sfx nombre="pregunta" en={L.en(4.6)} />
    </Toma>
  );
};

/** Comprobante de transferencia genérico. */
const Transferencia: React.FC<{ en: number }> = ({ en }) => {
  const f = useCurrentFrame();
  if (f < en) return null;
  const k = rebote(f, en);
  return (
    <div style={{ position: "absolute", top: 860, left: 90, right: 90, background: C.blanco, borderRadius: 36, padding: "30px 40px", display: "flex", alignItems: "center", gap: 28,
      boxShadow: "0 24px 60px rgba(10,10,40,0.35)", transform: `translateY(${(1 - k) * 300}px) rotate(${(1 - k) * 6}deg)`, opacity: Math.min(1, k * 1.5) }}>
      <div style={{ width: 96, height: 96, borderRadius: 999, background: C.verde, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width={56} height={56} viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <div>
        <div style={{ fontSize: 36, fontWeight: 700, color: C.gris }}>Transferencia enviada</div>
        <div style={{ fontSize: 64, fontWeight: 800, color: C.tinta, letterSpacing: "-0.03em" }}>$180.000</div>
      </div>
    </div>
  );
};

/** Emoji que cae desde arriba y aterriza en `hasta`. */
const Cae: React.FC<{ emoji: string; en: number; llega: number; x: number; y: number; size?: number }> = ({ emoji, en, llega, x, y, size = 260 }) => {
  const f = useCurrentFrame();
  if (f < en) return null;
  const t = Math.min(1, (f - en) / (llega - en));
  const aplasta = f >= llega ? 1 - 0.25 * Math.max(0, 1 - (f - llega) / 6) : 1;
  return <div style={{ position: "absolute", left: x, top: lerp(-400, y, t * t), fontSize: size, lineHeight: 1, transform: `scaleY(${aplasta}) rotate(${t * 200}deg)`, transformOrigin: "bottom" }}>{emoji}</div>;
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// «Y ahí es donde empieza la duda…»
const Duda: React.FC = () => {
  const L = L_DUDA;
  const chat1 = L.en(1.82), piedra = L.en(5.9), chat2 = L.en(7.78);
  return (
    <Toma carpeta={CARPETA} archivo="duda" origen={19.2} cara={{ x: 548, y: 1030 }} linea={L}
      modos={[[0, "real"], [1.82, "fuera"], [5.9, "real"], [7.78, "der"]]}
      palabras={[
        [["Y", 0.14], ["ahí", 0.22], ["es", 0.52], ["donde", 0.62]],
        [["empieza", 0.76], ["la", 1.0], ["duda.", 1.2]],
        [["¿Cómo", 1.9], ["lo", 2.06], ["hago", 2.24]],
        [["si", 2.54], ["no", 2.74], ["es", 2.82], ["en", 2.92], ["persona?", 3.02]],
        [["¿Pago", 4.04], ["y", 4.44], ["rezo", 4.68]],
        [["para", 4.9], ["que", 5.02], ["me", 5.1], ["llegue?", 5.32]],
        [["¿Y", 5.98], ["qué", 6.1], ["pasa", 6.22], ["si", 6.38]],
        [["me", 6.5], ["llega", 6.66], ["una", 6.74], ["piedra?", 6.92]],
        [["¿O", 7.86], ["envío", 8.08], ["y", 8.5], ["rezo", 9.02]],
        [["para", 9.24], ["que", 9.42], ["me", 9.54], ["paguen?", 9.68]],
      ]}
      encima={
        // La piedra le cae en la cabeza
        <Desde en={piedra} hasta={chat2}>
          <Cae emoji="🪨" en={L.en(6.5) - piedra} llega={L.en(6.92) - piedra} x={483} y={270} />
        </Desde>
      }>
      <Desde en={0} hasta={chat1}>
        <Palabra texto="?" en={L.en(0.22)} y={760} size={520} color={C.naranjo} giro={10} style={{ left: 560, right: 20 }} />
        <Palabra texto="la duda" en={L.en(1.2)} y={330} size={130} fondo={C.naranjo} />
      </Desde>
      <Desde en={chat1} hasta={piedra}>
        <Chat y={300} titulo="Vendedor · Arica" mensajes={[
          { de: "otro", texto: "¡Hola! Sí, está disponible 🚲", en: L.en(1.9) - chat1 },
          { de: "yo", texto: "¿Y cómo lo hacemos? Estoy en Santiago", en: L.en(2.54) - chat1 },
          { de: "otro", texto: "Transfiéreme y te lo mando 😉", en: L.en(3.1) - chat1 },
        ]} />
        <Transferencia en={L.en(4.04) - chat1} />
        <Salto emoji="🙏" en={L.en(4.68) - chat1} style={{ left: 110, top: 1110 }} />
      </Desde>
      <Desde en={piedra} hasta={chat2}>
        <Palabra texto="¿una piedra?" en={L.en(6.92) - piedra} y={250} size={110} fondo={C.blanco} color={C.tinta} giro={-4} />
      </Desde>
      <Desde en={chat2}>
        <Palabra texto="Y si eres tú el que vende…" en={0} y={250} size={60} />
        <Chat y={400} titulo="Comprador · Punta Arenas" mensajes={[
          { de: "yo", texto: "Listo, te lo envié 📦", en: L.en(8.08) - chat2 },
          { de: "yo", texto: "¿Me transfieres?", en: L.en(8.5) - chat2, visto: L.en(9.02) - chat2 },
        ]} />
        <Salto emoji="👻" en={L.en(9.68) - chat2} style={{ left: 100, top: 920 }} size={240} />
      </Desde>
      <Sfx nombre="pop_grave" en={L.en(0.22)} />
      <Sfx nombre="golpe" en={L.en(1.2)} />
      <Sfx nombre="burbuja" en={L.en(1.9)} />
      <Sfx nombre="tecleo" en={L.en(2.54) - 12} />
      <Sfx nombre="pop_agudo" en={L.en(2.54)} />
      <Sfx nombre="burbuja" en={L.en(3.1)} />
      <Sfx nombre="caja" en={L.en(4.04)} />
      <Sfx nombre="pop_grave" en={L.en(4.68)} />
      <Sfx nombre="whoosh_baja" en={L.en(6.5)} vol={0.6} />
      <Sfx nombre="piedra" en={L.en(6.92)} />
      <Sfx nombre="pop_agudo" en={L.en(8.08)} />
      <Sfx nombre="tecleo" en={L.en(8.5) - 10} />
      <Sfx nombre="pop_agudo" en={L.en(8.5)} />
      <Sfx nombre="grillos" en={L.en(9.68)} />
    </Toma>
  );
};

// «Mira, ahí está tu producto después de haberlo pagado»: la caja trae una piedra
const Mira: React.FC = () => {
  const L = L_MIRA;
  const f = useCurrentFrame();
  const cae = rebote(f, L.en(0.05));
  const abre = L.en(0.8);
    const sube = rebote(f, abre);
  return (
    <Toma carpeta={CARPETA} archivo="mira" origen={35.7} cara={{ x: 598, y: 1040 }} linea={L}
      modos={[[0, "real"], [1.62, "cerca"]]}
      palabras={[
        [["Mira,", 0.2]],
        [["ahí", 0.8], ["está", 0.96], ["tu", 1.06], ["producto", 1.2]],
        [["después", 1.62], ["de", 2.02], ["haberlo", 2.2], ["pagado.", 2.42]],
      ]}
      encima={f >= L.en(2.42) && (
        <Pildora texto="Pagado: $180.000 ✓" fondo={C.naranjo} color={C.blanco}
          style={{ top: 1230, left: "50%", fontSize: 56, whiteSpace: "nowrap", transform: `translateX(-50%) scale(${rebote(f, L.en(2.42))}) rotate(-6deg)` }} />
      )}>
      <Rayos en={abre} x={540} y={500} />
      <div style={{ position: "absolute", left: 0, right: 0, top: lerp(-600, 520, cae), textAlign: "center", fontSize: 380, lineHeight: 1}}>📦</div>
      {f >= abre && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 560 - 320 * sube, textAlign: "center", fontSize: 250, lineHeight: 1, transform: `rotate(${-16 * sube}deg) scale(${0.4 + 0.6 * sube})` }}>🪨</div>
      )}
      <Destello en={abre} fuerza={0.5} />
      <Sfx nombre="whoosh_baja" en={L.en(0.05)} vol={0.5} />
      <Sfx nombre="golpe" en={L.en(0.25)} />
      <Sfx nombre="pop_grave" en={abre} />
      <Sfx nombre="fracaso" en={abre + 6} vol={0.8} />
      <Sfx nombre="caja" en={L.en(2.42)} />
    </Toma>
  );
};

/** La palabra tachada de un golpe. */
const Tachado: React.FC<{ en: number; y: number; ancho: number }> = ({ en, y, ancho }) => {
  const f = useCurrentFrame();
  return <div style={{ position: "absolute", top: y, left: 540 - ancho / 2, width: ancho, height: 22, borderRadius: 999, background: C.rojo,
    transform: `rotate(-5deg) scaleX(${suave(f, en, 5)})`, transformOrigin: "center", boxShadow: "0 6px 16px rgba(0,0,0,0.3)" }} />;
};

/** Tarjeta de una app donde ya vendes: solo el nombre en texto, sin logos ni colores ajenos. */
const App: React.FC<{ nombre: string; en: number; x: number; giro: number }> = ({ nombre, en, x, giro }) => {
  const f = useCurrentFrame();
  if (f < en) return null;
  const k = rebote(f, en);
  return (
    <div style={{ position: "absolute", top: 640, left: x, width: 290, height: 190, borderRadius: 44, background: C.blanco, boxShadow: "0 20px 50px rgba(10,10,40,0.3)",
      display: "flex", alignItems: "center", justifyContent: "center", transform: `translateY(${(1 - k) * 200}px) scale(${k}) rotate(${giro}deg)` }}>
      <div style={{ fontSize: 46, fontWeight: 800, color: C.tinta, letterSpacing: "-0.03em" }}>{nombre}</div>
    </div>
  );
};

// «Trado no es un marketplace. Sigues comprando y vendiendo donde ya lo haces: Marketplace, Instagram, Facebook»
const NoMarketplace: React.FC = () => {
  const L = L_NOMKT;
  const f = useCurrentFrame();
  return (
    <Toma carpeta={CARPETA} archivo="nomkt" origen={42.0} cara={{ x: 576, y: 1015 }} linea={L}
      modos={[[0, "real"], [2.08, "abajo"]]}
      palabras={[
        [["Trado", 0.22], ["no", 0.56], ["es", 0.8]],
        [["un", 0.96], ["Marketplace.", 1.08]],
        [["Sigues", 2.08], ["comprando", 2.3], ["y", 2.88], ["vendiendo", 3.1]],
        [["donde", 3.58], ["ya", 3.8], ["lo", 3.94], ["haces.", 4.2]],
        [["En", 6.0], ["Marketplace,", 6.2], ["Instagram,", 7.18], ["Facebook.", 7.8]],
      ]}>
      <Palabra texto="trado" en={L.en(0.22)} y={190} size={150} fondo={C.azul} giro={0} />
      <Desde en={0} hasta={L.en(5.9)}>
        <Palabra texto="marketplace" en={L.en(1.08)} y={410} size={84} fondo={C.blanco} color={C.tinta} giro={0} />
        <Tachado en={L.en(1.4)} y={455} ancho={600} />
        <Palabra texto="🛍️ Compras" en={L.en(2.3)} y={640} size={70} fondo={C.verde} giro={-5} style={{ left: 60, right: 480 }} />
        <Palabra texto="🏷️ Vendes" en={L.en(3.1)} y={780} size={70} fondo={C.verde} giro={4} style={{ left: 440, right: 40 }} />
        <Palabra texto="donde ya estás" en={L.en(3.58)} y={940} size={64} />
      </Desde>
      <Desde en={L.en(5.9)}>
        <Palabra texto="donde ya estás" en={0} y={430} size={64} />
      </Desde>
      <App nombre="Marketplace" en={L.en(6.2)} x={60} giro={-4} />
      <App nombre="Instagram" en={L.en(7.18)} x={395} giro={3} />
      <App nombre="Facebook" en={L.en(7.8)} x={730} giro={-2} />
      {f >= L.en(8.1) && <Confeti en={L.en(8.1)} x={540} y={700} n={40} semilla="apps" />}
      <Sfx nombre="golpe" en={L.en(0.22)} />
      <Sfx nombre="pop" en={L.en(1.08)} />
      <Sfx nombre="tachon" en={L.en(1.4)} />
      <Sfx nombre="pop_agudo" en={L.en(2.3)} />
      <Sfx nombre="pop_grave" en={L.en(3.1)} />
      {/* Las tres apps suben de tono, como una escalera */}
      <Sfx nombre="pop_grave" en={L.en(6.2)} />
      <Sfx nombre="pop" en={L.en(7.18)} />
      <Sfx nombre="pop_agudo" en={L.en(7.8)} />
      <Sfx nombre="brillo" en={L.en(8.1)} vol={0.7} />
    </Toma>
  );
};

// «Nosotros nos ponemos al medio…»: el esquema de cómo funciona, paso a paso con lo que dices
const AlMedio: React.FC = () => {
  const L = L_MEDIO;
  return (
    <Toma carpeta={CARPETA} archivo="medio" origen={91.7} cara={{ x: 594, y: 1032 }} linea={L}
      modos={[[0, "real"], [1.2, "der"], [4.4, "izq"], [8.3, "der"]]}
      palabras={[
        [["Nosotros", 0.2], ["nos", 0.62], ["ponemos", 0.88]],
        [["al", 1.16], ["medio.", 1.46]],
        [["Pagas", 2.56], ["en", 2.84], ["Trado.", 3.08]],
        [["El", 3.94], ["vendedor", 4.04], ["envía", 4.54]],
        [["el", 4.88], ["producto.", 5.12]],
        [["El", 5.96], ["comprador", 6.24]],
        [["al", 6.66], ["recibirlo,", 6.88]],
        [["revisa", 7.74], ["y", 8.2]],
        [["libera", 8.48], ["el", 8.78], ["pago.", 8.92]],
      ]}>
      <Esquema y={300} m={{ aparece: L.en(1.1), medio: L.en(1.46), paga: L.en(2.56), envia: L.en(4.54), llega: L.en(6.88), revisa: L.en(7.74), libera: L.en(8.48) }} />
      <Sfx nombre="pop" en={L.en(1.1)} />
      <Sfx nombre="whoosh_baja" en={L.en(1.3)} vol={0.5} />
      <Sfx nombre="golpe" en={L.en(1.5)} />
      <Sfx nombre="whoosh_sube" en={L.en(2.56)} vol={0.5} />
      <Sfx nombre="candado" en={L.en(2.56) + 18} />
      <Sfx nombre="whoosh_baja" en={L.en(4.54)} vol={0.35} />
      <Sfx nombre="tic" en={L.en(6.88)} />
      <Sfx nombre="pop_agudo" en={L.en(7.74)} />
      <Sfx nombre="whoosh_sube" en={L.en(8.48)} vol={0.5} />
      <Sfx nombre="caja" en={L.en(8.48) + 10} />
      <Sfx nombre="campanas" en={L.en(8.48) + 16} vol={0.7} />
    </Toma>
  );
};

// «Y así da lo mismo dónde esté el producto. Compra y vende donde quieras»
const DondeQuieras: React.FC = () => {
  const L = L_CIERRE;
  const r = (de: "arica" | "calama" | "laSerena" | "santiago" | "concepcion" | "puertoMontt" | "coyhaique" | "puntaArenas", a: typeof de, t: number) =>
    ({ de, a, desde: L.en(t), dur: 22 });
  return (
    <Toma carpeta={CARPETA} archivo="cierre" origen={104.4} cara={{ x: 579, y: 1015 }} linea={L}
      modos={[[0, "der"]]}
      palabras={[
        [["Y", 0.19], ["así", 0.27], ["da", 0.53], ["lo", 0.79], ["mismo", 0.93]],
        [["donde", 1.17], ["esté", 1.37], ["el", 1.55], ["producto.", 1.77]],
        [["Compra", 2.71], ["y", 2.85], ["vende", 3.15]],
        [["donde", 3.59], ["quieras.", 3.93]],
      ]}>
      <Mapa x={150} y={220} escala={0.55} desde={0}
        ciudades={["arica", "calama", "laSerena", "santiago", "concepcion", "puertoMontt", "coyhaique", "puntaArenas"]}
        rutas={[r("arica", "santiago", 2.71), r("puertoMontt", "calama", 2.88), r("puntaArenas", "laSerena", 3.08), r("concepcion", "arica", 3.28), r("coyhaique", "santiago", 3.48)]} />
      <Palabra texto={"desde\ndonde\nquieras"} en={L.en(3.59)} y={420} size={104} giro={-4} style={{ left: 500, right: 20 }} />
      <Confeti en={L.en(3.93)} x={760} y={650} semilla="quieras" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Sfx key={i} nombre="tic" en={30 + i * 4} vol={0.4} />)}
      <Sfx nombre="whoosh_sube" en={L.en(2.71)} vol={0.6} />
      <Sfx nombre="golpe" en={L.en(3.59)} />
      <Sfx nombre="brillo" en={L.en(3.93)} />
    </Toma>
  );
};

// «En trado.cl»: tarjeta final; al terminar la frase sales de cuadro
const Final: React.FC = () => {
  const L = L_TRADO;
  const f = useCurrentFrame();
  return (
    <Toma carpeta={CARPETA} archivo="trado" origen={118.9} cara={{ x: 606, y: 1056 }} linea={L} modos={[[0, "abajo"], [1.38, "fuera"]]} palabras={[[["En", 0.2], ["trado.cl", 0.5]]]}>
      <div style={{ position: "absolute", top: 300, width: "100%", textAlign: "center", color: C.blanco, fontWeight: 800, fontSize: 190, letterSpacing: "-0.04em", transform: `scale(${rebote(f, 0)})` }}>trado</div>
      <Palabra texto={"Compra y vende\ndesde donde quieras."} en={6} y={540} size={66} giro={0} />
      <Pildora texto="trado.cl" style={{ top: 780, left: "50%", transform: `translateX(-50%) scale(${rebote(f, 10)})`, fontSize: 64, color: C.azul, padding: "22px 70px" }} />
      <Confeti en={4} x={540} y={420} n={60} semilla="final" />
      <Sfx nombre="golpe" en={0} />
      <Sfx nombre="campanas" en={6} vol={0.5} />
    </Toma>
  );
};
