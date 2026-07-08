import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireServiceRole } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Review period by sale type (in hours)
const REVIEW_HOURS: Record<string, number> = {
  producto_envio: 72,
  producto_persona: 24,
  servicio: 24,
};
const DEFAULT_REVIEW_HOURS = 24;

serve(async (req) => {
  // Cron/server-to-server only. Reject public callers so nobody can force
  // early escrow releases by hitting the URL.
  const authFail = await requireServiceRole(req);
  if (authFail) return authFail;

  console.log("[auto-release-escrow] Starting run");

  try {
    // Find all transactions in awaiting_buyer_review
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("id, seller_id, buyer_id, amount, commission, product_name, sale_type, initiator_role, received_at, shipped_at, updated_at")
      .eq("state", "awaiting_buyer_review");

    if (txError) throw txError;
    if (!transactions || transactions.length === 0) {
      console.log("[auto-release-escrow] No transactions in review period");
      return new Response(JSON.stringify({ processed: 0 }), { status: 200 });
    }

    console.log(`[auto-release-escrow] Found ${transactions.length} transactions in review`);

    const now = new Date();
    let released = 0;

    for (const tx of transactions) {
      const reviewHours = REVIEW_HOURS[tx.sale_type] ?? DEFAULT_REVIEW_HOURS;
      const reviewDeadline = reviewHours * 60 * 60 * 1000;

      // Use received_at if available, otherwise updated_at as fallback
      const reviewStarted = new Date(tx.received_at ?? tx.updated_at);
      const elapsed = now.getTime() - reviewStarted.getTime();

      if (elapsed < reviewDeadline) {
        console.log(`[auto-release-escrow] Tx ${tx.id} still in review period (${Math.round(elapsed / 3600000)}h / ${reviewHours}h)`);
        continue;
      }

      console.log(`[auto-release-escrow] Releasing tx ${tx.id} (${tx.sale_type}, ${reviewHours}h expired)`);

      // ATOMIC CLAIM: flip state to completed only if it is still awaiting review.
      // This is the idempotency lock — if another run (or confirm-delivery) already
      // processed this tx, the update affects 0 rows and we skip. Prevents double release.
      const { data: claimed } = await supabase
        .from("transactions")
        .update({ state: "completed", completed_at: new Date().toISOString() })
        .eq("id", tx.id)
        .eq("state", "awaiting_buyer_review")
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
          .update({ state: "awaiting_buyer_review", completed_at: null })
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

    console.log(`[auto-release-escrow] Done. Released ${released}/${transactions.length}`);
    return new Response(JSON.stringify({ processed: transactions.length, released }), { status: 200 });

  } catch (error: any) {
    console.error("[auto-release-escrow] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
