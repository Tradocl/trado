import { useState } from "react";
import { Gift } from "lucide-react";
import { calculateFee, formatCLP, MAX_TRANSACTION_AMOUNT, PRIMERA_SALA_GRATIS_HASTA } from "@/lib/utils";
import { OFFER_TRANSFER_AT } from "@/lib/trado-bank";

// Cuánto cuesta, con los números del código: calculateFee, el umbral de transferencia y la
// primera sala sin comisión. Nada escrito a mano.
const PASOS_SLIDER = [
  10_000, 20_000, 30_000, 50_000, 75_000, 100_000, 150_000, 200_000, 250_000, 300_000, 400_000,
  500_000, 750_000, 1_000_000, 1_500_000, 2_000_000,
];

export const Calculadora = () => {
  const [i, setI] = useState(5);
  const monto = PASOS_SLIDER[i];
  const tarjeta = calculateFee(monto, "gateway");
  const transferencia = monto >= OFFER_TRANSFER_AT ? calculateFee(monto, "transfer") : null;
  const primeraGratis = monto <= PRIMERA_SALA_GRATIS_HASTA;

  return (
    <div className="max-w-xl mx-auto rounded-3xl bg-white border border-border shadow-2xl p-6 sm:p-8">
      <label htmlFor="monto" className="text-sm font-semibold text-muted-foreground">Si el trato es de</label>
      <p className="text-4xl sm:text-5xl font-extrabold tracking-tight mt-1 bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">
        ${formatCLP(monto)}
      </p>
      <input
        id="monto"
        type="range"
        min={0}
        max={PASOS_SLIDER.length - 1}
        value={i}
        onChange={(e) => setI(Number(e.target.value))}
        aria-valuetext={`$${formatCLP(monto)}`}
        className="w-full mt-5 accent-[hsl(var(--primary))] h-2 cursor-pointer"
      />
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>$10.000</span>
        <span>${formatCLP(MAX_TRANSACTION_AMOUNT)}</span>
      </div>

      <div className="mt-6 space-y-2.5">
        <div className="flex justify-between items-center rounded-xl bg-muted/50 px-4 py-3">
          <span className="text-sm">Comisión con tarjeta</span>
          <span className="font-bold">${formatCLP(tarjeta)}</span>
        </div>
        <div className="flex justify-between items-center rounded-xl bg-muted/50 px-4 py-3">
          <span className="text-sm">Comisión con transferencia</span>
          {transferencia !== null ? (
            <span className="font-bold text-success">${formatCLP(transferencia)}</span>
          ) : (
            <span className="text-xs text-muted-foreground text-right">desde ${formatCLP(OFFER_TRANSFER_AT)}</span>
          )}
        </div>
        {primeraGratis && (
          <div className="flex items-center gap-3 rounded-xl bg-success/10 border border-success/30 px-4 py-3">
            <Gift className="h-5 w-5 text-success shrink-0" />
            <span className="text-sm">
              <b>Tu primera sala: $0.</b> La primera sala de cada cuenta va sin comisión hasta $
              {formatCLP(PRIMERA_SALA_GRATIS_HASTA)}.
            </span>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
        La paga quien crea la sala, y sólo si el trato se concreta. Crear la cuenta es gratis y no hay cuota mensual.
      </p>
    </div>
  );
};
