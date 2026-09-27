// Tarifas de Trado, lado servidor.
//
// ⚠️ ESPEJO DE src/lib/utils.ts. Las Edge Functions corren en Deno y no pueden
// importar del bundle del frontend, así que la lógica está duplicada a
// propósito. Si cambias una tarifa acá, cámbiala allá en el mismo commit, y
// viceversa. Los tests de src/lib/utils.test.ts fijan estos mismos números.
//
// El servidor es la fuente de verdad: el cliente muestra un precio, pero el que
// se cobra es el que calcula process-escrow-deposit con estas funciones.

const MIN_FEE = 1_000;

/**
 * Lo que se lleva la pasarela de cada depósito. Trado lo absorbe.
 * 3,08% medido sobre cobros reales de MercadoPago el 2026-09-12.
 */
export const GATEWAY_COST_RATE = 0.0308;

/** Pasarela: 5% plano. No se escala porque la pasarela ya se lleva ~3,08%. */
const GATEWAY_RATE = 0.05;

/**
 * Transferencia: tramos marginales decrecientes. Cada tramo cobra su tasa sólo
 * sobre la parte del monto que cae dentro de él. Acá la pasarela no cobra nada,
 * así que lo cobrado es lo ganado.
 */
const TRANSFER_TIERS: { upTo: number; rate: number }[] = [
  { upTo: 400_000, rate: 0.035 },
  { upTo: 1_150_000, rate: 0.03 },
  { upTo: Infinity, rate: 0.025 },
];

function applyTiers(amount: number, tiers: { upTo: number; rate: number }[]): number {
  let fee = 0;
  let restante = amount;
  let desde = 0;

  for (const { upTo, rate } of tiers) {
    if (restante <= 0) break;
    const tramo = Math.min(restante, upTo - desde);
    fee += tramo * rate;
    restante -= tramo;
    desde = upTo;
  }
  return fee;
}

export type PaymentMethod = "gateway" | "transfer";

export function calculateFee(amount: number, method: PaymentMethod = "gateway"): number {
  const raw = method === "transfer"
    ? applyTiers(amount, TRANSFER_TIERS)
    : amount * GATEWAY_RATE;

  return Math.max(Math.round(raw / 10) * 10, MIN_FEE);
}

/**
 * Cómo se reparte el escrow cuando una disputa se resuelve (por acuerdo mutuo
 * o por decisión del admin). Única regla para los dos caminos.
 *
 * Entradas sobre el PRECIO: `buyerPart + sellerPart === amount`. La comisión se
 * cobra en proporción a lo que efectivamente recibe el vendedor: venta entera,
 * comisión entera; mitad, mitad; nada, nada.
 *
 * - Sala creada por el vendedor (escrow = precio): la comisión se descuenta de
 *   lo que recibe el vendedor.
 * - Sala creada por el comprador (escrow = precio + comisión prepagada): el
 *   vendedor recibe su parte entera y al comprador se le devuelve la comisión
 *   que no se cobró.
 *
 * Antes cada camino hacía algo distinto: el admin fallando a favor del vendedor
 * no cobraba comisión (o le pasaba al vendedor la comisión prepagada por el
 * comprador), y un reembolso total por acuerdo mutuo se quedaba en silencio con
 * la comisión prepagada del comprador.
 */
export interface ResolutionSplit {
  escrow: number;
  buyerFinal: number;
  sellerFinal: number;
  commissionCharged: number;
}

export function splitResolution(p: {
  amount: number;
  commission: number;
  initiatorRole: string | null | undefined;
  buyerPart: number;
  sellerPart: number;
}): ResolutionSplit {
  const amount = Number(p.amount);
  const commission = Math.max(0, Number(p.commission) || 0);
  const buyerPart = Number(p.buyerPart);
  const sellerPart = Number(p.sellerPart);

  if (!(amount > 0)) throw new Error("Monto de la sala inválido");
  if (buyerPart < 0 || sellerPart < 0) throw new Error("Los montos no pueden ser negativos");
  if (Math.abs(buyerPart + sellerPart - amount) > 0.5) {
    throw new Error(`Los montos deben sumar exactamente el precio de la sala (${amount})`);
  }

  const commissionCharged = sellerPart > 0 ? Math.round((commission * sellerPart) / amount) : 0;
  const compradorPrepago = (p.initiatorRole ?? "seller") === "buyer";

  return compradorPrepago
    ? {
        escrow: amount + commission,
        sellerFinal: sellerPart,
        buyerFinal: buyerPart + (commission - commissionCharged),
        commissionCharged,
      }
    : {
        escrow: amount,
        sellerFinal: sellerPart - commissionCharged,
        buyerFinal: buyerPart,
        commissionCharged,
      };
}

/**
 * Cuánta marca de pasarela devolver a la billetera cuando se reembolsa plata.
 *
 * Al financiar la sala se consumieron `gatewayFundedUsed` pesos marcados. Si
 * después se devuelve dinero al comprador, esa plata tiene que volver marcada:
 * desde 2026-09-24 la plata de tarjeta no se puede retirar al banco, sólo
 * devolver a la tarjeta, y si el reembolso la "lavara" saldría al banco una
 * tarjeta que nunca completó una compra.
 *
 * LA TARJETA VUELVE PRIMERO. Se restituye min(marca usada, monto devuelto), no
 * una proporción. Con la regla proporcional anterior, una sala pagada mitad
 * tarjeta y mitad transferencia que devolvía la mitad restituía sólo un cuarto
 * como tarjeta: el otro cuarto de plata de tarjeta quedaba retirable.
 *
 * `salaAmount` se mantiene en la firma por compatibilidad con los llamadores.
 */
export function gatewayMarkToRestore(
  _salaAmount: number,
  gatewayFundedUsed: number,
  refundedAmount: number,
): number {
  const used = Math.max(0, Number(gatewayFundedUsed) || 0);
  const refunded = Math.max(0, Number(refundedAmount) || 0);
  return Math.round(Math.min(used, refunded) * 100) / 100;
}

export interface BlendedFee {
  fee: number;
  fromGateway: number;
  fromClean: number;
  gatewayShare: number;
  ifAllGateway: number;
  ifAllTransfer: number;
}

/**
 * Comisión cuando el saldo mezcla orígenes.
 *
 * Se consumen primero los pesos con marca de pasarela, que pagan 5%: esa plata
 * ya le costó ~3,08% a Trado al entrar, así que cobrarle la tarifa barata sería
 * perder. El resto paga la escala de transferencia, y la comisión final es la
 * mezcla proporcional.
 */
export function calculateBlendedFee(
  amount: number,
  gatewayFundedBalance: number,
): BlendedFee {
  const ifAllGateway = calculateFee(amount, "gateway");
  const ifAllTransfer = calculateFee(amount, "transfer");

  if (amount <= 0) {
    return {
      fee: 0, fromGateway: 0, fromClean: 0, gatewayShare: 0,
      ifAllGateway, ifAllTransfer,
    };
  }

  const fromGateway = Math.max(0, Math.min(gatewayFundedBalance, amount));
  const fromClean = amount - fromGateway;
  const gatewayShare = fromGateway / amount;
  const raw = gatewayShare * ifAllGateway + (1 - gatewayShare) * ifAllTransfer;

  return {
    fee: Math.max(Math.round(raw / 10) * 10, MIN_FEE),
    fromGateway,
    fromClean,
    gatewayShare,
    ifAllGateway,
    ifAllTransfer,
  };
}
