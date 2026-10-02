// Acreditación de un pago de Mercado Pago en la billetera de Trado.
//
// Una sola implementación para los dos caminos que acreditan:
//   - mercadopago-webhook: cuando MP avisa.
//   - reconcile-mercadopago: cuando el aviso no llegó o falló (cuadratura).
// Antes vivía sólo en el webhook, y el 2026-10-02 un pago de $3.000 se quedó en
// MP sin acreditarse porque el aviso falló y no había nadie más que mirara.
//
// Idempotente: el movimiento lleva external_session_id = mp_<id> con índice
// único, así que acreditar dos veces el mismo pago es imposible aunque el
// webhook y la cuadratura corran a la vez.

// deno-lint-ignore-file no-explicit-any
type Supa = any;

export interface PagoMP {
  id: number | string;
  status: string;
  transaction_amount: number;
  transaction_amount_refunded?: number;
  external_reference?: string | null;
  date_created?: string;
  date_approved?: string | null;
  description?: string | null;
  transaction_details?: { net_received_amount?: number } | null;
}

export interface ReferenciaTrado {
  user_id: string;
  wallet_id: string;
  amount?: number;
}

/** La external_reference que pone create-mercadopago-payment, o null si el pago no es de Trado. */
export function referenciaTrado(pay: PagoMP): ReferenciaTrado | null {
  if (!pay.external_reference) return null;
  try {
    const r = JSON.parse(pay.external_reference);
    if (r && typeof r.user_id === "string" && typeof r.wallet_id === "string") return r;
  } catch { /* no es de Trado */ }
  return null;
}

/** Comisión que MP descontó: bruto menos lo que llegó neto. */
export function comisionMP(pay: PagoMP): number {
  const bruto = Number(pay.transaction_amount);
  const neto = Number(pay.transaction_details?.net_received_amount ?? bruto);
  return Math.max(0, Math.round((bruto - neto) * 100) / 100);
}

export type ResultadoAcreditacion =
  | { estado: "acreditado"; monto: number; saldo: number }
  | { estado: "ya_estaba" }
  | { estado: "no_aprobado"; status: string }
  | { estado: "no_es_de_trado" }
  | { estado: "error"; motivo: string; detalle?: unknown };

export async function acreditarPagoMP(supabase: Supa, pay: PagoMP, origen: string): Promise<ResultadoAcreditacion> {
  if (pay.status !== "approved") return { estado: "no_aprobado", status: pay.status };

  const ref = referenciaTrado(pay);
  if (!ref) return { estado: "no_es_de_trado" };

  const monto = Number(pay.transaction_amount);
  if (!(monto > 0)) return { estado: "error", motivo: "Monto inválido", detalle: pay.transaction_amount };

  const { data: wallet, error: walletErr } = await supabase
    .from("wallets")
    .select("id, balance, user_id")
    .eq("id", ref.wallet_id)
    .single();
  if (walletErr || !wallet) return { estado: "error", motivo: "Billetera no encontrada", detalle: ref.wallet_id };
  if (wallet.user_id !== ref.user_id) return { estado: "error", motivo: "Billetera y usuario no calzan", detalle: ref };

  const sessionId = `mp_${pay.id}`;
  const { data: mov, error: insErr } = await supabase
    .from("wallet_movements")
    .insert({
      wallet_id: ref.wallet_id,
      type: "deposit",
      amount: monto,
      balance_after: Number(wallet.balance) + monto,
      description: `Depósito Mercado Pago [${pay.id}]`,
      status: "approved",
      external_session_id: sessionId,
      external_fee: comisionMP(pay),
    })
    .select("id")
    .maybeSingle();

  if (insErr) {
    if (insErr.code === "23505") return { estado: "ya_estaba" };
    return { estado: "error", motivo: "No se pudo registrar el movimiento", detalle: insErr };
  }
  if (!mov) return { estado: "ya_estaba" };

  // Crédito atómico con marca de tarjeta: esta plata ya nos costó la comisión
  // de MP, así que al financiar una sala paga tarifa de tarjeta.
  const { error: credErr } = await supabase.rpc("credit_wallet_balance_with_origin", {
    p_wallet_id: ref.wallet_id,
    p_delta: monto,
    p_from_gateway: true,
  });
  if (credErr) {
    await supabase.from("wallet_movements").delete().eq("id", mov.id);
    return { estado: "error", motivo: "No se pudo sumar el saldo", detalle: credErr };
  }

  console.log(`[${origen}] Pago MP ${pay.id} acreditado: wallet=${ref.wallet_id} monto=${monto}`);
  return { estado: "acreditado", monto, saldo: Number(wallet.balance) + monto };
}
