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

/** Lo que se lleva la pasarela de cada depósito. Trado lo absorbe. */
export const GATEWAY_COST_RATE = 0.036;

/** Pasarela: 5% plano. No se escala porque la pasarela ya se lleva ~3,6%. */
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
 * ya le costó ~3,6% a Trado al entrar, así que cobrarle la tarifa barata sería
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
