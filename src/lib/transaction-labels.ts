/**
 * Friendly labels for transaction states. Database values are unchanged —
 * this only affects how states are displayed to users.
 */
export type StateColor = "neutral" | "info" | "warning" | "success" | "destructive";

const COLOR_CLASSES: Record<StateColor, string> = {
  neutral: "bg-secondary text-secondary-foreground",
  info: "bg-info text-info-foreground",
  warning: "bg-warning text-warning-foreground",
  success: "bg-success text-success-foreground",
  destructive: "bg-destructive text-destructive-foreground",
};

const STATE_MAP: Record<string, { label: string; color: StateColor }> = {
  created: { label: "Esperando que se unan", color: "neutral" },
  invited: { label: "Lista para depositar", color: "info" },
  awaiting_deposit: { label: "Esperando pago", color: "warning" },
  funds_secured: { label: "Pago retenido en escrow", color: "success" },
  in_delivery: { label: "En entrega", color: "info" },
  awaiting_buyer_review: { label: "Esperando confirmación del comprador", color: "warning" },
  completed: { label: "Completada", color: "success" },
  cancelled: { label: "Cancelada", color: "destructive" },
  in_dispute: { label: "En disputa", color: "destructive" },
  return_requested: { label: "Devolución solicitada", color: "warning" },
  return_in_progress: { label: "Devolución en proceso", color: "warning" },
  refunded: { label: "Reembolsada", color: "neutral" },
  resolved: { label: "Resuelta", color: "success" },
};

export function getStateLabel(state: string): { label: string; color: string } {
  const entry = STATE_MAP[state];
  if (!entry) {
    return { label: state, color: COLOR_CLASSES.neutral };
  }
  return { label: entry.label, color: COLOR_CLASSES[entry.color] };
}
