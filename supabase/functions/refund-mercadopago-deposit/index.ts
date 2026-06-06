import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REFUND_WINDOW_DAYS = 90;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: corsHeaders });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401, headers: corsHeaders });
    }

    // Rate limit: max 3 refund attempts per minute per user
    const { data: allowed, error: rlError } = await supabase.rpc("check_rate_limit", {
      _identifier: user.id,
      _action: "refund_deposit",
      _max_per_minute: 3,
    });
    if (rlError) {
      console.error("[refund-mercadopago-deposit] Rate limit check failed:", rlError);
    } else if (allowed === false) {
      return new Response(
        JSON.stringify({ error: "Demasiados intentos. Espera un minuto e intenta de nuevo." }),
        { status: 429, headers: corsHeaders }
      );
    }

    const { movementId } = await req.json();
    if (!movementId) {
      return new Response(JSON.stringify({ error: "Falta movementId" }), { status: 400, headers: corsHeaders });
    }

    // Load the deposit movement together with its wallet (ownership check)
    const { data: movement, error: movErr } = await supabase
      .from("wallet_movements")
      .select("id, wallet_id, type, amount, status, external_session_id, refunded_at, created_at, wallets!inner(id, user_id, balance)")
      .eq("id", movementId)
      .single();

    if (movErr || !movement) {
      return new Response(JSON.stringify({ error: "Depósito no encontrado" }), { status: 404, headers: corsHeaders });
    }

    const wallet: any = movement.wallets;
    if (!wallet || wallet.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403, headers: corsHeaders });
    }

    if (movement.type !== "deposit" || movement.status !== "approved") {
      return new Response(JSON.stringify({ error: "Solo se pueden reembolsar depósitos acreditados" }), { status: 400, headers: corsHeaders });
    }

    if (movement.refunded_at) {
      return new Response(JSON.stringify({ error: "Este depósito ya fue reembolsado" }), { status: 409, headers: corsHeaders });
    }

    const sessionId: string = movement.external_session_id ?? "";
    if (!sessionId.startsWith("mp_")) {
      return new Response(JSON.stringify({ error: "Este depósito no se puede reembolsar por Mercado Pago" }), { status: 400, headers: corsHeaders });
    }
    const paymentId = sessionId.slice(3);

    // Refund window
    const createdAt = new Date(movement.created_at).getTime();
    const ageDays = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
    if (ageDays > REFUND_WINDOW_DAYS) {
      return new Response(
        JSON.stringify({ error: `El reembolso solo está disponible dentro de ${REFUND_WINDOW_DAYS} días del depósito` }),
        { status: 400, headers: corsHeaders }
      );
    }

    const amount = Number(movement.amount);
    const currentBalance = Number(wallet.balance);
    if (currentBalance < amount) {
      return new Response(
        JSON.stringify({ error: "Saldo insuficiente para reembolsar (parte de este depósito ya fue usado)" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Issue a TOTAL refund on the original MP payment. Empty body = total refund.
    // Idempotency key prevents double refunds on retries.
    const refundResp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `refund_${paymentId}`,
      },
      body: "{}",
    });

    if (!refundResp.ok) {
      const errBody = await refundResp.text();
      console.error("[refund-mercadopago-deposit] MP refund failed:", paymentId, refundResp.status, errBody);
      return new Response(JSON.stringify({ error: "Mercado Pago rechazó el reembolso" }), { status: 502, headers: corsHeaders });
    }

    // MP refund succeeded. Debit the wallet idempotently.
    const refundSessionId = `mprefund_${paymentId}`;
    const newBalance = currentBalance - amount;

    const { data: insertedMov, error: refundInsertErr } = await supabase
      .from("wallet_movements")
      .insert({
        wallet_id: movement.wallet_id,
        type: "refund",
        amount,
        balance_after: newBalance,
        description: `Reembolso depósito Mercado Pago [${paymentId}]`,
        status: "approved",
        external_session_id: refundSessionId,
      })
      .select("id")
      .maybeSingle();

    if (refundInsertErr) {
      if ((refundInsertErr as any).code === "23505") {
        // Already processed (concurrent/retried) — MP refund is idempotent too.
        return new Response(JSON.stringify({ success: true, alreadyProcessed: true }), { status: 200, headers: corsHeaders });
      }
      console.error("[refund-mercadopago-deposit] Refund movement insert error:", refundInsertErr);
      return new Response(JSON.stringify({ error: "Error registrando el reembolso" }), { status: 500, headers: corsHeaders });
    }

    // Debit wallet balance
    const { error: walletUpdateErr } = await supabase
      .from("wallets")
      .update({ balance: newBalance })
      .eq("id", movement.wallet_id);

    if (walletUpdateErr) {
      console.error("[refund-mercadopago-deposit] Wallet update failed, rolling back:", walletUpdateErr);
      if (insertedMov) await supabase.from("wallet_movements").delete().eq("id", insertedMov.id);
      return new Response(JSON.stringify({ error: "Error actualizando el saldo" }), { status: 500, headers: corsHeaders });
    }

    // Mark the original deposit as refunded so it can't be refunded again
    await supabase
      .from("wallet_movements")
      .update({ refunded_at: new Date().toISOString() })
      .eq("id", movement.id);

    console.log(`[refund-mercadopago-deposit] Refunded payment ${paymentId} for user ${user.id}, amount ${amount}`);

    return new Response(JSON.stringify({ success: true, amount }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[refund-mercadopago-deposit] Unexpected error:", error);
    return new Response(JSON.stringify({ error: error.message ?? "Error interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
