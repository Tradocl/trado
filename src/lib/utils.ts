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
 * Calcula los detalles de una orden con comisión dinámica
 * 
 * Lógica de Negocio:
 * 1. Tasa Base: 5% del valor de la transacción
 * 2. Redondeo: Al múltiplo de 10 más cercano (sin decimales)
 * 3. Suelo: Comisión mínima de $1.000 CLP
 * 4. Techo: Comisión máxima de $20.000 CLP
 * 
 * @param transactionAmount - Precio del producto en CLP (sin decimales)
 * @returns Objeto con desglose financiero y código de referencia
 */
/**
 * Formatea un monto en CLP con separadores de miles y sin decimales
 * 
 * @param amount - Monto en CLP
 * @returns String formateado (ej: 12.500 para 12500)
 */
export function formatCLP(amount: number): string {
  return Math.round(amount).toLocaleString('es-CL');
}

export function calculateOrderDetails(transactionAmount: number): {
  buyerPays: number;
  appFee: number;
  sellerReceives: number;
  referenceCode: string;
} {
  // Validación básica
  if (transactionAmount <= 0) {
    throw new Error("El monto de la transacción debe ser mayor a 0");
  }

  // 1. Calcular 5% base
  const baseFee = transactionAmount * 0.05;

  // 2. Redondear al múltiplo de 10 más cercano
  const roundedFee = Math.round(baseFee / 10) * 10;

  // 3. Aplicar suelo (mínimo $1.000 CLP)
  const feeWithFloor = Math.max(roundedFee, 1000);

  // 4. Aplicar techo (máximo $20.000 CLP)
  const appFee = Math.min(feeWithFloor, 20000);

  // 5. Calcular lo que recibe el vendedor
  const sellerReceives = transactionAmount - appFee;

  // 6. Generar código de referencia único
  const referenceCode = generateReferenceCode();

  return {
    buyerPays: transactionAmount,
    appFee,
    sellerReceives,
    referenceCode,
  };
}
