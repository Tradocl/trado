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

      // Idempotency: check if this session was already processed
      const { data: existing } = await supabase
        .from("wallet_movements")
        .select("id")
        .eq("description", `Depósito Fintoc [${sessionId}]`)
        .maybeSingle();

      if (existing) {
        console.log("[fintoc-webhook] Already processed session:", sessionId);
        return new Response("Already processed", { status: 200 });
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

      const newBalance = Number(wallet.balance) + depositAmount;

      const { error: walletUpdateErr } = await supabase
        .from("wallets")
        .update({ balance: newBalance })
        .eq("id", wallet_id);

      if (walletUpdateErr) {
        console.error("[fintoc-webhook] Error updating wallet:", walletUpdateErr);
        return new Response("Error updating wallet", { status: 500 });
      }

      const { error: movErr } = await supabase
        .from("wallet_movements")
        .insert({
          wallet_id,
          type: "deposit",
          amount: depositAmount,
          balance_after: newBalance,
          description: `Depósito Fintoc [${sessionId}]`,
          status: "approved",
        });

      if (movErr) {
        console.error("[fintoc-webhook] Error creating movement:", movErr);
        return new Response("Error creating movement", { status: 500 });
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
