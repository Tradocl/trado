import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Bank transfer is offered when the MP fee starts eating the commission, and
// forced when it clearly exceeds it. Thresholds are on the deposit amount:
//   >= 400.000  -> transfer offered  (Trado commission would reach ~$20.000)
//   >= 1.150.000 -> transfer required (commission ~$50.000)
const OFFER_TRANSFER_AT = 400_000;
const MIN_TRANSFER_AMOUNT = OFFER_TRANSFER_AT;
const MAX_TRANSFER_AMOUNT = 20_000_000;

function generateReference(): string {
  // Short, unambiguous reference the buyer writes in the transfer comment.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let code = "";
  for (const b of bytes) code += alphabet[b % alphabet.length];
  return `TR-${code}`;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const auth = await requireUser(req);
    if (auth instanceof Response) return auth;
    const userId = auth.user.id;

    const { amount } = await req.json();
    const depositAmount = Number(amount);

    if (!depositAmount || depositAmount < MIN_TRANSFER_AMOUNT) {
      return new Response(
        JSON.stringify({ error: `El depósito por transferencia es para montos desde $${MIN_TRANSFER_AMOUNT.toLocaleString("es-CL")} CLP` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }
    if (depositAmount > MAX_TRANSFER_AMOUNT) {
      return new Response(
        JSON.stringify({ error: `Monto máximo por transferencia: $${MAX_TRANSFER_AMOUNT.toLocaleString("es-CL")} CLP` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // Find the user's wallet.
    const { data: wallet, error: walletErr } = await supabase
      .from("wallets")
      .select("id, balance")
      .eq("user_id", userId)
      .single();

    if (walletErr || !wallet) {
      return new Response(JSON.stringify({ error: "Billetera no encontrada" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // One open transfer request at a time keeps the admin queue unambiguous.
    const { data: openReq } = await supabase
      .from("wallet_movements")
      .select("id, description")
      .eq("wallet_id", wallet.id)
      .eq("type", "deposit")
      .eq("status", "pending")
      .ilike("description", "Transferencia bancaria%")
      .maybeSingle();

    if (openReq) {
      return new Response(
        JSON.stringify({ error: "Ya tienes una transferencia pendiente de verificación. Espera a que sea aprobada o contáctanos." }),
        { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const reference = generateReference();

    // Pending deposit; balance is credited only when an admin approves it after
    // confirming the transfer arrived. No MP fee — the full amount is credited.
    const { error: insertErr } = await supabase.from("wallet_movements").insert({
      wallet_id: wallet.id,
      type: "deposit",
      amount: depositAmount,
      balance_after: Number(wallet.balance),
      description: `Transferencia bancaria [${reference}] - pendiente verificación`,
      status: "pending",
    });

    if (insertErr) {
      console.error("[request-transfer-deposit] Insert error:", insertErr);
      return new Response(JSON.stringify({ error: "No se pudo registrar la solicitud" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ success: true, reference }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[request-transfer-deposit] Error:", error);
    return new Response(JSON.stringify({ error: error.message ?? "Error interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
