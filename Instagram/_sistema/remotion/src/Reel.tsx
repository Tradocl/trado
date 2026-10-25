import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { C, FUENTE, rebote, s, suave } from "./marca";
import { Pildora, Sfx } from "./piezas/base";
import { Chat } from "./piezas/Chat";
import { Confeti, Destello, Palabra, Rayos, Salto } from "./piezas/efectos";
import { Esquema } from "./piezas/Esquema";
import { Mapa } from "./piezas/Mapa";
import { Publicacion } from "./piezas/Publicacion";
import { linea, Toma } from "./piezas/Toma";

// Reel «Desde donde quieras», armado con las tomas de prueba-1.mp4.
// Se alterna lo orgánico (tu video tal cual, con las animaciones entre tu fondo y tú)
// con la marca (tu recorte sobre el post, el chat o el esquema). El paso entre los dos
// es un círculo que se cierra hacia tu cara. En cada frase cambias de lugar y las pausas se cortan.
// Todos los tiempos de cada escena van en segundos de su toma.
//
// toma         origen en prueba-1.mp4
// hook-prueba  0,4–6,3
// duda         22,8–35,1
// mira         46,8–50,8
// nomkt        59,2–65,8
// medio        92,8–103,3  (la segunda toma, la completa)
// cierre       125,5–130,5
// trado        135,3–136,7

const L_HOOK = linea([[0.55, 4.65]]);
const L_DUDA = linea([[0, 2.1], [2.4, 4.5], [5.0, 8.85], [9.25, 10.2], [11.28, 12.3]]);
const L_MIRA = linea([[0, 0.7], [1.3, 3.75]]);
const L_NOMKT = linea([[0, 6.25]]);
const L_MEDIO = linea([[0, 1.85], [2.45, 3.6], [3.88, 7.3], [7.82, 10.3]]);
const L_CIERRE = linea([[0, 4.4]]);
const L_TRADO = linea([[0, 1.3]]);

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

export const DURACION_REEL = ESCENAS.reduce((t, e) => t + e.dur, 0);

// Música de fondo sintetizada (scripts/musica.py). Con MUSICA = false sale sin ella,
// para publicarlo con una canción de la biblioteca de Instagram.
const MUSICA = true;
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
  const cierra = Math.max(sinVoz + 9, DURACION_REEL - 20);
  const nivel = (f: number) => interpolate(f, [0, 15, sinVoz, sinVoz + 8, cierra, DURACION_REEL], [0, 1, 1, 1.6, 1.6, 0],
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

export const Reel: React.FC = () => {
  let desde = 0;
  return (
    <AbsoluteFill style={{ fontFamily: FUENTE, background: C.tinta }}>
      {MUSICA && <Musica />}
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
    <Toma archivo="hook-prueba" origen={0.4} linea={L}
      modos={[[0, "real"]]}
      palabras={[
        [["Lo", 0.45], ["encontraste.", 0.88]],
        [["Precio", 1.82], ["perfecto,", 2.04]],
        [["pero", 3.0], ["el", 3.14], ["vendedor", 3.26]],
        [["está", 3.68], ["en", 4.0], ["Arica.", 4.12]],
      ]}>
      {/* El feed corre en tu pieza, sobre tu cabeza, y frena en la bicicleta */}
      <Publicacion y={110} alto={680} paraEn={L.en(1.6)} marcas={{ precio: L.en(2.0), lugar: L.en(4.12), duda: L.en(4.4) }} />
      {/* A un lado, lo lejos que está */}
      <Mapa x={170} y={1040} escala={0.3} desde={L.en(3.0)} nombres
        ciudades={["arica", "santiago"]} rutas={[{ de: "arica", a: "santiago", desde: L.en(3.68), dur: 14, color: C.naranjo, dudosa: true }]} />
      {f >= L.en(4.12) && (
        <Pildora texto="≈ 2.000 km" fondo={C.naranjo} color={C.blanco}
          style={{ top: 1000, left: 735, fontSize: 42, whiteSpace: "nowrap", transform: `scale(${rebote(f, L.en(4.12))}) rotate(-5deg)` }} />
      )}
      <Sfx nombre="whoosh_sube" en={0} vol={0.5} />
            <Sfx nombre="tic" en={L.en(1.6)} />
            <Sfx nombre="golpe" en={L.en(4.12)} />
      <Sfx nombre="pregunta" en={L.en(4.4)} />
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
  const chat1 = L.en(2.5), chat2 = L.en(9.25);
  return (
    <Toma archivo="duda" origen={22.8} linea={L}
      modos={[[0, "real"], [2.5, "fuera"], [6.95, "real"], [9.25, "der"]]}
      palabras={[
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
      ]}
      encima={
        // La piedra le cae en la cabeza
        <Desde en={L.en(6.95)} hasta={L.en(9.25)}>
          <Cae emoji="🪨" en={L.en(7.6) - L.en(6.95)} llega={L.en(8.0) - L.en(6.95)} x={470} y={300} />
        </Desde>
      }>
      <Desde en={0} hasta={chat1}>
        <Palabra texto="?" en={L.en(0.3)} y={760} size={520} color={C.naranjo} giro={10} style={{ left: 560, right: 20 }} />
        <Palabra texto="la duda" en={L.en(1.84)} y={330} size={130} fondo={C.naranjo} />
      </Desde>
      <Desde en={chat1} hasta={L.en(6.95)}>
        <Chat y={300} titulo="Vendedor · Arica" mensajes={[
          { de: "otro", texto: "¡Hola! Sí, está disponible 🚲", en: L.en(2.6) - chat1 },
          { de: "yo", texto: "¿Y cómo lo hacemos? Estoy en Santiago", en: L.en(3.84) - chat1 },
          { de: "otro", texto: "Transfiéreme y te lo mando 😉", en: L.en(4.25) - chat1 },
        ]} />
        <Transferencia en={L.en(5.15) - chat1} />
        <Salto emoji="🙏" en={L.en(5.82) - chat1} style={{ left: 110, top: 1110 }} />
      </Desde>
      <Desde en={L.en(6.95)} hasta={chat2}>
        <Palabra texto="¿una piedra?" en={L.en(8.0) - L.en(6.95)} y={250} size={110} fondo={C.blanco} color={C.tinta} giro={-4} />
      </Desde>
      <Desde en={chat2}>
        <Palabra texto="Y si eres tú el que vende…" en={0} y={250} size={60} />
        <Chat y={400} titulo="Comprador · Punta Arenas" mensajes={[
          { de: "yo", texto: "Listo, te lo envié 📦", en: L.en(9.5) - chat2 },
          { de: "yo", texto: "¿Me transfieres?", en: L.en(11.4) - chat2, visto: L.en(11.75) - chat2 },
        ]} />
        <Salto emoji="👻" en={L.en(11.9) - chat2} style={{ left: 100, top: 920 }} size={240} />
      </Desde>
      <Sfx nombre="pop_grave" en={L.en(0.3)} />
      <Sfx nombre="golpe" en={L.en(1.84)} />
      <Sfx nombre="burbuja" en={L.en(2.6)} />
      <Sfx nombre="tecleo" en={L.en(3.84) - 14} />
      <Sfx nombre="pop_agudo" en={L.en(3.84)} />
      <Sfx nombre="burbuja" en={L.en(4.25)} />
      <Sfx nombre="caja" en={L.en(5.15)} />
      <Sfx nombre="pop_grave" en={L.en(5.82)} />
      <Sfx nombre="whoosh_baja" en={L.en(7.6)} vol={0.6} />
      <Sfx nombre="piedra" en={L.en(8.0)} />
      <Sfx nombre="pop_agudo" en={L.en(9.5)} />
      <Sfx nombre="tecleo" en={L.en(11.4) - 14} />
      <Sfx nombre="pop_agudo" en={L.en(11.4)} />
      <Sfx nombre="grillos" en={L.en(11.9)} />
    </Toma>
  );
};

// «Mira, ahí está tu producto después de haberlo pagado»: la caja trae una piedra
const Mira: React.FC = () => {
  const L = L_MIRA;
  const f = useCurrentFrame();
  const cae = rebote(f, L.en(0.1));
  const abre = L.en(1.57);
    const sube = rebote(f, abre);
  return (
    <Toma archivo="mira" origen={46.8} linea={L}
      modos={[[0, "real"], [2.4, "cerca"]]}
      palabras={[
        [["Mira,", 0.19]],
        [["ahí", 1.57], ["está", 1.77], ["tu", 1.85], ["producto", 1.99]],
        [["después", 2.41], ["de", 2.79], ["haberlo", 2.89], ["pagado.", 3.13]],
      ]}
      encima={f >= L.en(3.13) && (
        <Pildora texto="Pagado: $180.000 ✓" fondo={C.naranjo} color={C.blanco}
          style={{ top: 1230, left: "50%", fontSize: 56, whiteSpace: "nowrap", transform: `translateX(-50%) scale(${rebote(f, L.en(3.13))}) rotate(-6deg)` }} />
      )}>
      <Rayos en={abre} x={540} y={500} />
      <div style={{ position: "absolute", left: 0, right: 0, top: lerp(-600, 520, cae), textAlign: "center", fontSize: 380, lineHeight: 1}}>📦</div>
      {f >= abre && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 560 - 320 * sube, textAlign: "center", fontSize: 250, lineHeight: 1, transform: `rotate(${-16 * sube}deg) scale(${0.4 + 0.6 * sube})` }}>🪨</div>
      )}
      <Destello en={abre} fuerza={0.5} />
      <Sfx nombre="whoosh_baja" en={L.en(0.1)} vol={0.5} />
      <Sfx nombre="golpe" en={L.en(0.3)} />
      <Sfx nombre="pop_grave" en={abre} />
      <Sfx nombre="fracaso" en={abre + 6} vol={0.8} />
      <Sfx nombre="caja" en={L.en(3.13)} />
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

// «Trado no es un marketplace. Sigues donde ya lo haces: Marketplace, Instagram, WhatsApp»
const NoMarketplace: React.FC = () => {
  const L = L_NOMKT;
  const f = useCurrentFrame();
  return (
    <Toma archivo="nomkt" origen={59.2} linea={L}
      modos={[[0, "real"], [1.83, "abajo"]]}
      palabras={[
        [["Trado", 0.21], ["no", 0.45], ["es", 0.65]],
        [["un", 0.77], ["Marketplace.", 0.91]],
        [["Sigues", 1.83], ["vendiendo", 2.05], ["y", 2.47], ["comprando", 2.71]],
        [["donde", 3.05], ["ya", 3.29], ["lo", 3.43], ["haces.", 3.69]],
        [["Marketplace,", 4.37], ["Instagram,", 4.85], ["WhatsApp.", 5.55]],
      ]}>
      <Palabra texto="trado" en={L.en(0.21)} y={190} size={150} fondo={C.azul} giro={0} />
      <Desde en={0} hasta={L.en(4.3)}>
        <Palabra texto="marketplace" en={L.en(0.91)} y={410} size={84} fondo={C.blanco} color={C.tinta} giro={0} />
        <Tachado en={L.en(1.2)} y={455} ancho={600} />
        <Palabra texto="🏷️ Vendes" en={L.en(2.05)} y={640} size={70} fondo={C.verde} giro={-5} style={{ left: 60, right: 480 }} />
        <Palabra texto="🛍️ Compras" en={L.en(2.71)} y={780} size={70} fondo={C.verde} giro={4} style={{ left: 440, right: 40 }} />
        <Palabra texto="donde ya estás" en={L.en(3.05)} y={940} size={64} />
      </Desde>
      <Desde en={L.en(4.3)}>
        <Palabra texto="donde ya estás" en={0} y={430} size={64} />
      </Desde>
      <App nombre="Marketplace" en={L.en(4.37)} x={60} giro={-4} />
      <App nombre="Instagram" en={L.en(4.85)} x={395} giro={3} />
      <App nombre="WhatsApp" en={L.en(5.55)} x={730} giro={-2} />
      {f >= L.en(5.75) && <Confeti en={L.en(5.75)} x={540} y={700} n={40} semilla="apps" />}
      <Sfx nombre="golpe" en={L.en(0.21)} />
      <Sfx nombre="pop" en={L.en(0.91)} />
      <Sfx nombre="tachon" en={L.en(1.2)} />
      <Sfx nombre="pop_agudo" en={L.en(2.05)} />
      <Sfx nombre="pop_grave" en={L.en(2.71)} />
      {/* Las tres apps suben de tono, como una escalera */}
      <Sfx nombre="pop_grave" en={L.en(4.37)} />
      <Sfx nombre="pop" en={L.en(4.85)} />
      <Sfx nombre="pop_agudo" en={L.en(5.55)} />
      <Sfx nombre="brillo" en={L.en(5.75)} vol={0.7} />
    </Toma>
  );
};

// «Nosotros nos ponemos al medio…»: el esquema de cómo funciona, paso a paso con lo que dices
const AlMedio: React.FC = () => {
  const L = L_MEDIO;
  return (
    <Toma archivo="medio" origen={92.8} linea={L}
      modos={[[0, "real"], [1.3, "der"], [4.5, "izq"], [8.9, "der"]]}
      palabras={[
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
      <Esquema y={300} m={{ aparece: L.en(1.2), medio: L.en(1.56), paga: L.en(2.66), envia: L.en(4.58), llega: L.en(6.62), revisa: L.en(7.96), libera: L.en(9.1) }} />
      <Sfx nombre="pop" en={L.en(1.2)} />
      <Sfx nombre="whoosh_baja" en={L.en(1.4)} vol={0.5} />
      <Sfx nombre="golpe" en={L.en(1.6)} />
      <Sfx nombre="whoosh_sube" en={L.en(2.66)} vol={0.5} />
      <Sfx nombre="candado" en={L.en(2.66) + 18} />
      <Sfx nombre="whoosh_baja" en={L.en(4.58)} vol={0.35} />
      <Sfx nombre="tic" en={L.en(6.62)} />
      <Sfx nombre="pop_agudo" en={L.en(7.96)} />
      <Sfx nombre="whoosh_sube" en={L.en(9.1)} vol={0.5} />
      <Sfx nombre="caja" en={L.en(9.1) + 10} />
      <Sfx nombre="campanas" en={L.en(9.1) + 16} vol={0.7} />
    </Toma>
  );
};

// «Así da lo mismo dónde esté tu producto. Compra y vende donde quieras»
const DondeQuieras: React.FC = () => {
  const L = L_CIERRE;
  const r = (de: "arica" | "calama" | "laSerena" | "santiago" | "concepcion" | "puertoMontt" | "coyhaique" | "puntaArenas", a: typeof de, t: number) =>
    ({ de, a, desde: L.en(t), dur: 22 });
  return (
    <Toma archivo="cierre" origen={125.5} linea={L}
      modos={[[0, "der"]]}
      palabras={[
        [["Así", 0.16], ["da", 0.46], ["lo", 0.72], ["mismo", 0.9]],
        [["donde", 1.06], ["esté", 1.28], ["tu", 1.44], ["producto.", 1.62]],
        [["Compra", 2.64], ["y", 2.8], ["vende", 3.06]],
        [["donde", 3.38], ["quieras.", 3.74]],
      ]}>
      <Mapa x={150} y={220} escala={0.55} desde={0}
        ciudades={["arica", "calama", "laSerena", "santiago", "concepcion", "puertoMontt", "coyhaique", "puntaArenas"]}
        rutas={[r("arica", "santiago", 2.64), r("puertoMontt", "calama", 2.8), r("puntaArenas", "laSerena", 3.0), r("concepcion", "arica", 3.2), r("coyhaique", "santiago", 3.4)]} />
      <Palabra texto={"desde\ndonde\nquieras"} en={L.en(3.38)} y={420} size={104} giro={-4} style={{ left: 500, right: 20 }} />
      <Confeti en={L.en(3.74)} x={760} y={650} semilla="quieras" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Sfx key={i} nombre="tic" en={30 + i * 4} vol={0.4} />)}
      <Sfx nombre="whoosh_sube" en={L.en(2.64)} vol={0.6} />
      <Sfx nombre="golpe" en={L.en(3.38)} />
      <Sfx nombre="brillo" en={L.en(3.74)} />
    </Toma>
  );
};

// «En trado.cl»: tarjeta final; al terminar la frase sales de cuadro
const Final: React.FC = () => {
  const L = L_TRADO;
  const f = useCurrentFrame();
  return (
    <Toma archivo="trado" origen={135.3} linea={L} modos={[[0, "abajo"], [1.25, "fuera"]]} palabras={[[["En", 0.18], ["trado.cl", 0.3]]]}>
      <div style={{ position: "absolute", top: 300, width: "100%", textAlign: "center", color: C.blanco, fontWeight: 800, fontSize: 190, letterSpacing: "-0.04em", transform: `scale(${rebote(f, 0)})` }}>trado</div>
      <Palabra texto={"Compra y vende\ndesde donde quieras."} en={6} y={540} size={66} giro={0} />
      <Pildora texto="trado.cl" style={{ top: 780, left: "50%", transform: `translateX(-50%) scale(${rebote(f, 10)})`, fontSize: 64, color: C.azul, padding: "22px 70px" }} />
      <Confeti en={4} x={540} y={420} n={60} semilla="final" />
      <Sfx nombre="golpe" en={0} />
      <Sfx nombre="campanas" en={6} vol={0.5} />
    </Toma>
  );
};
