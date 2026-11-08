import { useEffect, useState } from "react";
import { formatCLP } from "@/lib/utils";
import { CheckCircle, Lock, Package, ShieldCheck, User, Store } from "lucide-react";

// La sala de la portada, andando sola: la plata sale del comprador, queda en Trado mientras
// se entrega y recién al confirmar llega al vendedor. Los textos son los de la app.
const PASOS = [
  { estado: "Pagas en Trado", detalle: "El comprador deposita el monto acordado", plata: 0, caja: null },
  { estado: "Pago retenido en escrow", detalle: "La plata queda en Trado, no en la cuenta del vendedor", plata: 1, caja: null },
  { estado: "El vendedor entrega", detalle: "Envía el producto, se juntan o entrega el trabajo", plata: 1, caja: "viaja" },
  { estado: "Revisas y confirmas", detalle: "Si no es lo acordado, lo reportas y la plata no se mueve", plata: 1, caja: "llego" },
  { estado: "Pago liberado", detalle: "Recién ahí le llega la plata al vendedor", plata: 2, caja: "llego" },
] as const;

const POS = ["8%", "50%", "92%"];

const usaMovimientoReducido = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const SalaEnVivo = ({ producto = "iPhone 13", monto = 200_000 }: { producto?: string; monto?: number }) => {
  const [paso, setPaso] = useState(usaMovimientoReducido() ? 1 : 0);

  useEffect(() => {
    if (usaMovimientoReducido()) return;
    const id = setInterval(() => setPaso((p) => (p + 1) % PASOS.length), 2300);
    return () => clearInterval(id);
  }, []);

  const p = PASOS[paso];

  return (
    <div className="w-full max-w-md mx-auto" aria-label="Ejemplo de una sala de Trado">
      <div className="rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl p-5 sm:p-6 text-white">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">Sala de ejemplo</p>
            <p className="font-semibold truncate max-w-[220px] sm:max-w-[260px]">{producto} · ${formatCLP(monto)}</p>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-semibold bg-emerald-400/20 text-emerald-200 px-2.5 py-1 rounded-full">
            <ShieldCheck className="h-3.5 w-3.5" /> Protegida
          </span>
        </div>

        {/* Comprador — Trado — Vendedor, con la plata y la caja moviéndose entre ellos */}
        <div className="relative h-28 mb-4">
          <div className="absolute top-9 left-[8%] right-[8%] h-[2px] bg-white/20" />
          {[
            { icon: User, label: "Comprador", left: POS[0] },
            { icon: Lock, label: "Trado", left: POS[1] },
            { icon: Store, label: "Vendedor", left: POS[2] },
          ].map(({ icon: Icon, label, left }) => (
            <div key={label} className="absolute top-3 -translate-x-1/2 flex flex-col items-center" style={{ left }}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${label === "Trado" ? "bg-white text-primary border-white" : "bg-white/15 border-white/25"}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-[11px] mt-1.5 text-white/80 font-medium">{label}</span>
            </div>
          ))}
          <div
            className="absolute -top-1 -translate-x-1/2 transition-[left] duration-700 ease-out"
            style={{ left: POS[p.plata] }}
          >
            <span className="block text-[11px] font-bold bg-emerald-400 text-emerald-950 px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap">
              ${formatCLP(monto)}
            </span>
          </div>
          {p.caja && (
            <div
              className="absolute top-[86px] -translate-x-1/2 transition-[left] duration-700 ease-out"
              style={{ left: p.caja === "viaja" ? "50%" : POS[0] }}
            >
              <Package className="h-5 w-5 text-amber-200 drop-shadow" />
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white/10 p-4 min-h-[76px]" aria-live="polite">
          <p className="font-bold flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-300 shrink-0" /> {p.estado}
          </p>
          <p className="text-sm text-white/70 mt-1">{p.detalle}</p>
        </div>

        <div className="flex gap-1.5 mt-4" role="tablist" aria-label="Pasos de la sala">
          {PASOS.map((x, i) => (
            <button
              key={x.estado}
              role="tab"
              aria-selected={i === paso}
              aria-label={x.estado}
              onClick={() => setPaso(i)}
              className={`h-1.5 flex-1 rounded-full transition-colors ${i <= paso ? "bg-white" : "bg-white/25"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
