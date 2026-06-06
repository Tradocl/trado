import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")!;
const MP_WEBHOOK_SECRET = Deno.env.get("MP_WEBHOOK_SECRET")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Verify Mercado Pago webhook signature per
// https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks#signature-validation
async function verifyMPSignature(req: Request, dataId: string): Promise<boolean> {
  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");
  if (!xSignature || !xRequestId) return false;

  const parts = Object.fromEntries(
    xSignature.split(",").map((p) => p.split("=").map((s) => s.trim()))
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(MP_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return computed === v1;
}

serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const event = await req.json();
    console.log("[mercadopago-webhook] Event:", event.type, JSON.stringify(event).slice(0, 400));

    // MP fires type="payment" for payment events; ignore non-payment topics
    const isPayment = event.type === "payment" || (event.action ?? "").startsWith("payment.");
    if (!isPayment) {
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    const paymentId = event.data?.id ?? event.id;
    if (!paymentId) {
      return new Response("Missing payment id", { status: 400 });
    }

    // Verify HMAC signature before doing any work
    const signatureValid = await verifyMPSignature(req, String(paymentId));
    if (!signatureValid) {
      console.error("[mercadopago-webhook] Invalid signature");
      return new Response("Invalid signature", { status: 401 });
    }

    // Re-fetch the payment from MP to verify authenticity and current status
    const payResp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { "Authorization": `Bearer ${MP_ACCESS_TOKEN}` },
    });

    if (!payResp.ok) {
      console.error("[mercadopago-webhook] Could not fetch payment:", paymentId, payResp.status);
      return new Response("Unauthorized", { status: 401 });
    }

    const pay = await payResp.json();
    if (pay.status !== "approved") {
      console.log(`[mercadopago-webhook] Payment ${paymentId} status=${pay.status}, skipping`);
      return new Response(JSON.stringify({ received: true, skipped: pay.status }), { status: 200 });
    }

    // Parse external_reference set in create-mercadopago-payment
    let metadata: any;
    try {
      metadata = JSON.parse(pay.external_reference);
    } catch {
      console.error("[mercadopago-webhook] Bad external_reference:", pay.external_reference);
      return new Response("Bad metadata", { status: 400 });
    }

    const { user_id, wallet_id } = metadata;
    const depositAmount = Number(pay.transaction_amount);

    // MP deducts a processor fee before the money reaches the Trado account.
    // Wallet is credited the gross amount; record the fee for accounting.
    const netReceived = Number(pay.transaction_details?.net_received_amount ?? depositAmount);
    const mpFee = Math.max(0, Math.round((depositAmount - netReceived) * 100) / 100);

    if (!user_id || !wallet_id || !depositAmount) {
      console.error("[mercadopago-webhook] Missing metadata:", metadata);
      return new Response("Missing metadata", { status: 400 });
    }

    // Confirm wallet/user match (anti-spoofing)
    const { data: wallet, error: walletErr } = await supabase
      .from("wallets")
      .select("id, balance, user_id")
      .eq("id", wallet_id)
      .single();

    if (walletErr || !wallet) {
      console.error("[mercadopago-webhook] Wallet not found:", wallet_id);
      return new Response("Wallet not found", { status: 404 });
    }

    if (wallet.user_id !== user_id) {
      console.error("[mercadopago-webhook] Wallet/user mismatch:", wallet_id, user_id);
      return new Response("Metadata mismatch", { status: 400 });
    }

    // Idempotency via UNIQUE index on external_session_id (added in 20260511010000_audit_fixes)
    const sessionId = `mp_${paymentId}`;
    const newBalance = Number(wallet.balance) + depositAmount;

    const { data: insertedMov, error: movInsertErr } = await supabase
      .from("wallet_movements")
      .insert({
        wallet_id,
        type: "deposit",
        amount: depositAmount,
        balance_after: newBalance,
        description: `Depósito Mercado Pago [${paymentId}]`,
        status: "approved",
        external_session_id: sessionId,
        external_fee: mpFee,
      })
      .select("id")
      .maybeSingle();

    if (movInsertErr) {
      if ((movInsertErr as any).code === "23505") {
        console.log("[mercadopago-webhook] Already processed (DB race caught):", paymentId);
        return new Response("Already processed", { status: 200 });
      }
      console.error("[mercadopago-webhook] Insert error:", movInsertErr);
      return new Response("Error creating movement", { status: 500 });
    }

    if (!insertedMov) {
      console.log("[mercadopago-webhook] Insert returned no row (concurrent):", paymentId);
      return new Response("Already processed", { status: 200 });
    }

    const { error: walletUpdateErr } = await supabase
      .from("wallets")
      .update({ balance: newBalance })
      .eq("id", wallet_id);

    if (walletUpdateErr) {
      console.error("[mercadopago-webhook] Wallet update failed, rolling back movement:", walletUpdateErr);
      await supabase.from("wallet_movements").delete().eq("id", insertedMov.id);
      return new Response("Error updating wallet", { status: 500 });
    }

    console.log(`[mercadopago-webhook] Deposit confirmed: user=${user_id}, amount=${depositAmount}, new_balance=${newBalance}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[mercadopago-webhook] Unexpected error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
