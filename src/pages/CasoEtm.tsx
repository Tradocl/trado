import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, CheckCheck, ChevronDown, CheckCircle2, Clock, Flag, Globe, Instagram, Lock, Plus, RotateCcw, Share2, ShieldCheck, Smartphone, XCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { casoAlAzar, casoPorSlug, CASOS, TOTAL_CASOS, esDiaDelEvento, guardarRespuesta, introVista, marcarIntroVista, sesionEtm, leerAvance, type Avance, type Caso, type Comprobante as DatosComprobante, type Mensaje } from "@/lib/casos-etm";
import { formatCLP, PRIMERA_SALA_GRATIS_HASTA } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Confeti } from "@/components/Confeti";

// Lo que se abre al acercar el celular a una tarjeta NFC del stand del EtMday: una escena,
// el chat de la estafa andando, una decisión y la revelación con las señales y cómo lo evita Trado.

type Etapa = "previa" | "intro" | "chat" | "decision" | "revela" | "final";

const reducido = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const DEGRADADO = "bg-gradient-to-br from-[#2230C2] via-[#4B35D6] via-55% to-[#7C3AED]";

const Comprobante = ({ c }: { c: DatosComprobante }) => (
  <div className="w-56 rounded-xl bg-white overflow-hidden border border-black/5">
    <div className={`${c.enProceso ? "bg-sky-500" : "bg-emerald-500"} text-white px-3 py-3 text-center`}>
      {c.enProceso ? <Clock className="h-7 w-7 mx-auto" /> : <CheckCircle2 className="h-7 w-7 mx-auto" />}
      <p className="font-bold text-sm mt-1">{c.titulo}</p>
    </div>
    <div className="px-3 py-2.5 text-[11px] text-[#0F1424] space-y-1">
      <p className="text-center text-2xl font-extrabold tracking-tight">${formatCLP(c.monto)}</p>
      {c.filas.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-2"><span className="text-black/50">{k}</span><span>{v}</span></div>
      ))}
    </div>
  </div>
);

const Foto = ({ f }: { f: { emoji: string; titulo: string; detalle: string } }) => (
  <div className="w-52 rounded-xl overflow-hidden bg-white border border-black/5">
    <div className="h-32 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-6xl">{f.emoji}</div>
    <div className="px-3 py-2">
      <p className="text-sm font-bold text-[#0F1424]">{f.titulo}</p>
      <p className="text-xs text-black/50">{f.detalle}</p>
    </div>
  </div>
);

const Resenas = ({ r }: { r: { autor: string; texto: string }[] }) => (
  <div className="w-60 rounded-xl bg-white border border-black/5 p-3 space-y-2.5">
    <p className="text-[11px] font-bold uppercase tracking-wider text-black/45">Lo que dicen los clientes ⭐</p>
    {r.map((x) => (
      <div key={x.autor} className="flex gap-2">
        <span className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-amber-300 shrink-0" />
        <p className="text-[13px] leading-snug"><b>{x.autor}</b> {x.texto}</p>
      </div>
    ))}
  </div>
);

const Datos = ({ d }: { d: { titulo: string; filas: [string, string][] } }) => (
  <div className="w-56 rounded-xl bg-white border border-black/5 overflow-hidden">
    <p className="bg-slate-100 px-3 py-2 text-[12px] font-bold text-[#0F1424]">🏦 {d.titulo}</p>
    <div className="px-3 py-2 space-y-1 text-[12px] text-[#0F1424]">
      {d.filas.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-2"><span className="text-black/50">{k}</span><span className="font-semibold">{v}</span></div>
      ))}
    </div>
  </div>
);

const VistaLink = ({ l }: { l: { dominio: string; titulo: string; detalle: string } }) => (
  <div className="w-60 rounded-xl overflow-hidden bg-white border border-black/5">
    <div className="h-20 bg-gradient-to-br from-emerald-400 to-sky-500 flex items-center justify-center">
      <Globe className="h-9 w-9 text-white" />
    </div>
    <div className="px-3 py-2">
      <p className="text-sm font-bold text-[#0F1424] leading-snug">{l.titulo}</p>
      <p className="text-xs text-black/55 mt-0.5 leading-snug">{l.detalle}</p>
      <p className="text-xs text-sky-600 font-semibold mt-1.5 break-all">{l.dominio}</p>
    </div>
  </div>
);

const Chat = ({ caso, mensajes, onTermino }: { caso: Caso; mensajes: Mensaje[]; onTermino: () => void }) => {
  const [n, setN] = useState(reducido() ? mensajes.length : 0);
  const [escribiendo, setEscribiendo] = useState(false);
  const fondo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (n >= mensajes.length) {
      t = setTimeout(onTermino, 900);
    } else if (mensajes[n].de === "ellos") {
      setEscribiendo(true);
      const m = mensajes[n];
      const largo = "texto" in m ? m.texto.length : 40;
      t = setTimeout(() => { setEscribiendo(false); setN((x) => x + 1); }, Math.min(2200, 700 + largo * 22));
    } else {
      t = setTimeout(() => setN((x) => x + 1), mensajes[n].de === "narra" ? 1500 : 1100);
    }
    return () => clearTimeout(t);
  }, [n, mensajes, onTermino]);

  useEffect(() => {
    fondo.current?.scrollTo({ top: fondo.current.scrollHeight, behavior: "smooth" });
  }, [n, escribiendo]);

  // Cuando sube el panel de la decisión el chat se achica: que siga viéndose el último mensaje
  useEffect(() => {
    const el = fondo.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const obs = new ResizeObserver(() => el.scrollTo({ top: el.scrollHeight }));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#ece5dd]">
      <div className={`${DEGRADADO} text-white px-4 py-3 flex items-center gap-3 shadow`}>
        <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center font-bold">{caso.contacto.inicial}</div>
        <div className="leading-tight">
          <p className="font-semibold">{caso.contacto.nombre}</p>
          <p className="text-xs text-white/75">{escribiendo ? "escribiendo…" : caso.contacto.rol}</p>
        </div>
      </div>
      <div ref={fondo} className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-2">
        {mensajes.slice(0, n).map((m, i) => {
          if (m.de === "narra")
            return (
              <p key={i} className="chat-pop self-center my-1 max-w-[85%] text-center text-[13px] font-semibold text-[#0F1424]/70 bg-white/70 rounded-full px-4 py-1.5">
                {m.texto}
              </p>
            );
          const mio = m.de === "yo";
          const adjunto = "comprobante" in m || "foto" in m || "link" in m || "resenas" in m || "datos" in m;
          return (
            <div
              key={i}
              className={`chat-pop max-w-[82%] shadow-sm text-[15px] leading-snug text-[#0F1424] ${
                mio ? "self-end bg-[#dcf8c6] rounded-2xl rounded-br-md" : "self-start bg-white rounded-2xl rounded-bl-md"
              } ${adjunto ? "p-1.5" : "px-3.5 py-2"}`}
            >
              {"comprobante" in m ? (
                <Comprobante c={m.comprobante} />
              ) : "foto" in m ? (
                <Foto f={m.foto} />
              ) : "link" in m ? (
                <VistaLink l={m.link} />
              ) : "resenas" in m ? (
                <Resenas r={m.resenas} />
              ) : "datos" in m ? (
                <Datos d={m.datos} />
              ) : (
                <span>
                  {m.texto}
                  {mio && <CheckCheck className="inline h-4 w-4 ml-1 -mt-0.5 text-sky-500" />}
                </span>
              )}
            </div>
          );
        })}
        {escribiendo && (
          <div className="chat-pop self-start bg-white rounded-2xl rounded-bl-md px-3.5 py-3 flex gap-1 shadow-sm">
            {[0, 1, 2].map((d) => (
              <span key={d} className="w-2 h-2 rounded-full bg-[#0F1424]/40 animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const FRASES_PREVIA: { texto: string; fuerte?: boolean; alerta?: boolean }[] = [
  { texto: "Pasa todos los días.", fuerte: true },
  { texto: "Alguien vende por redes sociales." },
  { texto: "Alguien compra sin conocer al otro." },
  { texto: "Y alguien pierde su plata.", fuerte: true, alerta: true },
];

const Previa = ({ onSeguir }: { onSeguir: () => void }) => (
  <div className="flex-1 flex flex-col bg-[#0F1424] text-white px-7 pt-8 pb-10 relative overflow-hidden">
    <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#4B35D6]/40 rounded-full blur-3xl pointer-events-none" />
    <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#FF6B4A]/20 rounded-full blur-3xl pointer-events-none" />
    <div className="flex items-center justify-between relative">
      <Logo variant="white" height={26} />
      <button onClick={onSeguir} className="text-sm font-semibold text-white/60">Saltar</button>
    </div>
    <div className="flex-1 flex flex-col justify-center gap-5 relative">
      {FRASES_PREVIA.map((f, i) => (
        <p
          key={f.texto}
          className={`frase-previa ${f.fuerte ? "text-4xl font-black tracking-tight leading-[1.05]" : "text-2xl font-semibold text-white/80 leading-snug"} ${f.alerta ? "text-[#FF6B4A]" : ""}`}
          style={{ animationDelay: `${0.3 + i * 1.1}s` }}
        >
          {f.texto}
        </p>
      ))}
    </div>
    <div className="frase-previa relative" style={{ animationDelay: `${0.3 + FRASES_PREVIA.length * 1.1}s` }}>
      <p className="text-xl font-bold text-center mb-4">¿Lo detectarías tú?</p>
      <button
        onClick={onSeguir}
        className="w-full h-16 rounded-2xl bg-white text-[#2230C2] text-lg font-extrabold flex items-center justify-center gap-2 shadow-2xl active:scale-[0.98] transition"
      >
        Sacar mi carta <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  </div>
);

/** Nivel según cuántas detectó de las 9 */
const nivelDe = (a: number) =>
  a === TOTAL_CASOS ? { titulo: "Detector experto", emoji: "🕵️", frase: "No te pasan gato por liebre." }
  : a >= 7 ? { titulo: "Ojo de lince", emoji: "👀", frase: "Casi perfecto: se te pasó muy poco." }
  : a >= 4 ? { titulo: "Buen olfato", emoji: "🐶", frase: "Vas bien, pero alguna se te pasó." }
  : { titulo: "Presa fácil", emoji: "😅", frase: "Mejor que te pase acá y no con tu plata." };

/** El final cuando ya jugó las 9 cartas: puntaje gigante, nivel, premio y desafío */
const GranFinal = ({ aciertos, avance, onCompartir, onReiniciar }: { aciertos: number; avance: Avance; onCompartir: () => void; onReiniciar: () => void }) => {
  const nivel = nivelDe(aciertos);
  const r = 54, c = 2 * Math.PI * r;
  return (
    <div className={`chat-pop rounded-3xl ${DEGRADADO} text-white shadow-2xl p-6 text-center relative overflow-hidden`}>
      <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-16 w-56 h-56 bg-amber-300/25 rounded-full blur-3xl pointer-events-none" />
      <p className="relative text-xs font-extrabold uppercase tracking-[0.2em] text-white/75">Terminaste las {TOTAL_CASOS} cartas</p>
      <div className="relative mx-auto mt-4 w-44 h-44">
        <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
          <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="12" />
          <circle cx="64" cy="64" r={r} fill="none" stroke="#FCD34D" strokeWidth="12" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - aciertos / TOTAL_CASOS)} className="anillo-puntaje" style={{ ["--largo" as string]: `${c}` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-6xl font-black leading-none">{aciertos}<span className="text-3xl text-white/70">/{TOTAL_CASOS}</span></span>
          <span className="text-xs font-bold text-white/75 mt-1">detectadas</span>
        </div>
      </div>
      <p className="relative mt-4 text-4xl">{nivel.emoji}</p>
      <p className="relative text-3xl font-black tracking-tight leading-tight">{nivel.titulo}</p>
      <p className="relative text-white/85 mt-1">{nivel.frase}</p>
      <div className="relative flex gap-1.5 mt-5">
        {CASOS.map((c) => (
          <span key={c.slug} className={`h-3 flex-1 rounded-full ${avance[c.slug] ? "bg-[#FCD34D]" : "bg-white/25"}`} />
        ))}
      </div>
      {esDiaDelEvento() && (
        <div className="relative mt-5 rounded-2xl bg-[#FCD34D] text-[#0F1424] p-4 shadow-lg">
          <p className="text-2xl">🎁</p>
          <p className="font-black text-lg leading-tight">¡Tienes premio!</p>
          <p className="text-sm font-semibold mt-1">Muéstrale esta pantalla al equipo de Trado en el stand.</p>
        </div>
      )}
      <button
        onClick={onCompartir}
        className="relative mt-5 w-full h-16 rounded-2xl bg-white text-[#2230C2] text-lg font-extrabold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition"
      >
        <Share2 className="h-5 w-5" /> Desafía a alguien
      </button>
      <button onClick={onReiniciar} className="relative mt-3 text-sm font-semibold text-white/85 inline-flex items-center gap-1.5">
        <RotateCcw className="h-4 w-4" /> Jugar de nuevo
      </button>
    </div>
  );
};

/** La carta boca abajo que se da vuelta y muestra el caso que tocó */
const Carta = ({ caso }: { caso: Caso }) => {
  const [vuelta, setVuelta] = useState(reducido());
  useEffect(() => {
    setVuelta(reducido());
    const t = setTimeout(() => setVuelta(true), 650);
    return () => clearTimeout(t);
  }, [caso.slug]);
  return (
    <div className="carta mx-auto w-52 h-72">
      <div className={`carta-interior ${vuelta ? "dada-vuelta" : ""}`}>
        <div className="carta-cara carta-dorso rounded-3xl border-4 border-white/80 shadow-2xl flex items-center justify-center bg-[#0F1424]">
          <div className="absolute inset-3 rounded-2xl border-2 border-dashed border-white/25" />
          <span className="text-8xl font-black text-white/90">?</span>
        </div>
        <div className="carta-cara carta-frente rounded-3xl bg-white text-[#0F1424] shadow-2xl flex flex-col items-center justify-center p-5 text-center">
          <span className="text-7xl">{caso.emoji}</span>
          <span className="mt-4 text-[11px] font-extrabold uppercase tracking-wider text-[#FF6B4A]">Te tocó</span>
          <span className="mt-1 text-xl font-black leading-tight">{caso.titulo}</span>
        </div>
      </div>
    </div>
  );
};

const CasoEtm = () => {
  const { caso: slug } = useParams();
  const navigate = useNavigate();
  const [avance, setAvance] = useState<Avance>(() => leerAvance());
  // /etm y /etm/sorpresa (lo que abren las tarjetas): toca un caso al azar que no haya jugado
  const esSorpresa = !slug || slug === "sorpresa";
  const [alAzar] = useState(() => casoAlAzar(leerAvance()));
  const caso = esSorpresa ? alAzar : casoPorSlug(slug) ?? alAzar;
  const [etapa, setEtapa] = useState<Etapa>(() => (introVista() ? "intro" : "previa"));
  const [acerto, setAcerto] = useState<boolean | null>(null);
  const [verOtros, setVerOtros] = useState(false);
  // La carta que se saca ahora: si ya jugó este caso no suma
  const carta = Math.min(TOTAL_CASOS, CASOS.filter((c) => c.slug in avance && c.slug !== caso.slug).length + 1);

  useEffect(() => {
    if (esSorpresa) navigate(`/etm/${caso.slug}`, { replace: true });
  }, [esSorpresa, caso.slug, navigate]);
  useEffect(() => { window.scrollTo(0, 0); }, [etapa]);
  // "Sacar otra carta" reutiliza esta misma página: al cambiar de caso, parte de cero
  useEffect(() => { setEtapa((e) => (e === "previa" ? e : "intro")); setAcerto(null); setVerOtros(false); }, [caso.slug]);
  const seguirPrevia = () => { marcarIntroVista(); setEtapa("intro"); };

  const adivinar = caso.formato === "adivinar";
  const [reveladoListo, setReveladoListo] = useState(false);
  useEffect(() => { setReveladoListo(false); }, [caso.slug]);
  // En "adivinar" el chat sigue después de elegir con el mensaje que de verdad llega
  const mensajes = useMemo(
    () => (etapa === "revela" || etapa === "final" ? [...caso.chat, ...(caso.revelado ?? [])] : caso.chat),
    [caso, etapa === "revela" || etapa === "final"], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const alTerminarChat = useCallback(() => {
    setEtapa((e) => (e === "chat" ? "decision" : e));
    setReveladoListo(true);
  }, []);
  const elegir = (correcta: boolean) => {
    setAcerto(correcta);
    setAvance(guardarRespuesta(caso.slug, correcta));
    // Para la pantalla del stand. Anónimo y sin esperar: si falla, el juego sigue igual.
    // (La tabla no está en los tipos generados de Supabase.)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("etm_respuestas").insert({ caso: caso.slug, acerto: correcta, sesion: sesionEtm() }).then(() => {}, () => {});
    setReveladoListo(false);
    setEtapa(adivinar ? "revela" : "final");
    try { navigator.vibrate?.(correcta ? [40, 60, 40] : [180]); } catch { /* sin vibración */ }
  };
  const jugados = CASOS.filter((c) => c.slug in avance).length;
  const aciertos = CASOS.filter((c) => avance[c.slug]).length;
  const quedan = jugados < TOTAL_CASOS;
  const otraCarta = () => navigate(`/etm/${casoAlAzar(avance, caso.slug).slug}`);
  const reiniciar = () => {
    try { localStorage.removeItem("trado_etm_avance"); } catch { /* sin almacenamiento */ }
    setAvance({});
    navigate(`/etm/${casoAlAzar({}, caso.slug).slug}`);
  };
  // Lo que más nos importa al final: que cree su sala y que siga la cuenta de Instagram
  const crearSala = () => {
    try { sessionStorage.setItem("redirectAfterLogin", "/create-transaction"); } catch { /* sin almacenamiento */ }
    navigate(`/auth?tab=register&utm_source=etm&utm_medium=nfc&utm_campaign=${caso.slug}`);
  };
  const compartir = () => {
    const url = `${window.location.origin}/etm/sorpresa`;
    const texto = jugados >= TOTAL_CASOS
      ? `Detecté ${aciertos} de ${TOTAL_CASOS} estafas en Trado. ¿Tú cuántas detectas? 👀 ${url}`
      : `¿Lo detectarías? Caso: ${caso.titulo} 👀 ${url}`;
    if (navigator.share) navigator.share({ title: "¿Lo detectarías?", text: texto, url }).catch(() => {});
    else window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  };

  return (
    <div className="min-h-[100dvh] bg-[#0F1424] flex justify-center">
      <Helmet>
        <title>{`¿Lo detectarías? ${caso.titulo} | Trado`}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="w-full max-w-md min-h-[100dvh] flex flex-col relative overflow-hidden">
        {/* ── Previa (solo la primera vez) ── */}
        {etapa === "previa" && <Previa onSeguir={seguirPrevia} />}

        {/* ── Intro: la carta que tocó ── */}
        {etapa === "intro" && (
          <div className={`flex-1 flex flex-col ${DEGRADADO} text-white px-6 pt-8 pb-10 relative`}>
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-10 -left-24 w-72 h-72 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center justify-between relative">
              <Logo variant="white" height={28} />
              <span className="text-xs font-bold bg-white/15 border border-white/25 rounded-full px-3 py-1">
                Carta {carta} de {TOTAL_CASOS}
              </span>
            </div>
            <div className="flex-1 flex flex-col justify-center relative py-6">
              <Carta caso={caso} />
              <div key={caso.slug} className="frase-previa text-center mt-8" style={{ animationDelay: "1.3s" }}>
                <p className="text-xl text-white/95 leading-snug">{caso.escena}</p>
                <p className="text-white/70 mt-2">{adivinar ? "Mira el chat y adivina qué te van a mandar." : "Mira el chat y decide qué harías."}</p>
              </div>
            </div>
            <button
              key={`b-${caso.slug}`}
              onClick={() => setEtapa("chat")}
              style={{ animationDelay: "1.5s" }}
              className="frase-previa relative w-full h-16 rounded-2xl bg-white text-[#2230C2] text-lg font-extrabold flex items-center justify-center gap-2 shadow-2xl active:scale-[0.98] transition"
            >
              Ver el chat <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* ── Chat y decisión ── */}
        {(etapa === "chat" || etapa === "decision" || etapa === "revela") && (
          <div className="fixed inset-0 flex justify-center bg-[#0F1424]">
           <div className="w-full max-w-md h-full flex flex-col">
            <Chat key={caso.slug} caso={caso} mensajes={mensajes} onTermino={alTerminarChat} />
            {etapa === "decision" && (
            <div className="shrink-0 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.25)] px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-500">
              <p className="text-xs font-bold uppercase tracking-wider text-[#FF6B4A]">{adivinar ? "Adivina" : "Tu turno"}</p>
              <p className="text-2xl font-extrabold text-[#0F1424] mt-0.5">{caso.pregunta}</p>
              <div className="grid gap-2.5 mt-4">
                {caso.opciones.map((o) =>
                  adivinar ? (
                    // Las opciones se ven como el mensaje que podría llegar
                    <button
                      key={o.texto}
                      onClick={() => elegir(o.correcta)}
                      className="w-full text-left flex active:scale-[0.98] transition"
                    >
                      <span className="max-w-[92%] rounded-2xl rounded-bl-md bg-[#ece5dd] border-2 border-transparent active:border-[#2230C2] px-4 py-3 text-[15px] font-semibold text-[#0F1424] leading-snug shadow-sm">
                        {o.texto}
                      </span>
                    </button>
                  ) : (
                    <button
                      key={o.texto}
                      onClick={() => elegir(o.correcta)}
                      className="w-full min-h-14 rounded-2xl border-2 border-[#2230C2]/15 bg-[#f4f5ff] px-4 py-3 text-left font-bold text-[#0F1424] active:scale-[0.98] active:border-[#2230C2] transition"
                    >
                      {o.texto}
                    </button>
                  ),
                )}
              </div>
            </div>
            )}
            {etapa === "revela" && reveladoListo && acerto !== null && (
              <div className={`shrink-0 rounded-t-3xl px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-500 ${acerto ? "bg-emerald-500 text-white" : "bg-[#FF6B4A] text-[#0F1424]"}`}>
                <p className="text-2xl font-black">{acerto ? "¡Le achuntaste! 🎯" : "No era ese 😬"}</p>
                <p className="mt-1 opacity-90">{acerto ? "Era justo el mensaje que te iban a mandar." : "Este es el mensaje que te mandaron."}</p>
                <button
                  onClick={() => setEtapa("final")}
                  className="mt-4 w-full h-14 rounded-2xl bg-white text-[#0F1424] font-extrabold flex items-center justify-center gap-2 active:scale-[0.98] transition"
                >
                  Ver por qué es estafa <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            )}
           </div>
          </div>
        )}

        {/* ── Revelación ── */}
        {etapa === "final" && acerto !== null && (
          <div className="flex-1 bg-[#f5f5fa] pb-10">
            {acerto && <Confeti key={caso.slug} mucho={!quedan && aciertos === TOTAL_CASOS} />}
            {/* Resultado: todo lo importante en la primera pantalla, sin bajar */}
            <div className={`chat-pop px-5 pt-5 pb-11 relative overflow-hidden ${acerto ? "bg-emerald-500 text-white" : "bg-[#FF6B4A] text-[#0F1424]"}`}>
              <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/15 rounded-full blur-2xl pointer-events-none" />
              <div className="relative flex items-center gap-3.5">
                <div className="w-16 h-16 shrink-0 rounded-2xl bg-white shadow-xl flex items-center justify-center text-4xl rotate-[-4deg]">{caso.emoji}</div>
                <div className="min-w-0">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold ${acerto ? "bg-white/20" : "bg-[#0F1424]/10"}`}>
                    {acerto ? <ShieldCheck className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />} {acerto ? "La detectaste" : "Caíste"}
                  </span>
                  <p className="text-[1.7rem] font-black tracking-tight leading-[1.05] mt-1">{acerto ? caso.bien.titulo : caso.mal.titulo}</p>
                </div>
              </div>
              <p className="relative text-[15px] mt-2.5 leading-snug opacity-90">{acerto ? caso.bien.texto : caso.mal.texto}</p>
            </div>

            <div className="relative z-10 px-4 -mt-7 space-y-3">
              <div className="chat-pop bg-white rounded-3xl shadow-xl p-4" style={{ animationDelay: "0.15s" }}>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#FF6B4A] flex items-center gap-1.5">
                  <Flag className="h-3.5 w-3.5" /> Ojo: esto pasa todos los días en Chile
                </p>
                <p className="text-[14px] text-[#0F1424]/80 leading-snug mt-1.5">{caso.comun}</p>
              </div>
              <div className={`chat-pop ${DEGRADADO} rounded-3xl shadow-xl p-4 text-white relative overflow-hidden`} style={{ animationDelay: "0.3s" }}>
                <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-white/75 flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Por eso existe Trado</p>
                <p className="relative text-[17px] font-extrabold leading-snug mt-1.5">{caso.conTrado}</p>
              </div>
              {/* Registrarse y seguir en Instagram, a la vista */}
              <div className="chat-pop grid gap-2" style={{ animationDelay: "0.45s" }}>
                <button
                  onClick={crearSala}
                  className={`w-full h-14 rounded-2xl ${DEGRADADO} text-white text-lg font-extrabold flex items-center justify-center gap-2 shadow-lg ring-2 ring-white active:scale-[0.98] transition`}
                >
                  <Plus className="h-5 w-5" /> Crear mi sala gratis
                </button>
                <a
                  href="https://www.instagram.com/trado_cl/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white text-lg font-extrabold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition"
                >
                  <Instagram className="h-6 w-6" /> Seguir a @trado_cl
                </a>
                <p className="text-center text-xs text-[#0F1424]/55">Tu primera sala va sin comisión, hasta ${formatCLP(PRIMERA_SALA_GRATIS_HASTA)}.</p>
              </div>
            </div>

            <div className="relative z-10 px-4 mt-4 space-y-4">
              {/* Terminó las 9 cartas: el gran final, para mostrarlo en el stand */}
              {!quedan && <GranFinal aciertos={aciertos} avance={avance} onCompartir={compartir} onReiniciar={reiniciar} />}

              {/* Opcional: ver los demás casos (se abre al tocar) */}
              {quedan && (
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                  <button onClick={() => setVerOtros((v) => !v)} className="w-full p-4 flex items-center gap-3 text-left">
                    <span className="flex-1">
                      <span className="block font-extrabold text-[#0F1424]">Ver los demás casos</span>
                      <span className="block text-sm text-[#0F1424]/60">Llevas {jugados} de {TOTAL_CASOS} · {aciertos} detectado{aciertos === 1 ? "" : "s"}</span>
                    </span>
                    <ChevronDown className={`h-5 w-5 text-[#2230C2] transition-transform ${verOtros ? "rotate-180" : ""}`} />
                  </button>
                  {verOtros && (
                    <div className="px-4 pb-4 chat-pop">
                      <div className="flex gap-1.5">
                        {CASOS.map((c) => (
                          <span
                            key={c.slug}
                            className={`h-2.5 flex-1 rounded-full ${!(c.slug in avance) ? "bg-[#0F1424]/10" : avance[c.slug] ? "bg-emerald-500" : "bg-[#FF6B4A]"} ${c.slug === caso.slug ? "ring-2 ring-offset-2 ring-[#2230C2]/40" : ""}`}
                          />
                        ))}
                      </div>
                      <div className={`mt-4 rounded-2xl ${DEGRADADO} text-white p-4 flex items-center gap-4 relative overflow-hidden`}>
                        <div className="relative w-20 h-20 shrink-0">
                          <div className="acerca-carta absolute right-0 top-1 w-12 h-16 rounded-lg bg-[#0F1424] border-2 border-white/80 flex items-center justify-center text-2xl font-black">?</div>
                          <Smartphone className="acerca-celular absolute left-0 top-3 h-14 w-14 text-white drop-shadow" />
                        </div>
                        <div>
                          <p className="font-extrabold text-lg leading-tight">Acerca tu celular a otra carta del panel</p>
                          <p className="text-sm text-white/80 mt-1">Cada carta te da una estafa distinta 👀</p>
                        </div>
                      </div>
                      <button onClick={otraCarta} className="mt-3 w-full h-12 rounded-2xl border-2 border-[#2230C2]/20 text-[#2230C2] font-bold">
                        ¿No estás en el stand? Juega otro aquí
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-white rounded-3xl shadow-xl p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-[#FF6B4A] flex items-center gap-1.5">
                  <Flag className="h-3.5 w-3.5" /> Las {caso.senales.length} señales de alerta
                </p>
                <ol className="mt-3 space-y-3.5">
                  {caso.senales.map((s, i) => (
                    <li key={s.titulo} className="flex gap-3">
                      <span className="w-8 h-8 shrink-0 rounded-xl bg-[#FF6B4A] text-[#0F1424] font-black flex items-center justify-center">{i + 1}</span>
                      <div>
                        <p className="font-bold text-[#0F1424]">{s.titulo}</p>
                        <p className="text-sm text-[#0F1424]/70 leading-snug mt-0.5">{s.texto}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>


              <button
                onClick={compartir}
                className="w-full h-14 rounded-2xl bg-white border border-black/10 text-[#0F1424] font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition"
              >
                <Share2 className="h-5 w-5" /> Desafía a alguien con este caso
              </button>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CasoEtm;
