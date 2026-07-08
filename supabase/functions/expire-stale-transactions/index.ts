import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireServiceRole } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const EXPIRY_HOURS = 72;

serve(async (req) => {
  // Cron/server-to-server only.
  const authFail = await requireServiceRole(req);
  if (authFail) return authFail;

  console.log("[expire-stale-transactions] Starting run");

  try {
    const cutoff = new Date(Date.now() - EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

    // Find stale transactions: created or invited, no movement in 72h
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("id, seller_id, buyer_id, product_name, state, updated_at")
      .in("state", ["created", "invited"])
      .lt("updated_at", cutoff);

    if (error) throw error;
    if (!transactions || transactions.length === 0) {
      console.log("[expire-stale-transactions] No stale transactions found");
      return new Response(JSON.stringify({ cancelled: 0 }), { status: 200 });
    }

    console.log(`[expire-stale-transactions] Found ${transactions.length} stale transactions`);

    let cancelled = 0;
    let skipped = 0;

    for (const tx of transactions) {
      // Safety: skip if any escrow funds are locked for this transaction.
      // Cancelling here would orphan the buyer's blocked balance.
      const { data: lockedMovs } = await supabase
        .from("wallet_movements")
        .select("id")
        .eq("transaction_id", tx.id)
        .eq("type", "escrow_lock")
        .in("status", ["pending", "approved"])
        .limit(1);

      if (lockedMovs && lockedMovs.length > 0) {
        console.warn(`[expire-stale-transactions] Skipping tx ${tx.id} — escrow already locked`);
        skipped++;
        continue;
      }

      const { error: updateError } = await supabase
        .from("transactions")
        .update({ state: "cancelled" })
        .eq("id", tx.id);

      if (updateError) {
        console.error(`[expire-stale-transactions] Error cancelling tx ${tx.id}:`, updateError);
        continue;
      }

      // Notify seller
      supabase.functions.invoke("send-push-notification", {
        body: {
          userIds: [tx.seller_id],
          title: "Sala expirada",
          body: `⏰ "${tx.product_name}" fue cancelada por inactividad`,
          url: `/transaction/${tx.id}`,
          tag: `expire-${tx.id}`,
        },
      }).catch(() => {});

      // Notify buyer if joined
      if (tx.buyer_id) {
        supabase.functions.invoke("send-push-notification", {
          body: {
            userIds: [tx.buyer_id],
            title: "Sala expirada",
            body: `⏰ "${tx.product_name}" fue cancelada por inactividad`,
            url: `/transaction/${tx.id}`,
            tag: `expire-buyer-${tx.id}`,
          },
        }).catch(() => {});
      }

      cancelled++;
      console.log(`[expire-stale-transactions] Cancelled tx ${tx.id} (state: ${tx.state})`);
    }

    console.log(`[expire-stale-transactions] Done. Cancelled ${cancelled}, skipped ${skipped} of ${transactions.length}`);
    return new Response(JSON.stringify({ cancelled, skipped }), { status: 200 });

  } catch (error: any) {
    console.error("[expire-stale-transactions] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
