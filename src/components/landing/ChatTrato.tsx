import { useEffect, useRef, useState } from "react";
import { CheckCheck, Link2, Lock, ShieldCheck } from "lucide-react";
import { formatCLP } from "@/lib/utils";

// Una conversación cualquiera de compraventa por redes, en el momento justo en que el
// vendedor pide la transferencia por adelantado y el comprador responde con una sala.
type Linea =
  | { de: "ellos" | "yo"; texto: string }
  | { de: "yo"; link: true }
  | { de: "sistema"; texto: string };

const armarLineas = (monto: number): Linea[] => [
  { de: "yo", texto: "Hola! ¿Sigue disponible? Me interesa 🙂" },
  { de: "ellos", texto: "Sí! Transfiéreme primero y te lo mando al tiro 😉" },
  { de: "yo", texto: "Mejor por Trado: la plata queda retenida hasta que me llegue, y ahí te la liberan 👇" },
  { de: "yo", link: true },
  { de: "ellos", texto: "Dale, me uno y te lo envío 👍" },
  { de: "sistema", texto: `Pago retenido en Trado · $${formatCLP(monto)}` },
];

const reducido = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const ChatTrato = ({ producto, monto }: { producto: string; monto: number }) => {
  const lineas = armarLineas(monto);
  const [n, setN] = useState(reducido() ? lineas.length : 0);
  const [escribiendo, setEscribiendo] = useState(false);
  const [activo, setActivo] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fondo = useRef<HTMLDivElement>(null);

  // Arranca cuando el teléfono aparece en pantalla, no antes
  useEffect(() => {
    const el = ref.current;
    if (!el || reducido()) return;
    const obs = new IntersectionObserver(([e]) => setActivo(e.isIntersecting), { threshold: 0.35 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!activo) return;
    let t: ReturnType<typeof setTimeout>;
    if (n >= lineas.length) {
      t = setTimeout(() => setN(0), 4500);
    } else if (lineas[n].de === "ellos") {
      setEscribiendo(true);
      t = setTimeout(() => {
        setEscribiendo(false);
        setN((x) => x + 1);
      }, 1500);
    } else {
      t = setTimeout(() => setN((x) => x + 1), n === 0 ? 600 : 1300);
    }
    return () => clearTimeout(t);
  }, [activo, n, lineas.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fondo.current?.scrollTo({ top: fondo.current.scrollHeight, behavior: "smooth" });
  }, [n, escribiendo]);

  return (
    <div ref={ref} className="mx-auto w-full max-w-[330px]" aria-label="Ejemplo de conversación usando Trado">
      <div className="rounded-[2.6rem] bg-[#0f1424] p-2.5 shadow-[0_30px_80px_-20px_rgba(31,37,193,0.55)] ring-1 ring-white/10">
        <div className="rounded-[2.1rem] overflow-hidden bg-[#ece5dd]">
          <div className="bg-[#1F25C1] text-white px-4 pt-5 pb-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center font-bold">M</div>
            <div className="leading-tight">
              <p className="font-semibold text-sm">Martina · vende</p>
              <p className="text-[11px] text-white/70">{escribiendo ? "escribiendo…" : "en línea"}</p>
            </div>
          </div>
          <div ref={fondo} className="h-[400px] overflow-hidden px-3 py-4 space-y-2 flex flex-col">
            {lineas.slice(0, n).map((l, i) => {
              if (l.de === "sistema")
                return (
                  <div key={i} className="chat-pop self-center mt-1 flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow">
                    <Lock className="h-3.5 w-3.5" /> {l.texto}
                  </div>
                );
              const mio = l.de === "yo";
              return (
                <div
                  key={i}
                  className={`chat-pop max-w-[82%] text-[13.5px] leading-snug shadow-sm ${
                    mio ? "self-end bg-[#dcf8c6] rounded-2xl rounded-br-md" : "self-start bg-white rounded-2xl rounded-bl-md"
                  } ${"link" in l ? "p-1.5" : "px-3 py-2"} text-[#0f1424]`}
                >
                  {"link" in l ? (
                    <div className="rounded-xl bg-white overflow-hidden">
                      <div className="bg-gradient-to-br from-[#1F25C1] to-[#7C3AED] text-white px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-wider text-white/70 font-bold flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> Sala protegida
                        </p>
                        <p className="font-bold truncate">{producto.trim() || "Tu trato"} · ${formatCLP(monto)}</p>
                      </div>
                      <p className="px-3 py-2 text-[12px] text-[#1F25C1] font-semibold flex items-center gap-1">
                        <Link2 className="h-3.5 w-3.5" /> trado.cl · únete a la sala
                      </p>
                    </div>
                  ) : (
                    <span>
                      {l.texto}
                      {mio && <CheckCheck className="inline h-3.5 w-3.5 ml-1 -mt-0.5 text-sky-500" />}
                    </span>
                  )}
                </div>
              );
            })}
            {escribiendo && (
              <div className="chat-pop self-start bg-white rounded-2xl rounded-bl-md px-3 py-3 flex gap-1 shadow-sm">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#0f1424]/40 animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
