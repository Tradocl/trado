import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  // Fintoc sends POST with JSON body
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const event = await req.json();
    console.log("[fintoc-webhook] Event received:", event.type, JSON.stringify(event).slice(0, 300));

    if (event.type === "payment_intent.succeeded") {
      const metadata = event.data?.metadata ?? event.metadata ?? {};
      const { movement_id, user_id, wallet_id } = metadata;

      if (!movement_id || !user_id || !wallet_id) {
        console.error("[fintoc-webhook] Missing metadata fields:", metadata);
        return new Response("Missing metadata", { status: 400 });
      }

      // Get the pending movement
      const { data: movement, error: movErr } = await supabase
        .from("wallet_movements")
        .select("id, amount, status, wallet_id")
        .eq("id", movement_id)
        .single();

      if (movErr || !movement) {
        console.error("[fintoc-webhook] Movement not found:", movement_id, movErr);
        return new Response("Movement not found", { status: 404 });
      }

      // Idempotency check: don't process already approved movements
      if (movement.status === "approved") {
        console.log("[fintoc-webhook] Movement already approved, skipping:", movement_id);
        return new Response("Already processed", { status: 200 });
      }

      // Get current wallet balance
      const { data: wallet, error: walletErr } = await supabase
        .from("wallets")
        .select("id, balance")
        .eq("id", wallet_id)
        .single();

      if (walletErr || !wallet) {
        console.error("[fintoc-webhook] Wallet not found:", wallet_id, walletErr);
        return new Response("Wallet not found", { status: 404 });
      }

      const depositAmount = Number(movement.amount);
      const newBalance = Number(wallet.balance) + depositAmount;

      // Update wallet balance
      const { error: walletUpdateErr } = await supabase
        .from("wallets")
        .update({ balance: newBalance })
        .eq("id", wallet_id);

      if (walletUpdateErr) {
        console.error("[fintoc-webhook] Error updating wallet:", walletUpdateErr);
        return new Response("Error updating wallet", { status: 500 });
      }

      // Approve the movement and set correct balance_after
      const { error: movUpdateErr } = await supabase
        .from("wallet_movements")
        .update({
          status: "approved",
          balance_after: newBalance,
        })
        .eq("id", movement_id);

      if (movUpdateErr) {
        console.error("[fintoc-webhook] Error approving movement:", movUpdateErr);
        return new Response("Error approving movement", { status: 500 });
      }

      console.log(`[fintoc-webhook] ✅ Deposit approved: user=${user_id}, amount=${depositAmount}, new_balance=${newBalance}`);

      // Optionally notify the user
      try {
        await supabase.functions.invoke("notify-wallet-movement", {
          body: { movementId: movement_id },
        });
      } catch (notifyErr) {
        console.error("[fintoc-webhook] Notification error (non-fatal):", notifyErr);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (event.type === "payment_intent.failed") {
      const metadata = event.data?.metadata ?? event.metadata ?? {};
      const { movement_id } = metadata;

      if (movement_id) {
        await supabase
          .from("wallet_movements")
          .update({ status: "rejected" })
          .eq("id", movement_id);

        console.log(`[fintoc-webhook] Payment failed, movement rejected: ${movement_id}`);
      }

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    // Unknown event type — acknowledge to avoid retries
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error: any) {
    console.error("[fintoc-webhook] Unexpected error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
