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
          Trado con tarjeta es 5 %, y menos por transferencia. Las barras van en proporción: 5 de 20. */}
      <div className="mt-5 rounded-3xl bg-gradient-to-br from-slate-900 to-[hsl(238,45%,22%)] text-white p-6 sm:p-7 shadow-xl">
        <p className="flex items-center gap-2 text-sm font-semibold text-white/70">
          <Store className="h-4 w-4" /> ¿Vendes?
        </p>
        <p className="text-xl sm:text-2xl font-bold mt-2 leading-snug">
          En un marketplace grande, entre comisión y cargos se te puede ir hasta cerca de un 20 % de cada venta.
          Vendiendo por tus redes con Trado, pagas el 5 % o menos, y tu primera sala nada.
        </p>
        <div className="mt-5 space-y-2.5">
          <div>
            <div className="flex justify-between text-xs text-white/60 mb-1">
              <span>Marketplace grande</span>
              <span>hasta ~20 %</span>
            </div>
            <div className="h-3 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-full bg-red-400/80 rounded-full" />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-white/60 mb-1">
              <span>Trado</span>
              <span>5 % o menos · primera sala $0</span>
            </div>
            <div className="h-3 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-1/4 bg-emerald-400 rounded-full" />
            </div>
          </div>
        </div>
        <p className="text-xs text-white/50 mt-4">
          Y sigues vendiendo donde ya te conocen: Instagram, WhatsApp o Facebook.
        </p>
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
