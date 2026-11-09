import React from "react";
import { AbsoluteFill, Audio, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { C, FUENTE, rebote, s, suave } from "../marca";
import { Pildora, Sfx } from "../piezas/base";
import { Confeti, Destello, Palabra, Rayos, Salto } from "../piezas/efectos";
import { Chat } from "../piezas/Chat";
import { linea, Toma } from "../piezas/Toma";

// Reel «En persona» (violencia en ventas cara a cara por Marketplace).
// Grabación: 7 clips por WhatsApp unidos en video.mp4 (576×1024 escalado). Había varias tomas por
// frase; se usa la mejor de cada una:
//
// toma      origen en video.mp4   cara        por qué esa
// hook      0,5–4,8               540, 1015   la única
// perfil    22,8–35,5 (2ª toma)   562, 958    la 1ª dice "que solo conoce" (le falta la s)
// problema  37,8–41,9 (1ª toma)   527, 980    la 2ª tiene una pausa de 5,6 s al medio
// trado     60,7–67,0 (2ª toma)   534, 986    solo "En Trado,": el resto (todos verificados, RUT,
//                                               teléfono, carnet) la app NO lo hace
// antes     80,6–85,5 (2ª toma)   537, 1033   la 1ª dice "sabe que estás verificado" (tampoco es así)
// cierre    87,8–93,8             544, 1051   la única
//
// Lo que se muestra de Trado sale de src/components/sala/ConQuienTratas.tsx: nombre, Verificado /
// Sin verificar, nota y salas en Trado. Nada de RUT ni teléfono.
//
// Noticias reales (T13, 24 Horas, Meganoticias, CHV), con su logo y su franja tal cual: cortes de
// 3 s en public/material/en-persona/noticias/cortes/ (fuera de git), fuentes en noticias.md.

const CARPETA = "material/en-persona";

const L_HOOK = linea([[0.1, 4.2]]);
// Hasta 3,05 hay un "Y en todos los casos pasa lo…" que quedó colgando: se usa la repetición
// ("y en casi todos los casos…", que además es más exacta)
const L_PERFIL = linea([[3.05, 9.3], [9.95, 12.55]]);
const L_PROBLEMA = linea([[0.15, 1.6], [1.8, 4.0]]);
const L_TRADO = linea([[0.1, 0.78]]);
const L_ANTES = linea([[0.12, 4.75]]);
const L_CIERRE = linea([[0.15, 3.9], [4.28, 5.85]]);

type Corte = { src: string; desde: number; dur: number; lugar: string; titular?: string; medio: string; vertical?: boolean };
// Pocos cortes y largos (la primera versión, de 0,4 s cada uno, no se alcanzaba a entender).
// Titulares copiados de la franja de cada canal en ese momento.
const CORTES: Corte[] = [
  { src: "n1", desde: 0, dur: 2.0, lugar: "Rancagua · 2025", medio: "T13", titular: "Acompañó a su hijo a vender una consola y lo mataron" },
  { src: "n4", desde: 0.3, dur: 1.5, lugar: "Rancagua · 2025", medio: "Meganoticias", titular: "Asesinan a padre en venta de consola" },
  { src: "n5", desde: 0.1, dur: 2.75, lugar: "Concepción · 2025", medio: "CHV", titular: "Viajó a comprar auto: lo asaltaron y mataron" },
];
// Lo que se oye: una frase de cada nota, tal cual (cortes/voz-*.m4a, sacadas de las notas originales).
const VOCES = [
  { src: "voz-t13", en: 0, dur: 3.55, texto: "400 mil pesos era el precio acordado" },
  { src: "voz-chv", en: 3.5, dur: 2.75, texto: "…cuando fue interceptado por los asaltantes" },
];
const NOTICIAS_DUR = CORTES.reduce((t, c) => t + s(c.dur), 0);

const ESCENAS: { id: string; dur: number; C: () => React.ReactElement }[] = [
  { id: "noticias", dur: NOTICIAS_DUR, C: () => <Noticias /> },
  { id: "hook", dur: L_HOOK.dur, C: () => <Gancho /> },
  { id: "perfil", dur: L_PERFIL.dur, C: () => <Perfil /> },
  { id: "problema", dur: L_PROBLEMA.dur, C: () => <Problema /> },
  { id: "trado", dur: L_TRADO.dur, C: () => <EnTrado /> },
  { id: "antes", dur: L_ANTES.dur, C: () => <Antes /> },
  { id: "cierre", dur: L_CIERRE.dur + s(1.2), C: () => <Cierre /> },
];

export const DURACION = ESCENAS.reduce((t, e) => t + e.dur, 0);

const COMPAS = s(2.5);
const inicioDe = (id: string) => {
  let t = 0;
  for (const e of ESCENAS) { if (e.id === id) return t; t += e.dur; }
  return t;
};

// Tono serio: nada de música sobre las noticias ni el problema. Entra con Trado.
const Musica: React.FC = () => {
  const entra = inicioDe("trado");
  const ritmo = Math.ceil(inicioDe("antes") / COMPAS) * COMPAS;
  const sinVoz = DURACION - s(1.2);
  const nivel = (f: number) => interpolate(f, [entra, entra + 10, sinVoz, sinVoz + 8, DURACION - 6, DURACION], [0, 1, 1, 1.5, 1.5, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      <Audio src={staticFile("sfx/musica_base.wav")} volume={(f) => 0.06 * nivel(f)} />
      <Sequence from={ritmo} layout="none">
        <Audio src={staticFile("sfx/musica_ritmo.wav")} volume={(f) => 0.13 * nivel(f + ritmo) * Math.min(1, f / 8)} />
      </Sequence>
    </>
  );
};

export const EnPersona: React.FC<{ musica?: boolean }> = ({ musica = true }) => {
  let desde = 0;
  return (
    <AbsoluteFill style={{ fontFamily: FUENTE, background: C.tinta }}>
      {musica && <Musica />}
      {ESCENAS.map((e, i) => {
        const inicio = desde;
        desde += e.dur;
        return (
          <Sequence key={e.id} from={inicio} durationInFrames={e.dur}>
            {i > 0 ? <Entrada>{e.C()}</Entrada> : e.C()}
            {i > 1 && <Destello en={0} fuerza={0.25} />}
            {i > 1 && <Sfx nombre="whoosh_baja" en={0} vol={0.3} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const Entrada: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ transform: `scale(${1 + 0.04 * (1 - suave(f, 0, 10))})` }}>{children}</AbsoluteFill>;
};

const Desde: React.FC<{ en: number; hasta?: number; children: React.ReactNode }> = ({ en, hasta, children }) => (
  <Sequence from={en} durationInFrames={hasta === undefined ? undefined : hasta - en} layout="none">{children}</Sequence>
);

const corte = (src: string) => staticFile(`${CARPETA}/noticias/cortes/${src}.mp4`);

// ── Noticias: cortes rápidos de TV real ─────────────────────────────────────

const CorteTV: React.FC<{ c: Corte; largo: number }> = ({ c, largo }) => {
  const f = useCurrentFrame();
  const zoom = 1 + 0.12 * (1 - suave(f, 0, 6)) + 0.06 * (f / largo); // golpe de zoom y sigue acercándose
  const tb = Math.round(c.desde * 30);
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      {c.vertical ? (
        <OffthreadVideo muted src={corte(c.src)} trimBefore={tb}
          style={{ position: "absolute", inset: 0, width: 1080, height: 1920, objectFit: "cover", transform: `scale(${zoom})` }} />
      ) : (
        <>
          {/* El mismo video, gigante y borroso, llena lo que sobra arriba y abajo */}
          <OffthreadVideo muted src={corte(c.src)} trimBefore={tb}
            style={{ position: "absolute", top: 0, left: (1080 - 3414) / 2, width: 3414, height: 1920, filter: "blur(36px) brightness(0.45)" }} />
          <OffthreadVideo muted src={corte(c.src)} trimBefore={tb}
            style={{ position: "absolute", top: 640, left: 0, width: 1080, height: 608, transform: `scale(${zoom})`, boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }} />
          {c.titular && (
            <div style={{ position: "absolute", top: 1290, left: 60, right: 60, textAlign: "center", transform: `scale(${0.9 + 0.1 * rebote(f, 1)})` }}>
              <span style={{ fontSize: 58, fontWeight: 800, lineHeight: 1.22, letterSpacing: "-0.02em", color: C.blanco, background: C.rojo,
                padding: "4px 18px", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone", borderRadius: 10 }}>
                «{c.titular}»
              </span>
              <div style={{ marginTop: 18, fontSize: 32, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>{c.medio}</div>
            </div>
          )}
        </>
      )}
      <div style={{ position: "absolute", top: c.vertical ? 1560 : 470, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <span style={{ fontSize: 40, fontWeight: 800, color: C.tinta, background: C.blanco, padding: "12px 30px", borderRadius: 999, boxShadow: "0 10px 30px rgba(0,0,0,0.4)" }}>
          📍 {c.lugar}
        </span>
      </div>
    </AbsoluteFill>
  );
};

/** Lo que dice el periodista, en subtítulo: se entiende sin sonido. */
const VozTV: React.FC<{ texto: string; dur: number }> = ({ texto, dur }) => {
  const f = useCurrentFrame();
  const a = suave(f, 0, 5) * (1 - suave(f, s(dur) - 5, 5));
  return (
    <div style={{ position: "absolute", top: 1560, left: 70, right: 70, textAlign: "center", opacity: a }}>
      <span style={{ fontSize: 50, fontWeight: 700, fontStyle: "italic", color: C.blanco, background: "rgba(0,0,0,0.6)", padding: "6px 18px", borderRadius: 12,
        boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone", lineHeight: 1.35 }}>«{texto}»</span>
    </div>
  );
};

const Noticias: React.FC = () => {
  let t = 0;
  return (
    <AbsoluteFill>
      {CORTES.map((c, i) => {
        const en = t;
        const largo = s(c.dur);
        t += largo;
        return (
          <Sequence key={c.src} from={en} durationInFrames={largo} layout="none">
            <CorteTV c={c} largo={largo} />
            {i > 0 && <Destello en={0} fuerza={0.35} />}
            <Sfx nombre="golpe" en={0} vol={i === 0 ? 0.5 : 0.35} />
          </Sequence>
        );
      })}
      {VOCES.map((v) => (
        <Sequence key={v.src} from={s(v.en)} durationInFrames={s(v.dur)} layout="none">
          <Audio src={corte(v.src).replace(".mp4", ".m4a")} />
          <VozTV texto={v.texto} dur={v.dur} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// ── Gancho ──────────────────────────────────────────────────────────────────

/** Panel de TV chico que sigue pasando detrás tuyo. */
const Panel: React.FC<{ src: string; desde: number; x: number; y: number; giro: number; en: number; apaga: number }> = ({ src, desde, x, y, giro, en, apaga }) => {
  const f = useCurrentFrame();
  const k = rebote(f, en);
  const a = suave(f, apaga, 10);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 440, height: 248, borderRadius: 18, overflow: "hidden", border: "5px solid rgba(255,255,255,0.9)",
      boxShadow: "0 20px 50px rgba(0,0,0,0.5)", transform: `scale(${k * (1 - 0.12 * a)}) rotate(${giro}deg)`, opacity: Math.min(1, k * 2) * (1 - 0.65 * a),
      filter: `grayscale(${a})` }}>
      <OffthreadVideo muted src={corte(src)} trimBefore={Math.round(desde * 30)} style={{ width: 440, height: 248 }} />
    </div>
  );
};

/** Lo que se vendía en cada caso: cosas normales. */
const Cosa: React.FC<{ emoji: string; texto: string; en: number; x: number; giro: number }> = ({ emoji, texto, en, x, giro }) => {
  const f = useCurrentFrame();
  if (f < en) return null;
  const k = rebote(f, en);
  return (
    <div style={{ position: "absolute", left: x, top: 430, width: 290, padding: "26px 0 22px", background: C.blanco, borderRadius: 36, textAlign: "center",
      boxShadow: "0 24px 60px rgba(0,0,0,0.45)", transform: `translateY(${(1 - k) * 120}px) scale(${k}) rotate(${giro}deg)` }}>
      <div style={{ fontSize: 130, lineHeight: 1 }}>{emoji}</div>
      <div style={{ marginTop: 10, fontSize: 44, fontWeight: 800, color: C.tinta }}>{texto}</div>
    </div>
  );
};

// «Todas esas personas se juntaron a hacer algo normal: vender algo por internet»
const Gancho: React.FC = () => {
  const L = L_HOOK;
  const normal = L.en(2.2);
  const f = useCurrentFrame();
  return (
    <Toma carpeta={CARPETA} archivo="hook" origen={0.5} cara={{ x: 540, y: 1015 }} linea={L}
      modos={[[0, "real"]]}
      palabras={[
        [["Todas", 0.22], ["esas", 0.8], ["personas", 1.02]],
        [["se", 1.28], ["juntaron", 1.48], ["a", 1.8], ["hacer", 1.96]],
        [["algo", 2.04], ["normal:", 2.2]],
        [["vender", 3.04], ["algo", 3.3], ["por", 3.5], ["internet.", 3.62]],
      ]}>
      {/* Tu fondo real, oscurecido mientras siguen las noticias */}
      <AbsoluteFill style={{ background: "rgba(8,10,30,0.55)", opacity: 1 - 0.6 * suave(f, normal, 10) }} />
      <Panel src="n1" desde={0.9} x={50} y={215} giro={-3} en={0} apaga={normal} />
      <Panel src="n5" desde={0.9} x={590} y={235} giro={2.5} en={3} apaga={normal} />
      <Panel src="n2" desde={1.3} x={60} y={480} giro={2} en={6} apaga={normal} />
      <Panel src="n7" desde={0.2} x={580} y={500} giro={-2} en={9} apaga={normal} />
      <Sfx nombre="pop_grave" en={0} vol={0.5} />
      <Sfx nombre="pop" en={6} vol={0.5} />
      <Desde en={normal} hasta={L.en(3.04)}>
        <Palabra texto="algo normal" en={0} y={400} size={120} fondo={C.blanco} color={C.tinta} />
      </Desde>
      <Cosa emoji="🎮" texto="Consola" en={L.en(3.04)} x={40} giro={-4} />
      <Cosa emoji="🚗" texto="Auto" en={L.en(3.3)} x={395} giro={2} />
      <Cosa emoji="📱" texto="Celular" en={L.en(3.5)} x={750} giro={-2} />
      <Desde en={L.en(3.04)}>
        <Palabra texto="por internet" en={L.en(3.62) - L.en(3.04)} y={250} size={96} fondo={C.azul} giro={-2} />
      </Desde>
      <Sfx nombre="golpe" en={normal} vol={0.6} />
      <Sfx nombre="pop_grave" en={L.en(3.04)} />
      <Sfx nombre="pop" en={L.en(3.3)} />
      <Sfx nombre="pop_agudo" en={L.en(3.5)} />
    </Toma>
  );
};

// ── Perfil ──────────────────────────────────────────────────────────────────

/** Un perfil cualquiera que se arma pieza por pieza: diseño nuestro, sin interfaz de ninguna app. */
const PerfilFalso: React.FC<{ en: number; perfil: number; foto: number; usuario: number; falso: number }> = ({ en, perfil, foto, usuario, falso }) => {
  const f = useCurrentFrame();
  if (f < en) return null;
  const k = rebote(f, en);
  const nombre = "vendo_todo22";
  const letras = Math.max(0, Math.min(nombre.length, Math.floor((f - usuario) / 1.3)));
  const anillo = suave(f, perfil, 8) * (1 - suave(f, foto + 4, 8));
  const conFoto = f >= foto;
  const sello = f >= falso ? rebote(f, falso) : 0;
  return (
    <div style={{ position: "absolute", top: 250, left: 90, right: 90, transform: `translateY(${(1 - k) * 150}px) scale(${0.8 + 0.2 * k}) rotate(-2deg)`, opacity: Math.min(1, k * 2) }}>
      <div style={{ background: C.blanco, borderRadius: 44, padding: "40px 44px", boxShadow: `0 30px 70px rgba(10,10,40,0.45), 0 0 0 ${10 * anillo}px rgba(255,255,255,0.45)`,
        display: "flex", gap: 34, alignItems: "center" }}>
        <div style={{ width: 190, height: 190, borderRadius: 999, flexShrink: 0, position: "relative", overflow: "hidden",
          background: conFoto ? "linear-gradient(135deg, #FFD7A8, #FF9F7A)" : "#D7DAE5", transform: `scale(${conFoto ? 0.85 + 0.15 * rebote(f, foto) : 1})` }}>
          {conFoto ? (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 130 }}>😎</div>
          ) : (
            <>
              <div style={{ position: "absolute", left: 60, top: 36, width: 70, height: 70, borderRadius: 999, background: "#A9AEC0" }} />
              <div style={{ position: "absolute", left: 28, top: 122, width: 134, height: 110, borderRadius: 999, background: "#A9AEC0" }} />
            </>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ height: 66, fontSize: 56, fontWeight: 800, color: C.tinta, letterSpacing: "-0.02em" }}>
            {f >= usuario ? (
              <>@{nombre.slice(0, letras)}<span style={{ opacity: letras < nombre.length && f % 10 < 5 ? 1 : 0, color: C.medio }}>|</span></>
            ) : (
              <div style={{ width: 300, height: 40, marginTop: 12, borderRadius: 12, background: C.linea }} />
            )}
          </div>
          <div style={{ marginTop: 12, fontSize: 34, fontWeight: 600, color: C.gris }}>Se unió hoy · 0 ventas</div>
        </div>
      </div>
      {sello > 0 && (
        <div style={{ position: "absolute", right: -10, top: -40, padding: "10px 34px", border: `8px solid ${C.rojo}`, borderRadius: 20, color: C.rojo, background: "rgba(255,255,255,0.92)",
          fontSize: 76, fontWeight: 800, letterSpacing: "0.06em", transform: `rotate(12deg) scale(${1 + 1.5 * (1 - sello)})`, opacity: Math.min(1, sello * 2) }}>
          FALSO
        </div>
      )}
    </div>
  );
};

/** Cronómetro que da la vuelta: el perfil está listo en dos minutos. */
const Reloj: React.FC<{ en: number }> = ({ en }) => {
  const f = useCurrentFrame();
  if (f < en) return null;
  const k = rebote(f, en);
  const p = suave(f, en, 14);
  const r = 70, L = 2 * Math.PI * r;
  return (
    <div style={{ position: "absolute", top: 440, right: 80, display: "flex", alignItems: "center", gap: 20, background: C.rojo, color: C.blanco, borderRadius: 999,
      padding: "12px 36px 12px 14px", boxShadow: "0 20px 50px rgba(232,62,62,0.45)", transform: `scale(${k}) rotate(-3deg)`, zIndex: 3 }}>
      <svg width={110} height={110} viewBox="0 0 170 170">
        <circle cx={85} cy={85} r={r} fill="rgba(255,255,255,0.18)" />
        <circle cx={85} cy={85} r={r} fill="none" stroke={C.blanco} strokeWidth={14} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - p)} transform="rotate(-90 85 85)" />
        <line x1={85} y1={85} x2={85 + 46 * Math.sin(2 * Math.PI * p)} y2={85 - 46 * Math.cos(2 * Math.PI * p)} stroke={C.blanco} strokeWidth={9} strokeLinecap="round" />
      </svg>
      <div style={{ fontSize: 66, fontWeight: 800, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
        {Math.min(2, Math.floor(p * 2.999))}:00 min
      </div>
    </div>
  );
};

// «En casi todos los casos pasa lo mismo: te juntas con una persona y solo conoces su perfil,
//  su foto y su usuario. Un perfil falso se puede crear en dos minutos»
const Perfil: React.FC = () => {
  const L = L_PERFIL;
  const marca = L.en(4.95);
  const r = (seg: number) => L.en(seg) - marca; // tiempos dentro de la parte con fondo de marca
  return (
    <Toma carpeta={CARPETA} archivo="perfil" origen={22.8} cara={{ x: 562, y: 958 }} linea={L}
      modos={[[0, "real"]]}
      palabras={[
        [["y", 3.1], ["en", 3.18], ["casi", 3.26], ["todos", 3.4], ["los", 3.6], ["casos", 3.74]],
        [["pasa", 3.98], ["lo", 4.32], ["mismo:", 4.46]],
        [["te", 4.98], ["juntas", 5.08], ["con", 5.34], ["una", 5.46], ["persona", 5.58]],
        [["y", 5.96], ["solo", 6.2], ["conoces", 6.34]],
        [["su", 6.86], ["perfil,", 7.18], ["su", 7.84], ["foto", 7.92]],
        [["y", 8.22], ["su", 8.74], ["usuario.", 8.86]],
        [["Un", 10.0], ["perfil", 10.18], ["falso", 10.52]],
        [["se", 10.88], ["puede", 11.1], ["crear", 11.24]],
        [["en", 11.48], ["dos", 11.76], ["minutos.", 11.94]],
      ]}>
      <Desde en={0} hasta={marca}>
        <Palabra texto="en casi todos los casos" en={L.en(3.26)} y={300} size={72} fondo={C.blanco} color={C.tinta} giro={2} />
        <Palabra texto="lo mismo" en={L.en(4.46)} y={440} size={120} fondo={C.rojo} />
      </Desde>
      <Desde en={marca} hasta={L.en(6.34)}>
        <Chat y={250} mensajes={[
          { de: "otro", texto: "Hola! ¿Sigue disponible? 👀", en: 2 },
          { de: "otro", texto: "Te lo compro hoy. ¿Nos juntamos a las 21:00?", en: r(5.58) },
        ]} />
      </Desde>
      <Desde en={L.en(6.34)}>
        <PerfilFalso en={0} perfil={r(7.18) - r(6.34)} foto={r(7.92) - r(6.34)} usuario={r(8.86) - r(6.34)} falso={r(10.52) - r(6.34)} />
        <Reloj en={r(11.76) - r(6.34)} />
      </Desde>
      <Sfx nombre="pop_grave" en={L.en(3.26)} vol={0.6} />
      <Sfx nombre="golpe" en={L.en(4.46)} vol={0.6} />
      <Sfx nombre="burbuja" en={marca + 2} />
      <Sfx nombre="burbuja" en={L.en(5.58)} />
      <Sfx nombre="whoosh_sube" en={L.en(6.34)} vol={0.45} />
      <Sfx nombre="pop" en={L.en(7.18)} />
      <Sfx nombre="brillo" en={L.en(7.92)} vol={0.6} />
      <Sfx nombre="tecleo" en={L.en(8.86)} vol={0.6} />
      <Sfx nombre="tachon" en={L.en(10.52)} />
      <Sfx nombre="tic" en={L.en(11.76)} />
    </Toma>
  );
};

// ── Problema ────────────────────────────────────────────────────────────────

/** Alguien sin cara: lo único que sabes de él es un perfil. */
const Desconocido: React.FC<{ en: number }> = ({ en }) => {
  const f = useCurrentFrame();
  if (f < en) return null;
  const k = rebote(f, en);
  const late = 1 + 0.04 * Math.sin((f - en) / 4);
  return (
    <div style={{ position: "absolute", left: 700, top: 470, width: 320, height: 410, borderRadius: 40, background: "#1B2240", border: `6px solid ${C.rojo}`,
      boxShadow: "0 30px 80px rgba(0,0,0,0.5)", overflow: "hidden", transform: `translateX(${(1 - k) * 500}px) rotate(3deg)` }}>
      <div style={{ position: "absolute", left: 100, top: 66, width: 120, height: 120, borderRadius: 999, background: "#3A4266" }} />
      <div style={{ position: "absolute", left: 50, top: 205, width: 220, height: 270, borderRadius: 110, background: "#3A4266" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 40, textAlign: "center", fontSize: 170, fontWeight: 800, color: C.rojo, transform: `scale(${late})` }}>?</div>
    </div>
  );
};

// «El problema no es juntarse en persona; es juntarse con una persona que no conoces»
const Problema: React.FC = () => {
  const L = L_PROBLEMA;
  return (
    <Toma carpeta={CARPETA} archivo="problema" origen={37.8} cara={{ x: 527, y: 980 }} linea={L}
      modos={[[0, "real"]]}
      palabras={[
        [["El", 0.24], ["problema", 0.26], ["no", 0.5], ["es", 0.66]],
        [["juntarse", 0.68], ["en", 1.0], ["persona;", 1.16]],
        [["es", 1.86], ["juntarse", 2.06], ["con", 2.48], ["una", 2.66], ["persona", 2.86]],
        [["que", 3.2], ["no", 3.44], ["conoces.", 3.62]],
      ]}>
      <Desde en={0} hasta={L.en(1.86)}>
        <Palabra texto="en persona" en={L.en(1.0)} y={250} size={110} fondo={C.blanco} color={C.tinta} giro={-3} />
        <Salto emoji="🤝" en={L.en(1.16)} style={{ left: 700, top: 400 }} size={200} />
      </Desde>
      <Desde en={L.en(1.16) + 4} hasta={L.en(1.86)}>
        <Pildora texto="✓ Eso está bien" fondo={C.verde} color={C.blanco} style={{ top: 470, left: 80, fontSize: 48 }} />
      </Desde>
      <Desconocido en={L.en(2.48)} />
      <Palabra texto={"con alguien\nque no conoces"} en={L.en(3.44)} y={240} size={80} fondo={C.rojo} giro={3} />
      <Sfx nombre="pop" en={L.en(1.0)} />
      <Sfx nombre="pop_agudo" en={L.en(1.16)} />
      <Sfx nombre="whoosh_sube" en={L.en(2.48)} vol={0.5} />
      <Sfx nombre="golpe" en={L.en(3.44)} />
    </Toma>
  );
};

// ── Trado ───────────────────────────────────────────────────────────────────

// «En Trado,» (el resto de esa toma se corta: describía cosas que la app no hace)
const EnTrado: React.FC = () => {
  const L = L_TRADO;
  const f = useCurrentFrame();
  return (
    <Toma carpeta={CARPETA} archivo="trado" origen={60.7} cara={{ x: 534, y: 986 }} linea={L}
      modos={[[0, "fuera"]]}
      palabras={[[["En", 0.2], ["Trado,", 0.35]]]}>
      <Rayos en={L.en(0.35)} x={540} y={760} />
      <div style={{ position: "absolute", top: 640, width: "100%", textAlign: "center", color: C.blanco, fontWeight: 800, fontSize: 220, letterSpacing: "-0.04em",
        transform: `scale(${f >= L.en(0.35) ? rebote(f, L.en(0.35)) : 0})` }}>trado</div>
      <Sfx nombre="golpe" en={L.en(0.35)} />
    </Toma>
  );
};

/** Igual a la tarjeta "Con quién tratas" de la sala: nombre, verificado, nota y salas. Nada de RUT ni teléfono. */
const ConQuienTratas: React.FC<{ en: number; y: number; nombre: string; rol: string; inicial: string; color: string; giro?: number; marcas: number[]; nota: string; salas: string }> =
  ({ en, y, nombre, rol, inicial, color, giro = 0, marcas, nota, salas }) => {
    const f = useCurrentFrame();
    if (f < en) return null;
    const k = rebote(f, en);
    const chip = (i: number, fondo: string, col: string, texto: string) => {
      if (f < marcas[i]) return null;
      return (
        <span style={{ background: fondo, color: col, padding: "8px 20px", borderRadius: 999, fontSize: 32, fontWeight: 800, transform: `scale(${rebote(f, marcas[i])})`, display: "inline-block" }}>{texto}</span>
      );
    };
    return (
      <div style={{ position: "absolute", top: y, left: 70, right: 70, background: C.blanco, borderRadius: 36, padding: "22px 30px",
        boxShadow: "0 30px 70px rgba(10,10,40,0.4)", transform: `translateY(${(1 - k) * 200}px) rotate(${giro}deg)`, opacity: Math.min(1, k * 2), display: "flex", gap: 28, alignItems: "center" }}>
        <div style={{ width: 110, height: 110, borderRadius: 999, background: color, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 64, fontWeight: 800, color: C.blanco }}>{inicial}</div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.gris, letterSpacing: "0.05em", textTransform: "uppercase" }}>Con quién tratas · {rol}</div>
          <div style={{ marginTop: 2, fontSize: 52, fontWeight: 800, color: C.tinta, letterSpacing: "-0.02em" }}>{nombre}</div>
          <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
            {chip(0, "#DDF5EA", "#0B8A5F", "✓ Verificado")}
            {chip(1, "#FFF1D6", "#B7791F", `★ ${nota}`)}
            {chip(2, "#E6E8FB", C.azul, salas)}
          </div>
        </div>
      </div>
    );
  };

// «Antes de juntarte ya sabes quién es la otra persona, y ella también sabe quién eres tú»
const Antes: React.FC = () => {
  const L = L_ANTES;
  const f = useCurrentFrame();
  const une = L.en(4.15);
  const u = suave(f, une - 6, 10);
  return (
    <Toma carpeta={CARPETA} archivo="antes" origen={80.6} cara={{ x: 537, y: 1033 }} linea={L}
      modos={[[0, "real"]]}
      palabras={[
        [["Antes", 0.23], ["de", 0.29], ["juntarte,", 0.49]],
        [["ya", 1.25], ["sabes", 1.35], ["quién", 1.49], ["es", 1.65]],
        [["la", 1.77], ["otra", 1.85], ["persona,", 1.99]],
        [["y", 2.43], ["ella", 2.95], ["también", 3.27]],
        [["sabe", 3.61], ["quién", 3.77], ["eres", 3.95], ["tú.", 4.15]],
      ]}>
      <Desde en={0} hasta={L.en(1.25)}>
        <Palabra texto="antes de juntarte" en={L.en(0.23)} y={330} size={92} fondo={C.blanco} color={C.azul} giro={-2} />
      </Desde>
      <ConQuienTratas en={L.en(1.25)} y={215} nombre="Camila R." rol="Vendedora" inicial="C" color={C.naranjo} giro={-2}
        marcas={[L.en(1.49), L.en(1.85), L.en(1.99)]} nota="4,9" salas="12 salas en Trado" />
      {/* Las dos tarjetas se unen: las dos personas ya saben con quién van a tratar */}
      {f >= une - 6 && (
        <div style={{ position: "absolute", left: 540 - 46, top: 397, width: 92, height: 92, borderRadius: 999, background: C.verde, border: `6px solid ${C.blanco}`,
          display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${rebote(f, une - 6)})`, zIndex: 2, boxShadow: "0 10px 30px rgba(16,185,129,0.6)" }}>
          <svg width={52} height={52} viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={30} strokeDashoffset={30 * (1 - u)} /></svg>
        </div>
      )}
      <ConQuienTratas en={L.en(2.95)} y={470} nombre="Tú" rol="Comprador" inicial="T" color={C.medio} giro={2}
        marcas={[L.en(3.61), L.en(3.77), L.en(3.95)]} nota="5,0" salas="3 salas en Trado" />
      <Sfx nombre="pop_grave" en={L.en(0.23)} vol={0.6} />
      <Sfx nombre="whoosh_sube" en={L.en(1.25)} vol={0.5} />
      <Sfx nombre="pop" en={L.en(1.49)} />
      <Sfx nombre="pop" en={L.en(1.85)} />
      <Sfx nombre="pop_agudo" en={L.en(1.99)} />
      <Sfx nombre="whoosh_sube" en={L.en(2.95)} vol={0.5} />
      <Sfx nombre="pop" en={L.en(3.61)} />
      <Sfx nombre="pop" en={L.en(3.77)} />
      <Sfx nombre="pop_agudo" en={L.en(3.95)} />
      <Sfx nombre="brillo" en={une - 6} vol={0.7} />
    </Toma>
  );
};

// «Si vas a comprar, vender o trabajar, hazlo con una persona real. Hazlo en trado.cl»
const Cierre: React.FC = () => {
  const L = L_CIERRE;
  const f = useCurrentFrame();
  const tr = L.en(4.36);
  return (
    <Toma carpeta={CARPETA} archivo="cierre" origen={87.8} cara={{ x: 544, y: 1051 }} linea={L}
      modos={[[0, "real"], [4.36, "abajo"], [5.7, "fuera"]]}
      palabras={[
        [["Si", 0.26], ["vas", 0.3], ["a", 0.46], ["comprar,", 0.7]],
        [["vender", 1.14], ["o", 1.56], ["trabajar,", 1.86]],
        [["hazlo", 2.68], ["con", 2.82], ["una", 2.94], ["persona", 3.06], ["real.", 3.4]],
        [["Hazlo", 4.36], ["en", 4.74], ["trado.cl", 4.96]],
      ]}>
      <Desde en={0} hasta={L.en(2.68)}>
        <Palabra texto="🛍️ comprar" en={L.en(0.7)} y={290} size={78} fondo={C.blanco} color={C.tinta} giro={-4} />
        <Palabra texto="🏷️ vender" en={L.en(1.14)} y={420} size={78} fondo={C.blanco} color={C.tinta} giro={3} />
        <Palabra texto="🛠️ trabajar" en={L.en(1.86)} y={550} size={78} fondo={C.blanco} color={C.tinta} giro={-2} />
      </Desde>
      <Desde en={L.en(2.68)} hasta={tr}>
        <Palabra texto={"con una\npersona real"} en={L.en(3.06) - L.en(2.68)} y={280} size={100} fondo={C.verde} giro={-3} />
        <Salto emoji="✅" en={L.en(3.4) - L.en(2.68)} style={{ left: 760, top: 500 }} size={170} />
      </Desde>
      <Desde en={tr}>
        <Rayos en={0} x={540} y={500} />
        <div style={{ position: "absolute", top: 320, width: "100%", textAlign: "center", color: C.blanco, fontWeight: 800, fontSize: 200, letterSpacing: "-0.04em", transform: `scale(${rebote(f, tr)})` }}>trado</div>
        <Pildora texto="trado.cl" style={{ top: 600, left: "50%", transform: `translateX(-50%) scale(${f >= L.en(4.96) ? rebote(f, L.en(4.96)) : 0})`, fontSize: 70, color: C.azul, padding: "22px 74px" }} />
        <Confeti en={L.en(4.96) - tr} x={540} y={420} n={60} semilla="final" />
      </Desde>
      <Sfx nombre="pop_grave" en={L.en(0.7)} />
      <Sfx nombre="pop" en={L.en(1.14)} />
      <Sfx nombre="pop_agudo" en={L.en(1.86)} />
      <Sfx nombre="whoosh_sube" en={L.en(3.06)} vol={0.4} />
      <Sfx nombre="campanas" en={L.en(3.4)} vol={0.35} />
      <Sfx nombre="golpe" en={tr} />
      <Sfx nombre="brillo" en={L.en(4.96)} vol={0.6} />
    </Toma>
  );
};
