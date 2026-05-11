import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FINTOC_SECRET_KEY = Deno.env.get("FINTOC_SECRET_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const event = await req.json();
    console.log("[fintoc-webhook] Event:", event.type, JSON.stringify(event).slice(0, 400));

    if (event.type === "payment_intent.succeeded") {
      const sessionId = event.data?.id ?? event.id;
      if (!sessionId) {
        console.error("[fintoc-webhook] Missing event id");
        return new Response("Missing event id", { status: 400 });
      }

      // Re-fetch the payment_intent from Fintoc to verify the webhook is legit.
      // Without this, anyone who can POST to this URL could credit any wallet.
      const piResponse = await fetch(`https://api.fintoc.com/v2/payment_intents/${sessionId}`, {
        headers: { "Authorization": FINTOC_SECRET_KEY },
      });

      if (!piResponse.ok) {
        console.error("[fintoc-webhook] Could not verify payment_intent:", sessionId, piResponse.status);
        return new Response("Unauthorized", { status: 401 });
      }

      const pi = await piResponse.json();
      if (pi.status !== "succeeded") {
        console.error("[fintoc-webhook] Payment not succeeded:", pi.status);
        return new Response("Payment not succeeded", { status: 400 });
      }

      const metadata = pi.metadata ?? {};
      const { user_id, wallet_id } = metadata;
      const depositAmount = Number(pi.amount);

      if (!user_id || !wallet_id || !depositAmount) {
        console.error("[fintoc-webhook] Missing required metadata:", metadata);
        return new Response("Missing metadata", { status: 400 });
      }

      // Verify wallet belongs to the claimed user
      const { data: wallet, error: walletErr } = await supabase
        .from("wallets")
        .select("id, balance, user_id")
        .eq("id", wallet_id)
        .single();

      if (walletErr || !wallet) {
        console.error("[fintoc-webhook] Wallet not found:", wallet_id);
        return new Response("Wallet not found", { status: 404 });
      }

      if (wallet.user_id !== user_id) {
        console.error("[fintoc-webhook] Wallet/user mismatch:", wallet_id, user_id);
        return new Response("Metadata mismatch", { status: 400 });
      }

      // True idempotency: try to INSERT the movement first using a unique
      // session_id column. If the row already exists (concurrent webhook retry),
      // skip the wallet update entirely.
      const { data: insertedMov, error: movInsertErr } = await supabase
        .from("wallet_movements")
        .insert({
          wallet_id,
          type: "deposit",
          amount: depositAmount,
          balance_after: Number(wallet.balance) + depositAmount,
          description: `Depósito Fintoc [${sessionId}]`,
          status: "approved",
          external_session_id: sessionId,
        })
        .select("id")
        .maybeSingle();

      if (movInsertErr) {
        // Postgres unique violation = 23505. If this happens, another webhook
        // already inserted for this session — do nothing.
        if ((movInsertErr as any).code === "23505") {
          console.log("[fintoc-webhook] Already processed session (race caught by DB):", sessionId);
          return new Response("Already processed", { status: 200 });
        }
        console.error("[fintoc-webhook] Error creating movement:", movInsertErr);
        return new Response("Error creating movement", { status: 500 });
      }

      if (!insertedMov) {
        console.log("[fintoc-webhook] Insert returned no row (likely concurrent):", sessionId);
        return new Response("Already processed", { status: 200 });
      }

      const newBalance = Number(wallet.balance) + depositAmount;
      const { error: walletUpdateErr } = await supabase
        .from("wallets")
        .update({ balance: newBalance })
        .eq("id", wallet_id);

      if (walletUpdateErr) {
        console.error("[fintoc-webhook] Error updating wallet:", walletUpdateErr);
        // Critical: balance update failed AFTER movement was inserted.
        // Roll back the movement insert to avoid an orphaned approved deposit.
        await supabase.from("wallet_movements").delete().eq("id", insertedMov.id);
        return new Response("Error updating wallet", { status: 500 });
      }

      console.log(`[fintoc-webhook] Deposit confirmed: user=${user_id}, amount=${depositAmount}, new_balance=${newBalance}`);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error: any) {
    console.error("[fintoc-webhook] Unexpected error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
