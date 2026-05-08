import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const FINTOC_SECRET_KEY = Deno.env.get("FINTOC_SECRET_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { amount, successUrl, cancelUrl } = await req.json();

    if (!amount || amount < 1000) {
      return new Response(JSON.stringify({ error: "Monto mínimo: $1.000 CLP" }), { status: 400, headers: corsHeaders });
    }

    // Get wallet id — needed for the webhook to credit the right wallet
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (walletError || !wallet) {
      return new Response(JSON.stringify({ error: "Billetera no encontrada" }), { status: 404, headers: corsHeaders });
    }

    // Create Fintoc checkout session — NO movement created here.
    // The movement is created only when the webhook confirms payment succeeded.
    const fintocResponse = await fetch("https://api.fintoc.com/v2/checkout_sessions", {
      method: "POST",
      headers: {
        "Authorization": FINTOC_SECRET_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: "CLP",
        payment_method_types: ["bank_transfer"],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          user_id: user.id,
          wallet_id: wallet.id,
          amount,
        },
      }),
    });

    if (!fintocResponse.ok) {
      const errBody = await fintocResponse.text();
      console.error("[create-fintoc-payment] Fintoc error:", errBody);
      return new Response(JSON.stringify({ error: "Error al crear sesión de pago" }), { status: 500, headers: corsHeaders });
    }

    const session = await fintocResponse.json();
    console.log(`[create-fintoc-payment] Session ${session.id} created for user ${user.id}`);

    return new Response(
      JSON.stringify({ checkout_url: session.redirect_url, session_id: session.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[create-fintoc-payment] Unexpected error:", error);
    return new Response(JSON.stringify({ error: error.message ?? "Error interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
