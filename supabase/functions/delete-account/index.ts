import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// States that block deletion — user still has open obligations
const BLOCKING_STATES = [
  "created",
  "awaiting_deposit",
  "funds_secured",
  "awaiting_buyer_review",
  "return_in_progress",
  "appealed",
  "disputed",
];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Block deletion if wallet has balance OR blocked funds in escrow
  const { data: wallet } = await adminClient
    .from("wallets")
    .select("balance, blocked_balance")
    .eq("user_id", user.id)
    .maybeSingle();

  if (wallet && (Number(wallet.balance) > 0 || Number(wallet.blocked_balance ?? 0) > 0)) {
    return new Response(
      JSON.stringify({ error: "Tienes saldo o fondos en escrow. Retira y completa tus transacciones antes de eliminar tu cuenta." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Block deletion if user has active transactions (use `state`, the actual column)
  const { data: activeTx, error: txError } = await adminClient
    .from("transactions")
    .select("id, state")
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .in("state", BLOCKING_STATES)
    .limit(1);

  if (txError) {
    console.error("[delete-account] Error checking transactions:", txError);
    return new Response(
      JSON.stringify({ error: "Error verificando transacciones" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (activeTx && activeTx.length > 0) {
    return new Response(
      JSON.stringify({ error: "Tienes transacciones activas. Espera a que finalicen antes de eliminar tu cuenta." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Block deletion if user has pending withdrawals
  if (wallet) {
    const { data: pendingMovs } = await adminClient
      .from("wallet_movements")
      .select("id")
      .eq("status", "pending")
      .in("type", ["withdrawal", "deposit"])
      .limit(1);

    if (pendingMovs && pendingMovs.length > 0) {
      return new Response(
        JSON.stringify({ error: "Tienes movimientos pendientes. Cancela o espera a que se procesen." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("[delete-account] Error:", deleteError);
    return new Response(
      JSON.stringify({ error: "Error al eliminar la cuenta. Contacta a contacto@trado.cl" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log(`[delete-account] User ${user.id} deleted successfully`);
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});
