/**
 * Reglas del escrow: plazos de revisión y transiciones de estado permitidas.
 *
 * ⚠️ ESPEJO de dos lugares que son la autoridad real:
 *   - REVIEW_HOURS  -> supabase/functions/auto-release-escrow/index.ts
 *   - TRANSICIONES  -> trigger prevent_transaction_financial_tampering en la BD
 *
 * Existe para que el texto que ve el usuario —el FAQ y sobre todo los Términos
 * y Condiciones, que es un documento legal— no pueda contradecir al código en
 * silencio. Antes los plazos estaban escritos a mano en tres lugares distintos.
 *
 * Si cambias un plazo acá, cámbialo también en la Edge Function, y viceversa.
 * Los tests de escrow.test.ts fijan estos valores.
 */

export type SaleType = "producto_envio" | "producto_persona" | "producto_digital" | "servicio";

export type TransactionState =
  | "created"
  | "invited"
  | "awaiting_deposit"
  | "funds_secured"
  | "in_delivery"
  | "awaiting_buyer_review"
  | "return_requested"
  | "return_in_progress"
  | "in_dispute"
  | "completed"
  | "cancelled";

/**
 * Horas que tiene el comprador para revisar antes de que el pago se libere
 * solo al vendedor. El reloj parte cuando se marca la entrega.
 */
export const REVIEW_HOURS: Record<SaleType, number> = {
  producto_envio: 72,
  producto_persona: 24,
  producto_digital: 24,
  servicio: 24,
};

export const DEFAULT_REVIEW_HOURS = 24;

/** Horas de negociación directa en una disputa antes de que medie un admin. */
export const APPEAL_NEGOTIATION_HOURS = 48;

/** Horas sin movimiento tras las que una sala sin comprador se cancela sola. */
export const STALE_TRANSACTION_HOURS = 72;

export function reviewHoursFor(saleType: string | null | undefined): number {
  return REVIEW_HOURS[saleType as SaleType] ?? DEFAULT_REVIEW_HOURS;
}

/** Texto listo para mostrar, para que el FAQ y los Términos no lo escriban a mano. */
export function reviewPeriodLabel(saleType: SaleType): string {
  const h = REVIEW_HOURS[saleType];
  return `${h} horas`;
}

/**
 * Transiciones que un COMPRADOR o VENDEDOR puede hacer por su cuenta.
 *
 * Todo lo demás exige service_role o admin: liberar fondos, cancelar con plata
 * adentro, resolver disputas. La autoridad real es el trigger
 * prevent_transaction_financial_tampering; esto lo espeja para poder razonarlo
 * y probarlo del lado del cliente.
 */
export const TRANSICIONES_DE_USUARIO: Record<string, TransactionState[]> = {
  created: ["invited", "cancelled"],
  funds_secured: ["in_delivery", "awaiting_buyer_review", "completed", "in_dispute"],
  in_delivery: ["awaiting_buyer_review", "completed", "return_requested", "in_dispute"],
  awaiting_buyer_review: ["completed", "return_requested", "in_dispute"],
  return_requested: ["return_in_progress", "in_dispute"],
};

/** Estados donde hay plata de un tercero retenida por Trado. */
export const ESTADOS_CON_ESCROW: TransactionState[] = [
  "funds_secured",
  "in_delivery",
  "awaiting_buyer_review",
  "return_in_progress",
];

export function tieneEscrowVivo(state: string): boolean {
  return ESTADOS_CON_ESCROW.includes(state as TransactionState);
}

/** Estados terminales: la sala ya no se mueve más. */
export const ESTADOS_FINALES: TransactionState[] = ["completed", "cancelled"];

export function esEstadoFinal(state: string): boolean {
  return ESTADOS_FINALES.includes(state as TransactionState);
}
