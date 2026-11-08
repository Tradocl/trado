import { ArrowRight, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateFee, formatAmountInput, formatCLP, MAX_TRANSACTION_AMOUNT, parseFormattedAmount, PRIMERA_SALA_GRATIS_HASTA } from "@/lib/utils";
import { OFFER_TRANSFER_AT } from "@/lib/trado-bank";

// Lo que escribe acá la persona queda guardado para que, al crear la cuenta, la sala ya
// venga armada (CreateTransaction lo lee). Vive en localStorage porque el registro puede
// pasar por el correo de verificación y una pestaña nueva pierde el sessionStorage.
export const BORRADOR_SALA = "trado_borrador_sala";
const DURA_MS = 3 * 24 * 60 * 60 * 1000;

export const guardarBorrador = (producto: string, monto: number) => {
  try {
    localStorage.setItem(BORRADOR_SALA, JSON.stringify({ producto: producto.trim().slice(0, 100), monto, ts: Date.now() }));
  } catch {
    /* sin almacenamiento: la sala simplemente no viene armada */
  }
};

export const leerBorrador = (): { producto: string; monto: number } | null => {
  try {
    const raw = localStorage.getItem(BORRADOR_SALA);
    if (!raw) return null;
    localStorage.removeItem(BORRADOR_SALA);
    const b = JSON.parse(raw);
    if (!b || Date.now() - Number(b.ts) > DURA_MS) return null;
    const monto = Number(b.monto);
    return {
      producto: typeof b.producto === "string" ? b.producto.slice(0, 100) : "",
      monto: Number.isFinite(monto) && monto > 0 ? Math.round(monto) : 0,
    };
  } catch {
    return null;
  }
};

export const ArmaTuSala = ({
  producto,
  monto,
  onProducto,
  onMonto,
  onCrear,
}: {
  producto: string;
  monto: number;
  onProducto: (v: string) => void;
  onMonto: (v: number) => void;
  onCrear: () => void;
}) => {
  const valido = monto > 0 && monto <= MAX_TRANSACTION_AMOUNT;
  const tarjeta = valido ? calculateFee(monto, "gateway") : 0;
  const transferencia = valido && monto >= OFFER_TRANSFER_AT ? calculateFee(monto, "transfer") : null;
  const gratis = valido && monto <= PRIMERA_SALA_GRATIS_HASTA;

  return (
    <form
      className="rounded-3xl bg-white/10 border border-white/20 backdrop-blur-md p-4 sm:p-5 shadow-2xl max-w-lg"
      onSubmit={(e) => {
        e.preventDefault();
        onCrear();
      }}
    >
      <p className="text-xs font-bold uppercase tracking-wider text-white/70 mb-3">Arma tu sala en 10 segundos</p>
      <div className="grid grid-cols-1 min-[420px]:grid-cols-[1fr_150px] gap-2">
        <label className="block">
          <span className="sr-only">¿Qué vendes o compras?</span>
          <input
            value={producto}
            onChange={(e) => onProducto(e.target.value.slice(0, 100))}
            placeholder="¿Qué vendes o compras?"
            className="w-full h-12 rounded-xl bg-white text-foreground placeholder:text-muted-foreground px-4 font-medium outline-none focus:ring-4 focus:ring-emerald-300/50"
          />
        </label>
        <label className="block relative">
          <span className="sr-only">¿En cuánto?</span>
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
          <input
            inputMode="numeric"
            value={monto ? formatAmountInput(String(monto)) : ""}
            onChange={(e) => onMonto(parseFormattedAmount(e.target.value))}
            placeholder="En cuánto"
            className="w-full h-12 rounded-xl bg-white text-foreground placeholder:text-muted-foreground pl-8 pr-3 font-bold outline-none focus:ring-4 focus:ring-emerald-300/50"
          />
        </label>
      </div>

      <div className="min-h-[44px] mt-3 text-sm text-white/85" aria-live="polite">
        {!monto ? (
          <p className="text-white/60">Escribe el precio y te mostramos cuánto cuesta protegerlo.</p>
        ) : monto > MAX_TRANSACTION_AMOUNT ? (
          <p>Sobre ${formatCLP(MAX_TRANSACTION_AMOUNT)} lo coordinamos contigo por soporte.</p>
        ) : (
          <div className="space-y-0.5">
            <p>
              Comisión: <b className="text-white">${formatCLP(tarjeta)}</b> con tarjeta
              {transferencia !== null && (
                <> · <b className="text-white">${formatCLP(transferencia)}</b> por transferencia</>
              )}
            </p>
            {gratis && (
              <p className="flex items-center gap-1.5 text-emerald-200 font-semibold">
                <Gift className="h-4 w-4" /> Si es tu primera sala: $0 de comisión
              </p>
            )}
          </div>
        )}
      </div>

      <Button type="submit" size="lg" className="w-full mt-2 bg-white text-primary hover:bg-white/90 shadow-xl text-lg py-6 h-auto font-bold">
        Crear mi sala gratis
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </form>
  );
};
