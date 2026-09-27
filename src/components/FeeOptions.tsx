import { CreditCard, Landmark } from "lucide-react";
import { calculateFee, formatCLP } from "@/lib/utils";
import { OFFER_TRANSFER_AT } from "@/lib/trado-bank";

/**
 * La comisión según cómo se pague, antes de que se pague.
 *
 * La comisión definitiva se fija recién cuando el comprador financia la sala
 * (process-escrow-deposit), porque ahí se sabe si la plata vino de tarjeta o de
 * transferencia. Hasta entonces mostramos las dos opciones lado a lado: el
 * usuario ve qué le conviene y la transferencia, que es más barata para él y
 * mejor para Trado, queda a la vista.
 *
 * `payer` es quien paga la comisión (quien creó la sala): si es el vendedor se
 * descuenta de lo que recibe; si es el comprador se suma a lo que paga.
 */
export function feeOptions(amount: number, payer: "buyer" | "seller") {
  const tarjeta = calculateFee(amount, "gateway");
  const transferencia = calculateFee(amount, "transfer");
  const resultado = (fee: number) => (payer === "seller" ? amount - fee : amount + fee);
  return {
    tarjeta,
    transferencia,
    conTarjeta: resultado(tarjeta),
    conTransferencia: resultado(transferencia),
    transferenciaDisponible: amount >= OFFER_TRANSFER_AT,
    ahorro: tarjeta - transferencia,
  };
}

export function FeeOptions({
  amount,
  payer,
  compact = false,
}: {
  amount: number;
  payer: "buyer" | "seller";
  compact?: boolean;
}) {
  if (!amount || amount <= 0) return null;
  const o = feeOptions(amount, payer);
  const etiqueta = payer === "seller" ? "Recibes" : "Pagas";

  const fila = (
    Icono: typeof CreditCard,
    titulo: string,
    fee: number,
    total: number,
    destacada: boolean,
  ) => (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg px-3 ${compact ? "py-2" : "py-2.5"} ${
        destacada ? "bg-success/10 border border-success/30" : "bg-muted/40 border border-transparent"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Icono className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium">{titulo}</p>
          <p className="text-xs text-muted-foreground">
            Comisión {payer === "seller" ? "−" : "+"}${formatCLP(fee)}
          </p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[11px] text-muted-foreground">{etiqueta}</p>
        <p className={`font-bold tabular-nums ${destacada ? "text-success" : ""}`}>${formatCLP(total)}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        La comisión depende de cómo pague el comprador:
      </p>
      {fila(CreditCard, "Con tarjeta · 5%", o.tarjeta, o.conTarjeta, false)}
      {o.transferenciaDisponible ? (
        <>
          {fila(Landmark, "Con transferencia", o.transferencia, o.conTransferencia, true)}
          {o.ahorro > 0 && (
            <p className="text-xs text-success">
              Pagando por transferencia {payer === "seller" ? "recibes" : "ahorras"} ${formatCLP(o.ahorro)}{" "}
              {payer === "seller" ? "más" : ""}.
            </p>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground px-1">
          Por transferencia, con comisión más baja, desde ${formatCLP(OFFER_TRANSFER_AT)}.
        </p>
      )}
    </div>
  );
}
