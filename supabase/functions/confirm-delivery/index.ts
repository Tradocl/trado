import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
}

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmDeliveryRequest {
  transactionId: string;
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
    const { transactionId }: ConfirmDeliveryRequest = await req.json();

    if (!transactionId) {
      return new Response(JSON.stringify({ error: "transactionId requerido" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get transaction
    const { data: tx, error: txError } = await supabaseClient
      .from("transactions")
      .select("id, seller_id, buyer_id, amount, commission, state, product_name")
      .eq("id", transactionId)
      .single();

    if (txError || !tx) {
      console.error("Error fetching transaction", txError);
      throw new Error("Transacción no encontrada");
    }

    if (!tx.buyer_id || !tx.seller_id) {
      throw new Error("Transacción inválida");
    }

    if (tx.state !== "funds_secured" && tx.state !== "in_delivery") {
      throw new Error("La transacción no está lista para completarse");
    }

    // Get seller wallet
    const { data: sellerWallet, error: walletError } = await supabaseClient
      .from("wallets")
      .select("id, balance")
      .eq("user_id", tx.seller_id)
      .single();

    if (walletError || !sellerWallet) {
      console.error("Error fetching seller wallet", walletError);
      throw new Error("Billetera del vendedor no encontrada");
    }

    const amountAfterCommission = Number(tx.amount) - Number(tx.commission ?? 0);
    const currentBalance = Number(sellerWallet.balance ?? 0);
    const newSellerBalance = currentBalance + amountAfterCommission;

    // Update seller wallet balance
    const { error: updateWalletError } = await supabaseClient
      .from("wallets")
      .update({ balance: newSellerBalance })
      .eq("id", sellerWallet.id);

    if (updateWalletError) {
      console.error("Error updating seller wallet", updateWalletError);
      throw new Error("No se pudo actualizar la billetera del vendedor");
    }

    // Insert wallet movement
    const { error: movementError } = await supabaseClient.from("wallet_movements").insert({
      wallet_id: sellerWallet.id,
      transaction_id: tx.id,
      type: "escrow_release",
      amount: amountAfterCommission,
      balance_after: newSellerBalance,
      description: `Pago liberado - ${tx.product_name}`,
    });

    if (movementError) {
      console.error("Error inserting wallet movement", movementError);
      throw new Error("No se pudo registrar el movimiento de la billetera");
    }

    // Update transaction state
    const { error: txUpdateError } = await supabaseClient
      .from("transactions")
      .update({ state: "completed", completed_at: new Date().toISOString() })
      .eq("id", tx.id);

    if (txUpdateError) {
      console.error("Error updating transaction", txUpdateError);
      throw new Error("No se pudo actualizar la transacción");
    }

    // Update seller profile stats
    const { data: sellerProfile, error: sellerProfileError } = await supabaseClient
      .from("profiles")
      .select("total_transactions")
      .eq("id", tx.seller_id)
      .single();

    if (!sellerProfileError && sellerProfile) {
      const totalTransactions = Number(sellerProfile.total_transactions ?? 0) + 1;

      const { error: profileUpdateError } = await supabaseClient
        .from("profiles")
        .update({ total_transactions: totalTransactions })
        .eq("id", tx.seller_id);

      if (profileUpdateError) {
        console.error("Error updating seller profile stats", profileUpdateError);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in confirm-delivery function:", error);
    return new Response(JSON.stringify({ error: error.message ?? "Error interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
