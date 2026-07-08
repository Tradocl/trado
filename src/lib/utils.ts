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

// Max transaction amount. Above this, user must contact support for custom pricing.
export const MAX_TRANSACTION_AMOUNT = 2_000_000;

export function calculateOrderDetails(transactionAmount: number): {
  buyerPays: number;
  appFee: number;
  sellerReceives: number;
  referenceCode: string;
} {
  if (transactionAmount <= 0) {
    throw new Error("El monto de la transacción debe ser mayor a 0");
  }

  // Tiered commission:
  // - Up to $400k: 5%, min $1.000, max $20.000
  // - Above $400k: $20.000 + 4% of amount over $400k (covers MP's 3.19% processing fee)
  let appFee: number;
  const TIER_THRESHOLD = 400_000;
  const BASE_CAP = 20_000;

  if (transactionAmount <= TIER_THRESHOLD) {
    const baseFee = transactionAmount * 0.05;
    const roundedFee = Math.round(baseFee / 10) * 10;
    appFee = Math.min(Math.max(roundedFee, 1000), BASE_CAP);
  } else {
    const excess = transactionAmount - TIER_THRESHOLD;
    const rawFee = BASE_CAP + excess * 0.04;
    appFee = Math.round(rawFee / 10) * 10;
  }

  const sellerReceives = transactionAmount - appFee;
  const referenceCode = generateReferenceCode();

  return {
    buyerPays: transactionAmount,
    appFee,
    sellerReceives,
    referenceCode,
  };
}
