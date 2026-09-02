import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Genera un código de referencia alfanumérico corto y único
 * Formato: TR-XXXX (TR + 4 caracteres alfanuméricos)
 */
export function generateReferenceCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'TR-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Formatea un monto en CLP con separadores de miles y sin decimales
 * 
 * @param amount - Monto en CLP
 * @returns String formateado (ej: 12.500 para 12500)
 */
export function formatCLP(amount: number): string {
  return Math.round(amount).toLocaleString('es-CL');
}

/**
 * Formatea un string de input con separadores de miles (puntos)
 * Elimina caracteres no numéricos y agrega puntos cada 3 dígitos
 * 
 * @param value - Valor del input
 * @returns String formateado con puntos
 */
export function formatAmountInput(value: string): string {
  // Remove all non-numeric characters
  const numericValue = value.replace(/\D/g, '');
  // Add thousand separators (dots)
  return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Parsea un string formateado con puntos a número
 * 
 * @param value - Valor formateado (ej: "1.500.000")
 * @returns Número parseado (ej: 1500000)
 */
export function parseFormattedAmount(value: string): number {
  const numericValue = value.replace(/\D/g, '');
  return parseInt(numericValue, 10) || 0;
}

// Monto máximo operable sin hablar con nosotros. Por encima, precio a medida.
export const MAX_TRANSACTION_AMOUNT = 2_000_000;

// Desde acá le ofrecemos al usuario cotizar a medida, sin bloquearlo: puede
// seguir solo con el precio automático si prefiere.
export const CUSTOM_PRICING_FROM = 1_000_000;

// Comisión mínima por operación.
const MIN_FEE = 1_000;

/** Medio por el que entra la plata. Define qué tarifa se aplica. */
export type PaymentMethod = "gateway" | "transfer";

/** Lo que se lleva MercadoPago de cada depósito. Trado lo absorbe. */
export const GATEWAY_COST_RATE = 0.036;

/**
 * Pasarela: 5% plano, sin tramos. La pasarela nos cobra ~3,6%, así que el neto
 * es ~1,4% y no da para escalarlo hacia abajo. Simple de explicar y de cobrar.
 */
const GATEWAY_RATE = 0.05;

/**
 * Transferencia: tramos MARGINALES decrecientes. Cada tramo cobra su tasa sólo
 * sobre la parte del monto que cae dentro de él, como el impuesto a la renta.
 * Eso la hace continua (nunca hay un escalón donde pagar un peso más salga
 * desproporcionado) y decreciente.
 *
 * Acá la pasarela no cobra nada, así que lo cobrado es lo ganado: incluso el
 * tramo más barato (2,5%) deja mejor margen que el 5% con tarjeta.
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

/** Comisión de Trado para un monto según el medio de pago. */
export function calculateFee(
  transactionAmount: number,
  method: PaymentMethod = "gateway",
): number {
  const raw = method === "transfer"
    ? applyTiers(transactionAmount, TRANSFER_TIERS)
    : transactionAmount * GATEWAY_RATE;

  return Math.max(Math.round(raw / 10) * 10, MIN_FEE);
}

/** Tasa efectiva (0-1) que termina pagando el usuario. */
export function effectiveFeeRate(
  transactionAmount: number,
  method: PaymentMethod = "gateway",
): number {
  if (transactionAmount <= 0) return 0;
  return calculateFee(transactionAmount, method) / transactionAmount;
}

/** Lo que Trado gana de verdad, ya descontado el costo de la pasarela. */
export function netMargin(
  transactionAmount: number,
  method: PaymentMethod,
): number {
  const fee = calculateFee(transactionAmount, method);
  return method === "transfer"
    ? fee
    : fee - transactionAmount * GATEWAY_COST_RATE;
}

/** Cuánto se ahorra el usuario pagando por transferencia en vez de tarjeta. */
export function transferSavings(transactionAmount: number): number {
  return calculateFee(transactionAmount, "gateway")
    - calculateFee(transactionAmount, "transfer");
}

export interface BlendedFee {
  /** Comisión final a cobrar por la sala. */
  fee: number;
  /** Pesos del saldo con marca de tarjeta que se consumen. */
  fromGateway: number;
  /** Pesos sin marca (transferencia, ventas, reembolsos). */
  fromClean: number;
  /** Proporción 0-1 del monto cubierta con plata de tarjeta. */
  gatewayShare: number;
  /** Referencias para mostrar la comparación en pantalla. */
  ifAllGateway: number;
  ifAllTransfer: number;
}

/**
 * Comisión cuando el saldo mezcla orígenes.
 *
 * El saldo es fungible: una vez adentro, no se distingue qué peso entró por
 * tarjeta. Por eso la billetera lleva `gateway_funded_balance`, cuánto del
 * saldo llegó por pasarela y todavía no se ha gastado.
 *
 * Se consumen PRIMERO los pesos con marca de tarjeta, que pagan 5%. Esa plata
 * ya le costó a Trado ~3,6% al entrar, así que cobrarle la tarifa barata sería
 * perder dinero. El resto paga la escala de transferencia. La comisión final es
 * la mezcla proporcional de ambas tarifas.
 *
 * La marca se agota: cuando esos pesos se gastan, lo que queda es limpio. Y la
 * plata que entra por una venta o un reembolso nunca la lleva, porque nunca
 * pasó por la pasarela.
 */
export function calculateBlendedFee(
  transactionAmount: number,
  gatewayFundedBalance: number,
): BlendedFee {
  const ifAllGateway = calculateFee(transactionAmount, "gateway");
  const ifAllTransfer = calculateFee(transactionAmount, "transfer");

  if (transactionAmount <= 0) {
    return {
      fee: 0, fromGateway: 0, fromClean: 0, gatewayShare: 0,
      ifAllGateway, ifAllTransfer,
    };
  }

  const fromGateway = Math.max(0, Math.min(gatewayFundedBalance, transactionAmount));
  const fromClean = transactionAmount - fromGateway;
  const gatewayShare = fromGateway / transactionAmount;

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

/** Si conviene ofrecerle cotización a medida en vez del precio automático. */
export function qualifiesForCustomPricing(transactionAmount: number): boolean {
  return transactionAmount >= CUSTOM_PRICING_FROM;
}

export function calculateOrderDetails(
  transactionAmount: number,
  method: PaymentMethod = "gateway",
): {
  buyerPays: number;
  appFee: number;
  sellerReceives: number;
  referenceCode: string;
  /** Comisión si pagara por el otro medio, para mostrar la comparación. */
  transferFee: number;
  gatewayFee: number;
  savings: number;
} {
  if (transactionAmount <= 0) {
    throw new Error("El monto de la transacción debe ser mayor a 0");
  }

  const appFee = calculateFee(transactionAmount, method);

  return {
    buyerPays: transactionAmount,
    appFee,
    sellerReceives: transactionAmount - appFee,
    referenceCode: generateReferenceCode(),
    gatewayFee: calculateFee(transactionAmount, "gateway"),
    transferFee: calculateFee(transactionAmount, "transfer"),
    savings: transferSavings(transactionAmount),
  };
}
