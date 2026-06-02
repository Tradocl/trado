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

const MAX_DEPOSIT_AMOUNT = 5_000_000;
const ALLOWED_HOST_SUFFIXES = [
  "trado.cl",
  ".trado.cl",
  ".lovable.app",
  ".lovable.dev",
  "localhost",
];

function isAllowedRedirect(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.hostname !== "localhost") return false;
    return ALLOWED_HOST_SUFFIXES.some((suffix) =>
      suffix.startsWith(".") ? u.hostname.endsWith(suffix) : u.hostname === suffix
    );
  } catch {
    return false;
  }
}

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

    if (amount > MAX_DEPOSIT_AMOUNT) {
      return new Response(
        JSON.stringify({ error: `Monto máximo por depósito: $${MAX_DEPOSIT_AMOUNT.toLocaleString("es-CL")} CLP` }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!isAllowedRedirect(successUrl) || !isAllowedRedirect(cancelUrl)) {
      console.error("[create-mercadopago-payment] Invalid redirect URL", { successUrl, cancelUrl });
      return new Response(
        JSON.stringify({ error: "URL de redirección no permitida" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (walletError || !wallet) {
      return new Response(JSON.stringify({ error: "Billetera no encontrada" }), { status: 404, headers: corsHeaders });
    }

    // Encode user/wallet/amount in external_reference. Webhook re-fetches the
    // payment from MP to verify these values were not tampered with.
    const externalRef = JSON.stringify({
      user_id: user.id,
      wallet_id: wallet.id,
      amount,
    });

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{
          title: "Recarga de saldo Trado",
          quantity: 1,
          unit_price: amount,
          currency_id: "CLP",
        }],
        external_reference: externalRef,
        back_urls: {
          success: successUrl,
          failure: cancelUrl,
          pending: cancelUrl,
        },
        auto_return: "approved",
        notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`,
        metadata: {
          user_id: user.id,
          wallet_id: wallet.id,
          amount,
        },
        statement_descriptor: "TRADO",
      }),
    });

    if (!mpResponse.ok) {
      const errBody = await mpResponse.text();
      console.error("[create-mercadopago-payment] MP error:", errBody);
      return new Response(JSON.stringify({ error: "Error al crear preferencia de pago" }), { status: 500, headers: corsHeaders });
    }

    const pref = await mpResponse.json();
    console.log(`[create-mercadopago-payment] Preference ${pref.id} created for user ${user.id}`);

    return new Response(
      JSON.stringify({
        preference_id: pref.id,
        init_point: pref.init_point,
        sandbox_init_point: pref.sandbox_init_point,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[create-mercadopago-payment] Unexpected error:", error);
    return new Response(JSON.stringify({ error: error.message ?? "Error interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
