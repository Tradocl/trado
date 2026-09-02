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

/**
 * Tramos MARGINALES: cada uno cobra su tasa sólo sobre la parte del monto que
 * cae dentro de él, igual que el impuesto a la renta. Eso hace la comisión
 * continua (nunca conviene declarar menos para pagar menos) y decreciente: la
 * tasa efectiva baja a medida que sube el monto.
 *
 * Las tasas están calzadas con el medio de pago, que hoy correlaciona con el
 * monto: bajo $400.000 se paga con tarjeta y Trado absorbe el 3,19% de
 * MercadoPago; sobre $1.150.000 la transferencia es obligatoria y no hay costo
 * de procesador, así que podemos cobrar bastante menos y aun así ganar más neto.
 */
const FEE_TIERS: { upTo: number; rate: number }[] = [
  { upTo: 400_000, rate: 0.05 },   // tarjeta: 5% bruto -> ~1,8% neto
  { upTo: 1_150_000, rate: 0.035 }, // zona mixta, transferencia ya ofrecida
  { upTo: Infinity, rate: 0.025 },  // transferencia obligatoria: neto = bruto
];

/** Comisión de Trado para un monto, aplicando los tramos marginales. */
export function calculateFee(transactionAmount: number): number {
  let fee = 0;
  let restante = transactionAmount;
  let desde = 0;

  for (const { upTo, rate } of FEE_TIERS) {
    if (restante <= 0) break;
    const tramo = Math.min(restante, upTo - desde);
    fee += tramo * rate;
    restante -= tramo;
    desde = upTo;
  }

  return Math.max(Math.round(fee / 10) * 10, MIN_FEE);
}

/** Tasa efectiva (0-1) que termina pagando el usuario para ese monto. */
export function effectiveFeeRate(transactionAmount: number): number {
  if (transactionAmount <= 0) return 0;
  return calculateFee(transactionAmount) / transactionAmount;
}

/** Si conviene ofrecerle cotización a medida en vez del precio automático. */
export function qualifiesForCustomPricing(transactionAmount: number): boolean {
  return transactionAmount >= CUSTOM_PRICING_FROM;
}

export function calculateOrderDetails(transactionAmount: number): {
  buyerPays: number;
  appFee: number;
  sellerReceives: number;
  referenceCode: string;
} {
  if (transactionAmount <= 0) {
    throw new Error("El monto de la transacción debe ser mayor a 0");
  }

  const appFee = calculateFee(transactionAmount);

  return {
    buyerPays: transactionAmount,
    appFee,
    sellerReceives: transactionAmount - appFee,
    referenceCode: generateReferenceCode(),
  };
}
