import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireServiceRole } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Review period by sale type (in hours). ESPEJO de src/lib/escrow.ts.
const REVIEW_HOURS: Record<string, number> = {
  producto_envio: 72,
  producto_persona: 24,
  producto_digital: 24,
  servicio: 24,
};
const DEFAULT_REVIEW_HOURS = 24;

// Tipos sin paso de "marcar recibido" donde shipped_at SÍ marca la entrega real:
// el vendedor marca realizado/entregado y la tx queda en in_delivery hasta que el
// comprador confirma. Para estos el reloj corre desde shipped_at estando en
// in_delivery.
//   - producto_envio NO va aquí: su in_delivery es "en tránsito" y el reloj recién
//     parte cuando el comprador marca recibido (eso lo pasa a awaiting_buyer_review).
//   - producto_persona TAMPOCO: ahí shipped_at es cuándo se ACEPTÓ la reunión, no la
//     entrega, y el encuentro puede ser días después. Auto-liberar por ese reloj
//     pagaría antes del encuentro. Queda como confirmación manual + apelación.
const IN_DELIVERY_AUTORELEASE_TYPES = ["servicio", "producto_digital"];

// Apelaciones vivas: mientras una de estas esté puesta, la plata está en disputa y
// NO se libera sola — la resuelve resolve-appeal, no este cron.
const ACTIVE_APPEAL_STATUSES = new Set([
  "apelacion_abierta",
  "en_negociacion",
  "pendiente_intervencion_plataforma",
  "en_revision_plataforma",
]);

const SELECT_COLS =
  "id, seller_id, buyer_id, amount, commission, product_name, sale_type, initiator_role, received_at, shipped_at, updated_at, appeal_status";

serve(async (req) => {
  // Cron/server-to-server only. Reject public callers so nobody can force
  // early escrow releases by hitting the URL.
  const authFail = await requireServiceRole(req);
  if (authFail) return authFail;

  console.log("[auto-release-escrow] Starting run");

  try {
    // 1) Envío tras "marcar recibido": ventana de revisión de 72h (comportamiento
    //    original). El reloj corre desde received_at.
    const { data: reviewTxs, error: reviewErr } = await supabase
      .from("transactions")
      .select(SELECT_COLS)
      .eq("state", "awaiting_buyer_review");
    if (reviewErr) throw reviewErr;

    // 2) Servicio / en persona / digital: no tienen paso de "recibido", así que
    //    viven en in_delivery hasta que el comprador confirma. Si nunca confirma,
    //    se liberan al vencer su ventana (24h desde shipped_at). Antes esto no
    //    ocurría y la plata del vendedor quedaba atrapada indefinidamente.
    const { data: deliveryTxs, error: deliveryErr } = await supabase
      .from("transactions")
      .select(SELECT_COLS)
      .eq("state", "in_delivery")
      .in("sale_type", IN_DELIVERY_AUTORELEASE_TYPES);
    if (deliveryErr) throw deliveryErr;

    type Row = NonNullable<typeof reviewTxs>[number];
    const candidates: { tx: Row; claimState: string; startAt: string }[] = [
      ...(reviewTxs ?? []).map((tx) => ({
        tx,
        claimState: "awaiting_buyer_review",
        startAt: tx.received_at ?? tx.updated_at,
      })),
      ...(deliveryTxs ?? []).map((tx) => ({
        tx,
        claimState: "in_delivery",
        startAt: tx.shipped_at ?? tx.updated_at,
      })),
    ];

    if (candidates.length === 0) {
      console.log("[auto-release-escrow] No transactions in review period");
      return new Response(JSON.stringify({ processed: 0, released: 0 }), { status: 200 });
    }

    console.log(`[auto-release-escrow] Found ${candidates.length} candidates`);

    const now = new Date();
    let released = 0;

    for (const { tx, claimState, startAt } of candidates) {
      // Disputa viva: no la toca este cron.
      if (tx.appeal_status && ACTIVE_APPEAL_STATUSES.has(tx.appeal_status)) {
        console.log(`[auto-release-escrow] Tx ${tx.id} has active appeal (${tx.appeal_status}), skipping`);
        continue;
      }

      const reviewHours = REVIEW_HOURS[tx.sale_type] ?? DEFAULT_REVIEW_HOURS;
      const reviewDeadline = reviewHours * 60 * 60 * 1000;

      const reviewStarted = new Date(startAt);
      const elapsed = now.getTime() - reviewStarted.getTime();

      if (elapsed < reviewDeadline) {
        console.log(`[auto-release-escrow] Tx ${tx.id} still in review period (${Math.round(elapsed / 3600000)}h / ${reviewHours}h)`);
        continue;
      }

      console.log(`[auto-release-escrow] Releasing tx ${tx.id} (${tx.sale_type}, from ${claimState}, ${reviewHours}h expired)`);

      // ATOMIC CLAIM: flip state to completed only if it is still in the state we
      // found it in. This is the idempotency lock — if another run, confirm-delivery,
      // or a return/appeal transition already moved it, the update affects 0 rows and
      // we skip. Prevents double release and releasing after a state change.
      const { data: claimed } = await supabase
        .from("transactions")
        .update({ state: "completed", completed_at: new Date().toISOString() })
        .eq("id", tx.id)
        .eq("state", claimState)
        .select("id")
        .maybeSingle();

      if (!claimed) {
        console.log(`[auto-release-escrow] Tx ${tx.id} already processed, skipping`);
        continue;
      }

      // Get wallet IDs (balance math is done atomically via RPCs below).
      const { data: buyerWallet } = await supabase
        .from("wallets").select("id, blocked_balance").eq("user_id", tx.buyer_id).single();
      const { data: sellerWallet } = await supabase
        .from("wallets").select("id").eq("user_id", tx.seller_id).single();

      if (!buyerWallet || !sellerWallet) {
        console.error(`[auto-release-escrow] Wallets not found for tx ${tx.id} — reverting claim`);
        await supabase.from("transactions")
          .update({ state: claimState, completed_at: null })
          .eq("id", tx.id).eq("state", "completed");
        continue;
      }

      const amount = Number(tx.amount);
      const commission = Number(tx.commission) || 0;
      const initiatorRole = tx.initiator_role ?? "seller";

      const amountToSeller = initiatorRole === "buyer" ? amount : amount - commission;
      const escrowAmount = initiatorRole === "buyer" ? amount + commission : amount;

      const currentBuyerBlocked = Number(buyerWallet.blocked_balance ?? 0);
      if (currentBuyerBlocked < escrowAmount) {
        console.error(`[auto-release-escrow] DATA INCONSISTENCY: blocked_balance (${currentBuyerBlocked}) < escrowAmount (${escrowAmount}) for tx ${tx.id}`);
      }

      // Release buyer blocked funds atomically
      await supabase.rpc("release_blocked_balance", { p_wallet_id: buyerWallet.id, p_amount: escrowAmount });

      // Approve escrow_lock
      await supabase.from("wallet_movements")
        .update({ status: "approved" })
        .eq("transaction_id", tx.id)
        .eq("type", "escrow_lock")
        .eq("status", "pending");

      // Credit seller atomically; RPC returns the new balance for the movement record.
      const { data: newSellerBalance } = await supabase.rpc("credit_wallet_balance", {
        p_wallet_id: sellerWallet.id,
        p_delta: amountToSeller,
      });

      // Record movement
      await supabase.from("wallet_movements").insert({
        wallet_id: sellerWallet.id,
        transaction_id: tx.id,
        type: "escrow_release",
        amount: amountToSeller,
        balance_after: newSellerBalance,
        description: `Auto-liberación: "${tx.product_name}"`,
        status: "approved",
      });

      // Update profile stats
      for (const userId of [tx.seller_id, tx.buyer_id]) {
        const { data: profile } = await supabase.from("profiles").select("total_transactions").eq("id", userId).single();
        if (profile) {
          await supabase.from("profiles").update({
            total_transactions: Number(profile.total_transactions ?? 0) + 1
          }).eq("id", userId);
        }
      }

      // Notify seller
      supabase.functions.invoke("send-push-notification", {
        body: {
          userIds: [tx.seller_id],
          title: "¡Fondos liberados automáticamente!",
          body: `💸 ${tx.product_name} — el período de revisión expiró y los fondos están en tu billetera`,
          url: "/wallet",
          tag: `auto-release-${tx.id}`,
        },
      }).catch(() => {});

      released++;
      console.log(`[auto-release-escrow] Released tx ${tx.id} successfully`);
    }

    console.log(`[auto-release-escrow] Done. Released ${released}/${candidates.length}`);
    return new Response(JSON.stringify({ processed: candidates.length, released }), { status: 200 });

  } catch (error: any) {
    console.error("[auto-release-escrow] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
