import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const event = await req.json();
    console.log("[fintoc-webhook] Event:", event.type, JSON.stringify(event).slice(0, 400));

    if (event.type === "payment_intent.succeeded") {
      const metadata = event.data?.metadata ?? event.metadata ?? {};
      const { user_id, wallet_id, amount } = metadata;

      if (!user_id || !wallet_id || !amount) {
        console.error("[fintoc-webhook] Missing metadata:", metadata);
        return new Response("Missing metadata", { status: 400 });
      }

      const depositAmount = Number(amount);
      const sessionId = event.data?.id ?? event.id ?? "unknown";

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

      // Get current wallet balance
      const { data: wallet, error: walletErr } = await supabase
        .from("wallets")
        .select("id, balance")
        .eq("id", wallet_id)
        .single();

      if (walletErr || !wallet) {
        console.error("[fintoc-webhook] Wallet not found:", wallet_id);
        return new Response("Wallet not found", { status: 404 });
      }

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

      // Create approved movement — only now that payment is confirmed
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

      console.log(`[fintoc-webhook] ✅ Deposit confirmed: user=${user_id}, amount=${depositAmount}, new_balance=${newBalance}`);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Other events — acknowledge to avoid retries
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error: any) {
    console.error("[fintoc-webhook] Unexpected error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
