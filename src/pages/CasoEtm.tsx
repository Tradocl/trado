import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, CheckCheck, CheckCircle2, Clock, Flag, Lock, RotateCcw, Share2, ShieldCheck, Trophy, XCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { casoPorSlug, CASOS, TOTAL_CASOS, guardarRespuesta, leerAvance, numeroDe, siguientePendiente, type Avance, type Caso, type Comprobante as DatosComprobante } from "@/lib/casos-etm";
import { formatCLP, PRIMERA_SALA_GRATIS_HASTA } from "@/lib/utils";

// Lo que se abre al acercar el celular a una tarjeta NFC del stand del EtMday: una escena,
// el chat de la estafa andando, una decisión y la revelación con las señales y cómo lo evita Trado.

type Etapa = "intro" | "chat" | "decision" | "final";

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

const Chat = ({ caso, onTermino }: { caso: Caso; onTermino: () => void }) => {
  const [n, setN] = useState(reducido() ? caso.chat.length : 0);
  const [escribiendo, setEscribiendo] = useState(false);
  const fondo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (n >= caso.chat.length) {
      t = setTimeout(onTermino, 900);
    } else if (caso.chat[n].de === "ellos") {
      setEscribiendo(true);
      const m = caso.chat[n];
      const largo = "texto" in m ? m.texto.length : 40;
      t = setTimeout(() => { setEscribiendo(false); setN((x) => x + 1); }, Math.min(2200, 700 + largo * 22));
    } else {
      t = setTimeout(() => setN((x) => x + 1), caso.chat[n].de === "narra" ? 1500 : 1100);
    }
    return () => clearTimeout(t);
  }, [n, caso, onTermino]);

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
        {caso.chat.slice(0, n).map((m, i) => {
          if (m.de === "narra")
            return (
              <p key={i} className="chat-pop self-center my-1 max-w-[85%] text-center text-[13px] font-semibold text-[#0F1424]/70 bg-white/70 rounded-full px-4 py-1.5">
                {m.texto}
              </p>
            );
          const mio = m.de === "yo";
          const adjunto = "comprobante" in m || "foto" in m;
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

const CasoEtm = () => {
  const { caso: slug } = useParams();
  const navigate = useNavigate();
  const caso = casoPorSlug(slug) ?? CASOS[0];
  const [etapa, setEtapa] = useState<Etapa>("intro");
  const [acerto, setAcerto] = useState<boolean | null>(null);
  const [avance, setAvance] = useState<Avance>(() => leerAvance());
  const numero = numeroDe(caso);

  useEffect(() => { window.scrollTo(0, 0); }, [etapa]);
  // "Siguiente caso" reutiliza esta misma página: al cambiar de caso, parte de cero
  useEffect(() => { setEtapa("intro"); setAcerto(null); }, [caso.slug]);

  const alTerminarChat = useCallback(() => setEtapa("decision"), []);
  const elegir = (correcta: boolean) => {
    setAcerto(correcta);
    setAvance(guardarRespuesta(caso.slug, correcta));
    setEtapa("final");
    try { navigator.vibrate?.(correcta ? [40, 60, 40] : [180]); } catch { /* sin vibración */ }
  };
  const jugados = CASOS.filter((c) => c.slug in avance).length;
  const aciertos = CASOS.filter((c) => avance[c.slug]).length;
  const siguiente = siguientePendiente(caso, avance);
  const reiniciar = () => {
    try { localStorage.removeItem("trado_etm_avance"); } catch { /* sin almacenamiento */ }
    setAvance({});
    navigate(`/etm/${CASOS[0].slug}`);
  };
  const compartir = () => {
    const url = `${window.location.origin}/etm/${caso.slug}`;
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
        {/* ── Intro ── */}
        {etapa === "intro" && (
          <div className={`flex-1 flex flex-col ${DEGRADADO} text-white px-6 pt-8 pb-10 relative`}>
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-10 -left-24 w-72 h-72 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center justify-between relative">
              <Logo variant="white" height={28} />
              <span className="text-xs font-bold bg-white/15 border border-white/25 rounded-full px-3 py-1">
                Caso {numero} de {TOTAL_CASOS}
              </span>
            </div>
            <div className="flex-1 flex flex-col justify-center relative">
              <span className="self-start inline-flex items-center gap-1.5 bg-[#FF6B4A] text-[#0F1424] text-xs font-extrabold uppercase tracking-wider rounded-full px-3 py-1.5">
                <Flag className="h-3.5 w-3.5" /> {caso.titulo}
              </span>
              <h1 className="text-5xl font-black tracking-tight leading-[1.02] mt-5">
                ¿Lo <span className="underline decoration-emerald-400 decoration-[6px] underline-offset-8">detectarías</span>?
              </h1>
              <p className="text-xl text-white/90 mt-6 leading-snug">{caso.escena}</p>
              <p className="text-white/70 mt-3">Mira el chat y decide qué harías.</p>
            </div>
            <button
              onClick={() => setEtapa("chat")}
              className="relative w-full h-16 rounded-2xl bg-white text-[#2230C2] text-lg font-extrabold flex items-center justify-center gap-2 shadow-2xl active:scale-[0.98] transition"
            >
              Ver el chat <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* ── Chat y decisión ── */}
        {(etapa === "chat" || etapa === "decision") && (
          <div className="fixed inset-0 flex justify-center bg-[#0F1424]">
           <div className="w-full max-w-md h-full flex flex-col">
            <Chat key={caso.slug} caso={caso} onTermino={alTerminarChat} />
            {etapa === "decision" && (
            <div className="shrink-0 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.25)] px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-500">
              <p className="text-xs font-bold uppercase tracking-wider text-[#FF6B4A]">Tu turno</p>
              <p className="text-2xl font-extrabold text-[#0F1424] mt-0.5">{caso.pregunta}</p>
              <div className="grid gap-2.5 mt-4">
                {caso.opciones.map((o) => (
                  <button
                    key={o.texto}
                    onClick={() => elegir(o.correcta)}
                    className="w-full min-h-14 rounded-2xl border-2 border-[#2230C2]/15 bg-[#f4f5ff] px-4 py-3 text-left font-bold text-[#0F1424] active:scale-[0.98] active:border-[#2230C2] transition"
                  >
                    {o.texto}
                  </button>
                ))}
              </div>
            </div>
            )}
           </div>
          </div>
        )}

        {/* ── Revelación ── */}
        {etapa === "final" && acerto !== null && (
          <div className="flex-1 bg-[#f5f5fa] pb-10">
            <div className={`chat-pop px-6 pt-8 pb-14 text-center ${acerto ? "bg-emerald-500" : "bg-[#FF6B4A]"} ${acerto ? "text-white" : "text-[#0F1424]"}`}>
              {acerto ? <ShieldCheck className="h-16 w-16 mx-auto" /> : <XCircle className="h-16 w-16 mx-auto" />}
              <p className="text-4xl font-black tracking-tight mt-3">{acerto ? caso.bien.titulo : caso.mal.titulo}</p>
              <p className="text-lg mt-3 leading-snug opacity-90">{acerto ? caso.bien.texto : caso.mal.texto}</p>
            </div>

            <div className="relative z-10 px-5 -mt-8 space-y-4">
              {/* Lo primero: qué hacer ahora */}
              <div className="bg-white rounded-3xl shadow-xl p-5">
                {siguiente ? (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="font-extrabold text-[#0F1424] text-lg">Llevas {jugados} de {TOTAL_CASOS}</p>
                      <p className="text-sm font-semibold text-[#0F1424]/60">{aciertos} detectado{aciertos === 1 ? "" : "s"}</p>
                    </div>
                    <div className="flex gap-1.5 mt-3">
                      {CASOS.map((c) => (
                        <span
                          key={c.slug}
                          className={`h-2.5 flex-1 rounded-full ${!(c.slug in avance) ? "bg-[#0F1424]/10" : avance[c.slug] ? "bg-emerald-500" : "bg-[#FF6B4A]"} ${c.slug === caso.slug ? "ring-2 ring-offset-2 ring-[#2230C2]/40" : ""}`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => navigate(`/etm/${siguiente.slug}`)}
                      className={`mt-4 w-full h-16 rounded-2xl ${DEGRADADO} text-white text-lg font-extrabold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition`}
                    >
                      Siguiente caso <ArrowRight className="h-5 w-5" />
                    </button>
                    <p className="text-center text-xs text-[#0F1424]/55 mt-2">o acerca tu celular a otra tarjeta del panel</p>
                  </>
                ) : (
                  <div className="text-center">
                    <Trophy className="h-12 w-12 mx-auto text-amber-500" />
                    <p className="font-black text-2xl text-[#0F1424] mt-2">Detectaste {aciertos} de {TOTAL_CASOS}</p>
                    <p className="text-sm text-[#0F1424]/65 mt-1">
                      {aciertos === TOTAL_CASOS ? "No te pasan gato por liebre 😎" : aciertos >= TOTAL_CASOS / 2 ? "Bien, pero alguno se te pasó 👀" : "Mejor que te pase acá y no con tu plata 😅"}
                    </p>
                    <div className="flex gap-1.5 mt-4">
                      {CASOS.map((c) => (
                        <span key={c.slug} className={`h-2.5 flex-1 rounded-full ${avance[c.slug] ? "bg-emerald-500" : "bg-[#FF6B4A]"}`} />
                      ))}
                    </div>
                    <button
                      onClick={compartir}
                      className={`mt-4 w-full h-16 rounded-2xl ${DEGRADADO} text-white text-lg font-extrabold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition`}
                    >
                      <Share2 className="h-5 w-5" /> Desafía a alguien
                    </button>
                    <button onClick={reiniciar} className="mt-2 text-sm font-semibold text-[#2230C2] inline-flex items-center gap-1.5">
                      <RotateCcw className="h-4 w-4" /> Jugar de nuevo
                    </button>
                  </div>
                )}
              </div>

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

              <div className={`${DEGRADADO} rounded-3xl shadow-xl p-5 text-white relative overflow-hidden`}>
                <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-emerald-400/30 rounded-full blur-3xl pointer-events-none" />
                <p className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> Con Trado
                </p>
                <p className="text-xl font-extrabold leading-snug mt-2 relative">{caso.conTrado}</p>
                <button
                  onClick={() => navigate(`/auth?tab=register&utm_source=etm&utm_medium=nfc&utm_campaign=${caso.slug}`)}
                  className="relative mt-5 w-full h-14 rounded-2xl bg-white text-[#2230C2] font-extrabold flex items-center justify-center gap-2 active:scale-[0.98] transition"
                >
                  Crear mi cuenta gratis <ArrowRight className="h-5 w-5" />
                </button>
                <p className="relative text-center text-sm text-white/80 mt-2.5">
                  Tu primera sala va sin comisión, hasta ${formatCLP(PRIMERA_SALA_GRATIS_HASTA)}.
                </p>
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
