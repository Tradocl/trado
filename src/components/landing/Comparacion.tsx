import { useEffect, useRef, useState } from "react";
import { Ban, Check, Lock, MessageSquareWarning, Send, ShieldCheck, Smartphone, X } from "lucide-react";
import { formatCLP } from "@/lib/utils";

// La misma compra contada dos veces, cuando el producto no llega. Nada de promesas de
// devolución automática: lo que sí es cierto es que la plata no se mueve hasta resolverlo.
const pasos = (monto: string) => ({
  directo: [
    { icon: Send, texto: `Transfieres $${monto} a una cuenta que no conoces` },
    { icon: Smartphone, texto: "La plata ya está en su cuenta, antes de que envíe nada" },
    { icon: X, texto: "No llega, y deja de responder" },
    { icon: Ban, texto: "No tienes a quién reclamarle" },
  ],
  trado: [
    { icon: Lock, texto: `Pagas $${monto} en Trado, no a su cuenta` },
    { icon: ShieldCheck, texto: "La plata queda retenida mientras envía" },
    { icon: MessageSquareWarning, texto: "No llega: lo reportas desde la sala" },
    { icon: Check, texto: "Se revisa el caso antes de que la plata vaya a alguien" },
  ],
});

const reducido = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const Comparacion = ({ monto }: { monto: number }) => {
  const { directo, trado } = pasos(formatCLP(monto));
  const [n, setN] = useState(reducido() ? 4 : 0);
  const [activo, setActivo] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || reducido()) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setActivo(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!activo || n >= 4) return;
    const t = setTimeout(() => setN((x) => x + 1), n === 0 ? 300 : 900);
    return () => clearTimeout(t);
  }, [activo, n]);

  // Función y no componente: así no se vuelve a montar en cada paso y la transición se ve
  const columna = (bueno: boolean) => {
    const lista = bueno ? trado : directo;
    return (
      <div
        className={`relative rounded-3xl p-6 sm:p-7 overflow-hidden ${
          bueno
            ? "bg-gradient-to-br from-[#1F25C1] to-[#7C3AED] text-white shadow-[0_25px_60px_-20px_rgba(31,37,193,0.6)]"
            : "bg-white border border-border shadow-lg"
        }`}
      >
        {bueno && <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-emerald-400/30 rounded-full blur-3xl pointer-events-none" />}
        <p className={`text-xs font-bold uppercase tracking-wider ${bueno ? "text-white/70" : "text-[#FF6B4A]"}`}>
          {bueno ? "Con Trado" : "Transferencia directa"}
        </p>
        <h3 className="text-2xl font-extrabold mt-1 mb-5">{bueno ? "La plata espera" : "La plata se va"}</h3>
        <ol className="relative space-y-4">
          <span className={`absolute left-[19px] top-2 bottom-2 w-[2px] ${bueno ? "bg-white/20" : "bg-border"}`} />
          {lista.map(({ icon: Icon, texto }, i) => {
            const visible = i < n;
            const ultimo = i === lista.length - 1;
            return (
              <li
                key={texto}
                className={`relative flex items-start gap-3 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
              >
                <span
                  className={`relative z-10 w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center ${
                    bueno
                      ? ultimo ? "bg-emerald-400 text-emerald-950" : "bg-white/15 text-white"
                      : ultimo ? "bg-[#FF6B4A] text-[#0F1424]" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className={`pt-2 text-[15px] leading-snug ${ultimo ? "font-bold" : ""} ${bueno ? "" : "text-foreground"}`}>{texto}</span>
              </li>
            );
          })}
        </ol>
      </div>
    );
  };

  return (
    <div ref={ref} className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
      {columna(false)}
      {columna(true)}
    </div>
  );
};
