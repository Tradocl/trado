import { useState } from "react";
import { Gift, ShieldCheck, Store, TriangleAlert } from "lucide-react";
import { calculateFee, formatCLP, MAX_TRANSACTION_AMOUNT, PRIMERA_SALA_GRATIS_HASTA } from "@/lib/utils";
import { OFFER_TRANSFER_AT } from "@/lib/trado-bank";

// El costo de Trado contado contra lo que de verdad está en juego: quien compra o vende por
// redes no paga comisión, se arriesga a perder todo. Los números salen de calculateFee y de
// la primera sala sin comisión; nada escrito a mano.
const MONTOS = [
  20_000, 30_000, 50_000, 80_000, 100_000, 150_000, 200_000, 250_000, 300_000, 400_000, 500_000,
  750_000, 1_000_000, 1_500_000, 2_000_000,
];

const pct = (fee: number, monto: number) =>
  (Math.round((fee / monto) * 1000) / 10).toLocaleString("es-CL", { maximumFractionDigits: 1 });

export const CuantoVale = () => {
  const [i, setI] = useState(4);
  const monto = MONTOS[i];
  const primeraGratis = monto <= PRIMERA_SALA_GRATIS_HASTA;
  const tarjeta = calculateFee(monto, "gateway");
  const transferencia = monto >= OFFER_TRANSFER_AT ? calculateFee(monto, "transfer") : null;
  const mejor = transferencia ?? tarjeta;
  // Lo que le queda al que vende: marketplace grande ~20 %; Trado, primera sala gratis o tarjeta
  const enMarketplace = Math.round((monto * 0.8) / 10) * 10;
  const conTrado = primeraGratis ? monto : monto - tarjeta;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="rounded-3xl bg-white border border-border shadow-2xl p-6 sm:p-8">
        <label htmlFor="monto-trato" className="text-sm font-semibold text-muted-foreground">
          Tu trato es de
        </label>
        <p className="text-4xl sm:text-5xl font-extrabold tracking-tight mt-1">${formatCLP(monto)}</p>
        <input
          id="monto-trato"
          type="range"
          min={0}
          max={MONTOS.length - 1}
          value={i}
          onChange={(e) => setI(Number(e.target.value))}
          aria-valuetext={`$${formatCLP(monto)}`}
          className="w-full mt-5 accent-[hsl(var(--primary))] h-2 cursor-pointer"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>$20.000</span>
          <span>${formatCLP(MAX_TRANSACTION_AMOUNT)}</span>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-7">
          <div className="rounded-2xl bg-red-50 border border-red-100 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-red-700">
              <TriangleAlert className="h-4 w-4" /> Si transfieres a ciegas y sale mal
            </p>
            <p className="text-3xl sm:text-4xl font-extrabold text-red-600 mt-2">−${formatCLP(monto)}</p>
            <p className="text-sm text-red-900/70 mt-1">Pierdes todo, y no tienes con qué reclamar.</p>
          </div>
          <div className="rounded-2xl bg-success/10 border border-success/30 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-success">
              {primeraGratis ? <Gift className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              {primeraGratis ? "Con Trado, tu primera sala" : "Con Trado"}
            </p>
            <p className="text-3xl sm:text-4xl font-extrabold text-success mt-2">
              {primeraGratis ? "$0" : `$${formatCLP(mejor)}`}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {primeraGratis
                ? "La plata espera en Trado hasta que recibes lo acordado."
                : `${transferencia !== null ? "Por transferencia" : "Con tarjeta"}, el ${pct(mejor, monto)} %. Y la plata no se mueve hasta que recibes.`}
            </p>
          </div>
        </div>
      </div>

      {/* Para el que vende: su otra opción es publicar en un marketplace grande. No se nombra a
          ninguno. "Hasta cerca de un 20 %" = publicación premium (~18 %) más cargos, medido por el
          dueño vendiendo ahí y en línea con fuentes externas que dan 13-20 % (revisado 2026-11-03).
          Con Trado se toma la tarjeta (5 %), el caso más caro, o $0 si es la primera sala. */}
      <div className="mt-5 rounded-3xl bg-gradient-to-br from-slate-900 to-[hsl(238,45%,22%)] text-white p-6 sm:p-7 shadow-xl">
        <p className="flex items-center gap-2 text-sm font-semibold text-white/70">
          <Store className="h-4 w-4" /> ¿Vendes? Mira con cuánto te quedas
        </p>
        <div className="mt-5 space-y-4">
          <div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-white/70">En un marketplace grande</span>
              <span className="text-xl font-bold text-white/80">≈ ${formatCLP(enMarketplace)}</span>
            </div>
            <div className="mt-1.5 h-3 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-red-400/80 rounded-full transition-all duration-500" style={{ width: "80%" }} />
            </div>
            <p className="text-[11px] text-white/45 mt-1">Hasta cerca de un 20 % entre comisión y cargos</p>
          </div>
          <div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-white/70">Por tus redes, con Trado</span>
              <span className="text-2xl font-extrabold text-emerald-300">${formatCLP(conTrado)}</span>
            </div>
            <div className="mt-1.5 h-3 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${(conTrado / monto) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-white/45 mt-1">
              {primeraGratis ? "Tu primera sala, sin comisión" : "Con tarjeta, el caso más caro"}
            </p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-emerald-400/15 border border-emerald-300/30 px-4 py-3">
          <span className="text-sm text-white/85">Te quedas con hasta</span>
          <span className="text-right">
            <span className="text-2xl font-extrabold text-emerald-300">${formatCLP(conTrado - enMarketplace)}</span>
            <span className="text-sm text-white/85"> más</span>
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4 leading-relaxed max-w-2xl mx-auto">
        Desde la segunda sala: con tarjeta, ${formatCLP(tarjeta)}
        {transferencia !== null && <> · por transferencia, ${formatCLP(transferencia)}</>}
        {transferencia === null && <> · por transferencia, más barato desde ${formatCLP(OFFER_TRANSFER_AT)}</>}
        . La paga quien crea la sala, y si el trato no se concreta, no se cobra.
      </p>
    </div>
  );
};
