import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { C, FUENTE, OSCURO, rebote, s, suave } from "../marca";
import { Pildora, Sfx } from "../piezas/base";
import { Confeti, Destello, Palabra } from "../piezas/efectos";
import { linea, Toma } from "../piezas/Toma";

// Reel «En persona» (violencia en ventas cara a cara por Marketplace). BORRADOR: primer corte
// con la grabación tal cual llegó por WhatsApp (7 clips unidos en video.mp4, 576×1024 escalado).
// Noticias reales en public/material/nuevo-2026-11-08/noticias.md. Las tarjetas del inicio son
// diseño nuestro (lugar, fecha, medio y el hecho en palabras nuestras) hasta tener las capturas.
//
// OJO: la toma "trado" dice cosas que la app NO hace (todos verificados; ver RUT, teléfono y
// carnet del otro). La verificación es opcional y la tarjeta "Con quién tratas" solo muestra
// Verificado / Sin verificar, nota y salas (src/components/sala/ConQuienTratas.tsx).
// Lleva un sello de BORRADOR en pantalla hasta que se regrabe esa frase.
//
// toma      origen en video.mp4   cara
// hook      0,5–4,8               540, 1015
// perfil    22,8–35,5 (2ª toma)   562, 958
// problema  37,8–41,9 (1ª toma)   527, 980
// trado     60,7–67,0 (2ª toma)   534, 986
// antes     80,6–85,5 (2ª toma)   537, 1033
// cierre    87,8–93,8             544, 1051

const CARPETA = "material/nuevo-2026-11-08";

const L_HOOK = linea([[0.1, 4.2]]);
const L_PERFIL = linea([[0.08, 1.55], [4.45, 12.55]]);
const L_PROBLEMA = linea([[0.15, 1.6], [1.8, 4.0]]);
const L_TRADO = linea([[0.1, 0.75], [0.95, 6.2]]);
const L_ANTES = linea([[0.12, 4.75]]);
const L_CIERRE = linea([[0.15, 3.9], [4.28, 5.85]]);

const NOTICIAS_DUR = s(3.4);

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

// Tono serio: nada de música sobre las noticias ni el problema. Entra suave con Trado.
const Musica: React.FC = () => {
  const entra = inicioDe("trado");
  const ritmo = Math.ceil(inicioDe("antes") / COMPAS) * COMPAS;
  const sinVoz = DURACION - s(1.2);
  const nivel = (f: number) => interpolate(f, [entra, entra + 20, sinVoz, sinVoz + 8, DURACION - 6, DURACION], [0, 1, 1, 1.5, 1.5, 0],
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
            <Entrada>{e.C()}</Entrada>
            {i > 1 && <Destello en={0} fuerza={0.25} />}
            {i > 1 && <Sfx nombre="whoosh_baja" en={0} vol={0.3} />}
          </Sequence>
        );
      })}
      <Borrador />
    </AbsoluteFill>
  );
};

/** Sello para que este corte nunca se publique por error (ver la nota de la toma "trado"). */
const Borrador: React.FC = () => (
  <div style={{ position: "absolute", top: 150, right: 30, padding: "8px 20px", borderRadius: 12, background: C.rojo, color: C.blanco,
    fontSize: 26, fontWeight: 800, letterSpacing: "0.04em", opacity: 0.85 }}>BORRADOR</div>
);

const Entrada: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ transform: `scale(${1 + 0.04 * (1 - suave(f, 0, 10))})` }}>{children}</AbsoluteFill>;
};

const Desde: React.FC<{ en: number; hasta?: number; children: React.ReactNode }> = ({ en, hasta, children }) => (
  <Sequence from={en} durationInFrames={hasta === undefined ? undefined : hasta - en} layout="none">{children}</Sequence>
);

// ── Noticias ────────────────────────────────────────────────────────────────

type Nota = { lugar: string; fecha: string; medio: string; texto: string };
// Hechos de noticias.md, contados con palabras nuestras (no son titulares citados).
const NOTAS: Nota[] = [
  { lugar: "Rancagua", fecha: "Jul 2025", medio: "T13 · Meganoticias", texto: "Matan a un padre que acompañó a su hijo a vender una consola" },
  { lugar: "Concepción", fecha: "Ago 2025", medio: "Meganoticias · T13", texto: "Muere baleado tras viajar a comprar un auto visto en Marketplace" },
  { lugar: "Valparaíso", fecha: "Oct 2024", medio: "Meganoticias", texto: "Falsos compradores de un auto matan a un padre y hieren a su hijo" },
  { lugar: "Los Ángeles", fecha: "Mar 2026", medio: "La Tribuna", texto: "Asaltan con pistola y cuchillo a mujer que vendía un iPhone" },
];

const TarjetaNota: React.FC<{ n: Nota; en: number; y: number; giro: number }> = ({ n, en, y, giro }) => {
  const f = useCurrentFrame();
  if (f < en) return null;
  const k = rebote(f, en);
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: y, background: C.blanco, borderRadius: 28, padding: "28px 36px",
      boxShadow: "0 30px 70px rgba(0,0,0,0.5)", transform: `translateY(${(1 - k) * 80}px) scale(${1.25 - 0.25 * k}) rotate(${giro}deg)`, opacity: Math.min(1, k * 2) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase" }}>
        <span style={{ background: C.rojo, color: C.blanco, padding: "4px 14px", borderRadius: 8 }}>{n.lugar}</span>
        <span style={{ color: C.gris }}>{n.fecha} · {n.medio}</span>
      </div>
      <div style={{ marginTop: 14, fontSize: 46, fontWeight: 800, lineHeight: 1.12, letterSpacing: "-0.02em", color: C.tinta }}>{n.texto}</div>
    </div>
  );
};

const Noticias: React.FC = () => {
  const paso = s(0.62);
  return (
    <AbsoluteFill style={{ background: OSCURO }}>
      <Palabra texto="Ventas por internet en Chile" en={0} y={250} size={50} giro={0} color={C.blanco} />
      {NOTAS.map((n, i) => (
        <React.Fragment key={n.lugar}>
          <TarjetaNota n={n} en={6 + i * paso} y={380 + i * 250} giro={i % 2 ? 2 : -2} />
          <Sfx nombre="golpe" en={6 + i * paso} vol={0.7} />
        </React.Fragment>
      ))}
    </AbsoluteFill>
  );
};

// «Todas esas personas se juntaron a hacer algo normal: vender algo por internet»
const Gancho: React.FC = () => {
  const L = L_HOOK;
  return (
    <Toma carpeta={CARPETA} archivo="hook" origen={0.5} cara={{ x: 540, y: 1015 }} linea={L}
      modos={[[0, "real"]]}
      palabras={[
        [["Todas", 0.22], ["esas", 0.8], ["personas", 1.02]],
        [["se", 1.28], ["juntaron", 1.48], ["a", 1.8], ["hacer", 1.96]],
        [["algo", 2.04], ["normal:", 2.2]],
        [["vender", 3.04], ["algo", 3.3], ["por", 3.5], ["internet.", 3.62]],
      ]}>
      <Palabra texto="algo normal" en={L.en(2.2)} y={330} size={110} fondo={C.blanco} color={C.tinta} />
      <Sfx nombre="pop_grave" en={L.en(2.2)} />
    </Toma>
  );
};

/** Un perfil cualquiera, como los que se crean en dos minutos: diseño nuestro, sin interfaz de ninguna app. */
const PerfilFalso: React.FC<{ en: number; dudas: number }> = ({ en, dudas }) => {
  const f = useCurrentFrame();
  if (f < en) return null;
  const k = rebote(f, en);
  const d = suave(f, dudas, 10);
  return (
    <div style={{ position: "absolute", top: 300, left: 110, right: 110, background: C.blanco, borderRadius: 40, padding: "36px 40px",
      boxShadow: "0 30px 70px rgba(10,10,40,0.4)", transform: `scale(${k}) rotate(-2deg)`, display: "flex", gap: 30, alignItems: "center" }}>
      <div style={{ width: 150, height: 150, borderRadius: 999, background: "#D7DAE5", flexShrink: 0, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 45, top: 28, width: 60, height: 60, borderRadius: 999, background: "#A9AEC0" }} />
        <div style={{ position: "absolute", left: 20, top: 100, width: 110, height: 90, borderRadius: 999, background: "#A9AEC0" }} />
      </div>
      <div>
        <div style={{ fontSize: 50, fontWeight: 800, color: C.tinta, letterSpacing: "-0.02em" }}>vendo_todo22</div>
        <div style={{ marginTop: 8, fontSize: 32, fontWeight: 600, color: C.gris }}>Se unió esta semana</div>
        <div style={{ marginTop: 14, display: "inline-block", fontSize: 30, fontWeight: 800, color: C.blanco, background: C.rojo, padding: "6px 18px", borderRadius: 999, opacity: d }}>
          ¿Quién es en verdad?
        </div>
      </div>
    </div>
  );
};

// «En todos los casos pasa lo mismo: te juntas con una persona y solo conoces su perfil,
//  su foto y su usuario. Un perfil falso se puede crear en dos minutos»
const Perfil: React.FC = () => {
  const L = L_PERFIL;
  const f = useCurrentFrame();
  return (
    <Toma carpeta={CARPETA} archivo="perfil" origen={22.8} cara={{ x: 562, y: 958 }} linea={L}
      modos={[[0, "real"], [5.03, "abajo"], [10.07, "cerca"]]}
      palabras={[
        [["En", 0.15], ["todos", 0.31], ["los", 0.45], ["casos", 0.65]],
        [["pasa", 1.03], ["lo", 1.31], ["mismo:", 4.51]],
        [["te", 5.03], ["juntas", 5.11], ["con", 5.37], ["una", 5.51], ["persona", 5.71]],
        [["y", 6.05], ["solo", 6.25], ["conoces", 6.45]],
        [["su", 6.99], ["perfil,", 7.19], ["su", 7.91], ["foto", 8.01]],
        [["y", 8.35], ["su", 8.79], ["usuario.", 8.95]],
        [["Un", 10.07], ["perfil", 10.25], ["falso", 10.59]],
        [["se", 10.99], ["puede", 11.13], ["crear", 11.29]],
        [["en", 11.53], ["dos", 11.83], ["minutos.", 11.91]],
      ]}
      encima={f >= L.en(11.83) && (
        <Pildora texto="⏱ 2 minutos" fondo={C.rojo} color={C.blanco}
          style={{ top: 1150, left: "50%", fontSize: 64, whiteSpace: "nowrap", transform: `translateX(-50%) scale(${rebote(f, L.en(11.83))}) rotate(-4deg)` }} />
      )}>
      <Desde en={0} hasta={L.en(5.03)}>
        <Palabra texto="lo mismo" en={L.en(1.03)} y={330} size={110} fondo={C.rojo} />
      </Desde>
      <Desde en={L.en(5.03)}>
        <PerfilFalso en={L.en(7.19) - L.en(5.03)} dudas={L.en(10.59) - L.en(5.03)} />
      </Desde>
      <Sfx nombre="golpe" en={L.en(1.03)} vol={0.6} />
      <Sfx nombre="pop" en={L.en(7.19)} />
      <Sfx nombre="pop_agudo" en={L.en(8.01)} />
      <Sfx nombre="pop_agudo" en={L.en(8.95)} />
      <Sfx nombre="pregunta" en={L.en(10.59)} />
      <Sfx nombre="tic" en={L.en(11.83)} />
    </Toma>
  );
};

// «El problema no es juntarse en persona; es juntarse con una persona que no conoces»
const Problema: React.FC = () => {
  const L = L_PROBLEMA;
  return (
    <Toma carpeta={CARPETA} archivo="problema" origen={37.8} cara={{ x: 527, y: 980 }} linea={L}
      modos={[[0, "der"], [1.86, "izq"]]}
      palabras={[
        [["El", 0.24], ["problema", 0.26], ["no", 0.5], ["es", 0.66]],
        [["juntarse", 0.68], ["en", 1.0], ["persona;", 1.16]],
        [["es", 1.86], ["juntarse", 2.06], ["con", 2.48], ["una", 2.66], ["persona", 2.86]],
        [["que", 3.2], ["no", 3.44], ["conoces.", 3.62]],
      ]}>
      <Palabra texto="en persona" en={L.en(1.0)} y={330} size={100} fondo={C.blanco} color={C.tinta} giro={-3} style={{ left: 20, right: 420 }} />
      <Palabra texto={"con alguien\nque no conoces"} en={L.en(3.44)} y={330} size={84} fondo={C.rojo} giro={3} style={{ left: 420, right: 20 }} />
      <Sfx nombre="pop" en={L.en(1.0)} />
      <Sfx nombre="golpe" en={L.en(3.44)} />
    </Toma>
  );
};

/** Igual a la tarjeta "Con quién tratas" de la sala: verificado, nota y salas. Nada de RUT ni teléfono. */
const ConQuienTratas: React.FC<{ en: number; y: number; nombre: string; rol: string; giro?: number; marcas: number[] }> = ({ en, y, nombre, rol, giro = 0, marcas }) => {
  const f = useCurrentFrame();
  if (f < en) return null;
  const k = rebote(f, en);
  const chip = (i: number, fondo: string, color: string, texto: string) => {
    const c = rebote(f, marcas[i]);
    return f < marcas[i] ? null : (
      <span style={{ background: fondo, color, padding: "8px 20px", borderRadius: 999, fontSize: 32, fontWeight: 800, transform: `scale(${c})`, display: "inline-block" }}>{texto}</span>
    );
  };
  return (
    <div style={{ position: "absolute", top: y, left: 80, right: 80, background: C.blanco, borderRadius: 40, padding: "32px 36px",
      boxShadow: "0 30px 70px rgba(10,10,40,0.4)", transform: `translateY(${(1 - k) * 200}px) rotate(${giro}deg)`, opacity: Math.min(1, k * 2) }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: C.gris, letterSpacing: "0.05em", textTransform: "uppercase" }}>Con quién tratas · {rol}</div>
      <div style={{ marginTop: 6, fontSize: 54, fontWeight: 800, color: C.tinta, letterSpacing: "-0.02em" }}>{nombre}</div>
      <div style={{ marginTop: 16, display: "flex", gap: 14, flexWrap: "wrap" }}>
        {chip(0, "#DDF5EA", "#0B8A5F", "✓ Verificado")}
        {chip(1, "#FFF1D6", "#B7791F", "★ 4,9")}
        {chip(2, "#E6E8FB", C.azul, "12 salas en Trado")}
      </div>
    </div>
  );
};

// «En Trado todos los perfiles están verificados: puedes conocer su RUT, su teléfono y su foto del carnet»
// ⚠ Falso tal cual (ver arriba). La imagen muestra lo que la app sí muestra; hay que regrabar el audio.
const EnTrado: React.FC = () => {
  const L = L_TRADO;
  return (
    <Toma carpeta={CARPETA} archivo="trado" origen={60.7} cara={{ x: 534, y: 986 }} linea={L}
      modos={[[0, "fuera"], [0.95, "abajo"]]}
      palabras={[
        [["En", 0.2], ["Trado,", 0.35]],
        [["todos", 1.02], ["los", 1.06], ["perfiles", 1.26]],
        [["están", 1.5], ["verificados:", 1.7]],
        [["puedes", 2.94], ["conocer", 3.08], ["su", 3.42], ["RUT,", 3.6]],
        [["su", 3.98], ["teléfono", 4.3]],
        [["y", 4.86], ["su", 5.08], ["foto", 5.2], ["del", 5.38], ["carnet.", 5.54]],
      ]}>
      <div style={{ position: "absolute", top: 220, width: "100%", textAlign: "center", color: C.blanco, fontWeight: 800, fontSize: 150, letterSpacing: "-0.04em" }}>trado</div>
      <ConQuienTratas en={L.en(1.0)} y={450} nombre="Camila R." rol="Vendedora" marcas={[L.en(1.7), L.en(3.6), L.en(4.3)]} />
      <Sfx nombre="golpe" en={0} />
      <Sfx nombre="whoosh_sube" en={L.en(1.0)} vol={0.5} />
      <Sfx nombre="pop_grave" en={L.en(1.7)} />
      <Sfx nombre="pop" en={L.en(3.6)} />
      <Sfx nombre="pop_agudo" en={L.en(4.3)} />
    </Toma>
  );
};

// «Antes de juntarte ya sabes quién es la otra persona, y ella también sabe quién eres tú»
const Antes: React.FC = () => {
  const L = L_ANTES;
  return (
    <Toma carpeta={CARPETA} archivo="antes" origen={80.6} cara={{ x: 537, y: 1033 }} linea={L}
      modos={[[0, "real"], [2.43, "abajo"]]}
      palabras={[
        [["Antes", 0.23], ["de", 0.29], ["juntarte,", 0.49]],
        [["ya", 1.25], ["sabes", 1.35], ["quién", 1.49], ["es", 1.65]],
        [["la", 1.77], ["otra", 1.85], ["persona,", 1.99]],
        [["y", 2.43], ["ella", 2.95], ["también", 3.27]],
        [["sabe", 3.61], ["quién", 3.77], ["eres", 3.95], ["tú.", 4.15]],
      ]}>
      <Desde en={0} hasta={L.en(2.43)}>
        <ConQuienTratas en={L.en(1.25)} y={300} nombre="Camila R." rol="Vendedora" giro={-2} marcas={[L.en(1.4), L.en(1.6), L.en(1.8)]} />
      </Desde>
      <Desde en={L.en(2.43)}>
        <ConQuienTratas en={0} y={250} nombre="Camila R." rol="Vendedora" giro={-2} marcas={[0, 0, 0]} />
        <ConQuienTratas en={L.en(3.27) - L.en(2.43)} y={560} nombre="Tú" rol="Comprador" giro={2} marcas={[L.en(3.61) - L.en(2.43), L.en(3.77) - L.en(2.43), L.en(3.95) - L.en(2.43)]} />
      </Desde>
      <Sfx nombre="pop" en={L.en(1.25)} />
      <Sfx nombre="whoosh_sube" en={L.en(3.27)} vol={0.5} />
      <Sfx nombre="pop_agudo" en={L.en(3.61)} />
      <Sfx nombre="brillo" en={L.en(4.15)} vol={0.6} />
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
      modos={[[0, "real"], [2.68, "der"], [4.36, "abajo"], [5.7, "fuera"]]}
      palabras={[
        [["Si", 0.26], ["vas", 0.3], ["a", 0.46], ["comprar,", 0.7]],
        [["vender", 1.14], ["o", 1.56], ["trabajar,", 1.86]],
        [["hazlo", 2.68], ["con", 2.82], ["una", 2.94], ["persona", 3.06], ["real.", 3.4]],
        [["Hazlo", 4.36], ["en", 4.74], ["trado.cl", 4.96]],
      ]}>
      <Desde en={0} hasta={tr}>
        <Palabra texto="comprar" en={L.en(0.7)} y={300} size={80} fondo={C.blanco} color={C.tinta} giro={-4} style={{ left: 40, right: 560 }} />
        <Palabra texto="vender" en={L.en(1.14)} y={420} size={80} fondo={C.blanco} color={C.tinta} giro={3} style={{ left: 330, right: 330 }} />
        <Palabra texto="trabajar" en={L.en(1.86)} y={300} size={80} fondo={C.blanco} color={C.tinta} giro={-2} style={{ left: 560, right: 40 }} />
        <Palabra texto="persona real" en={L.en(3.4)} y={600} size={110} fondo={C.verde} giro={-3} />
      </Desde>
      <Desde en={tr}>
        <div style={{ position: "absolute", top: 300, width: "100%", textAlign: "center", color: C.blanco, fontWeight: 800, fontSize: 190, letterSpacing: "-0.04em", transform: `scale(${rebote(f, tr)})` }}>trado</div>
        <Pildora texto="trado.cl" style={{ top: 560, left: "50%", transform: `translateX(-50%) scale(${rebote(f, L.en(4.96))})`, fontSize: 64, color: C.azul, padding: "22px 70px" }} />
        <Confeti en={L.en(4.96) - tr} x={540} y={420} n={50} semilla="final" />
      </Desde>
      <Sfx nombre="pop_grave" en={L.en(0.7)} />
      <Sfx nombre="pop" en={L.en(1.14)} />
      <Sfx nombre="pop_agudo" en={L.en(1.86)} />
      <Sfx nombre="golpe" en={L.en(3.4)} />
      <Sfx nombre="golpe" en={tr} />
      <Sfx nombre="campanas" en={L.en(4.96)} vol={0.5} />
    </Toma>
  );
};
