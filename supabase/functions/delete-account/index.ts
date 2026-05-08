import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

  // Block deletion if wallet has balance
  const { data: wallet } = await adminClient
    .from("wallets")
    .select("balance")
    .eq("user_id", user.id)
    .single();

  if (wallet && Number(wallet.balance) > 0) {
    return new Response(
      JSON.stringify({ error: "Tienes saldo en tu billetera. Retira los fondos antes de eliminar tu cuenta." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Block deletion if user has active transactions
  const { data: activeTx } = await adminClient
    .from("transactions")
    .select("id")
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .in("status", ["pending", "active", "disputed"])
    .limit(1);

  if (activeTx && activeTx.length > 0) {
    return new Response(
      JSON.stringify({ error: "Tienes transacciones activas. Espera a que finalicen antes de eliminar tu cuenta." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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
