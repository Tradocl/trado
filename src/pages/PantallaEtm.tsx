import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Flag, Nfc, Users } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/lib/supabase";
import { CASOS } from "@/lib/casos-etm";

// Pantalla para la laptop o tablet del stand del EtMday: invita a jugar y muestra en vivo
// cuántas personas han jugado y qué caso engaña más. Lee solo totales (etm_resumen).

type Resumen = {
  personas: number;
  respuestas: number;
  aciertos: number;
  casos: { caso: string; respuestas: number; aciertos: number }[];
};

const DEGRADADO = "bg-gradient-to-br from-[#2230C2] via-[#4B35D6] via-55% to-[#7C3AED]";
const pct = (a: number, n: number) => (n ? Math.round((a / n) * 100) : 0);

const PantallaEtm = () => {
  const [r, setR] = useState<Resumen | null>(null);
  const [conectado, setConectado] = useState(true);

  useEffect(() => {
    let vivo = true;
    const cargar = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("etm_resumen");
      if (!vivo) return;
      if (error || !data) { setConectado(false); return; }
      setConectado(true);
      setR(data as Resumen);
    };
    cargar();
    const id = setInterval(cargar, 8000);
    return () => { vivo = false; clearInterval(id); };
  }, []);

  const porCaso = CASOS.map((c) => {
    const d = r?.casos.find((x) => x.caso === c.slug);
    return { caso: c, respuestas: d?.respuestas ?? 0, acierto: pct(d?.aciertos ?? 0, d?.respuestas ?? 0) };
  });
  const jugados = porCaso.filter((x) => x.respuestas > 0);
  const masEngana = jugados.length ? [...jugados].sort((a, b) => a.acierto - b.acierto)[0] : null;

  return (
    <div className={`min-h-[100dvh] ${DEGRADADO} text-white overflow-hidden relative`}>
      <Helmet>
        <title>¿Lo detectarías? · Trado en el EtMday</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="absolute -top-32 -right-32 w-[34rem] h-[34rem] bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-32 w-[34rem] h-[34rem] bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative h-full min-h-[100dvh] grid lg:grid-cols-[1.1fr_1fr] gap-10 p-8 lg:p-14 items-center">
        {/* Invitación */}
        <div>
          <Logo variant="white" height={44} />
          <h1 className="text-6xl xl:text-7xl font-black tracking-tight leading-[1.02] mt-10">
            ¿Lo <span className="underline decoration-emerald-400 decoration-[8px] underline-offset-[12px]">detectarías</span>?
          </h1>
          <p className="text-2xl text-white/90 mt-6 max-w-xl leading-snug">
            6 estafas reales de compraventa en Chile. Mira el chat y decide qué harías.
          </p>
          <div className="mt-10 flex items-center gap-6">
            <div className="bg-white rounded-3xl p-3 shadow-2xl shrink-0">
              <img src="/etm/qr-jugar.svg" alt="QR para jugar" className="w-40 h-40" />
            </div>
            <div className="space-y-3 text-xl">
              <p className="flex items-center gap-3 font-bold"><Nfc className="h-8 w-8 text-emerald-300" /> Acerca tu celular a una tarjeta</p>
              <p className="text-white/80">o escanea el código</p>
            </div>
          </div>
        </div>

        {/* En vivo */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white/75">
            <span className={`w-2.5 h-2.5 rounded-full ${conectado ? "bg-emerald-400 animate-pulse" : "bg-white/40"}`} />
            {conectado ? "En vivo" : "Conectando…"}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-3xl bg-white/10 border border-white/20 backdrop-blur p-6">
              <Users className="h-7 w-7 text-emerald-300" />
              <p className="text-6xl font-black mt-2 tabular-nums">{r?.personas ?? 0}</p>
              <p className="text-white/80 mt-1">personas ya jugaron</p>
            </div>
            <div className="rounded-3xl bg-white/10 border border-white/20 backdrop-blur p-6">
              <Flag className="h-7 w-7 text-[#FF6B4A]" />
              <p className="text-6xl font-black mt-2 tabular-nums">{pct(r?.aciertos ?? 0, r?.respuestas ?? 0)}%</p>
              <p className="text-white/80 mt-1">de las estafas detectadas</p>
            </div>
          </div>

          <div className="rounded-3xl bg-white text-[#0F1424] p-6 shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-wider text-[#0F1424]/55">Cuántos la detectan</p>
            <div className="mt-4 space-y-3.5">
              {porCaso.map(({ caso, respuestas, acierto }) => (
                <div key={caso.slug}>
                  <div className="flex justify-between text-[15px] font-semibold">
                    <span>{caso.titulo}</span>
                    <span className="tabular-nums">{respuestas ? `${acierto}%` : "—"}</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100 mt-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${acierto < 50 ? "bg-[#FF6B4A]" : "bg-emerald-500"}`}
                      style={{ width: `${respuestas ? Math.max(4, acierto) : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {masEngana && masEngana.acierto < 100 && (
              <p className="mt-5 rounded-2xl bg-orange-50 px-4 py-3 font-bold">
                🚩 La que más engaña: {masEngana.caso.titulo} ({100 - masEngana.acierto}% cae)
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PantallaEtm;
