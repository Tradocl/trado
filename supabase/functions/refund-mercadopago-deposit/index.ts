import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    // AuthN: caller must be authenticated and admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const movementId = body?.movement_id as string | undefined;
    if (!movementId) return json({ error: "movement_id required" }, 400);

    // Load movement
    const { data: mov, error: movErr } = await supabase
      .from("wallet_movements")
      .select("id, wallet_id, type, amount, status, description, external_session_id, refunded_at")
      .eq("id", movementId)
      .maybeSingle();

    if (movErr || !mov) return json({ error: "Movement not found" }, 404);
    if (mov.type !== "deposit") return json({ error: "Movement is not a deposit" }, 400);
    if (mov.status !== "approved") return json({ error: "Only approved deposits can be refunded" }, 400);
    if (mov.refunded_at) return json({ error: "Deposit already refunded" }, 400);

    const sessionId = mov.external_session_id ?? "";
    const paymentId = sessionId.startsWith("mp_") ? sessionId.slice(3) : null;
    if (!paymentId) return json({ error: "Not a Mercado Pago deposit" }, 400);

    const amount = Number(mov.amount);

    // Load wallet to ensure sufficient balance
    const { data: wallet, error: wErr } = await supabase
      .from("wallets")
      .select("id, balance, user_id")
      .eq("id", mov.wallet_id)
      .single();
    if (wErr || !wallet) return json({ error: "Wallet not found" }, 404);

    if (Number(wallet.balance) < amount) {
      return json({ error: "Saldo insuficiente para reembolsar" }, 400);
    }

    // Call Mercado Pago refunds API
    const mpResp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `refund_${movementId}`,
      },
      body: JSON.stringify({ amount }),
    });

    const mpBody = await mpResp.json().catch(() => ({}));
    if (!mpResp.ok) {
      console.error("[refund-mercadopago-deposit] MP refund failed:", mpResp.status, mpBody);
      return json({ error: "Mercado Pago rechazó el reembolso", details: mpBody }, 502);
    }

    // Debit wallet and record refund movement
    const newBalance = Number(wallet.balance) - amount;

    const { data: refundMov, error: insErr } = await supabase
      .from("wallet_movements")
      .insert({
        wallet_id: mov.wallet_id,
        type: "refund",
        amount: -amount,
        balance_after: newBalance,
        description: `Reembolso Mercado Pago [${paymentId}]`,
        status: "approved",
        external_session_id: `mp_refund_${paymentId}`,
      })
      .select("id")
      .maybeSingle();

    if (insErr) {
      console.error("[refund-mercadopago-deposit] Insert refund movement failed:", insErr);
      return json({ error: "Error registrando movimiento de reembolso" }, 500);
    }

    const { error: updWalletErr } = await supabase
      .from("wallets")
      .update({ balance: newBalance })
      .eq("id", mov.wallet_id);

    if (updWalletErr) {
      console.error("[refund-mercadopago-deposit] Wallet update failed:", updWalletErr);
      if (refundMov) await supabase.from("wallet_movements").delete().eq("id", refundMov.id);
      return json({ error: "Error actualizando wallet" }, 500);
    }

    const { error: markErr } = await supabase
      .from("wallet_movements")
      .update({ refunded_at: new Date().toISOString() })
      .eq("id", movementId);

    if (markErr) {
      console.error("[refund-mercadopago-deposit] Mark refunded_at failed:", markErr);
    }

    return json({
      success: true,
      refund_id: mpBody?.id,
      refund_movement_id: refundMov?.id,
      new_balance: newBalance,
    });
  } catch (err: any) {
    console.error("[refund-mercadopago-deposit] Unexpected:", err);
    return json({ error: err?.message ?? "Unexpected error" }, 500);
  }
});
