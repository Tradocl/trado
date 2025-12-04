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

    console.log(`[confirm-delivery] Processing transaction: ${transactionId}`);

    // Get transaction
    const { data: tx, error: txError } = await supabaseClient
      .from("transactions")
      .select("id, seller_id, buyer_id, amount, commission, state, product_name, sale_type")
      .eq("id", transactionId)
      .single();

    if (txError || !tx) {
      console.error("[confirm-delivery] Error fetching transaction", txError);
      throw new Error("Transacción no encontrada");
    }

    if (!tx.buyer_id || !tx.seller_id) {
      throw new Error("Transacción inválida");
    }

    // Allow completion from funds_secured (legacy), in_delivery (legacy), or awaiting_buyer_review (new flow)
    const allowedStates = ["funds_secured", "in_delivery", "awaiting_buyer_review"];
    if (!allowedStates.includes(tx.state)) {
      console.log(`[confirm-delivery] Transaction state ${tx.state} not in allowed states: ${allowedStates.join(", ")}`);
      throw new Error("La transacción no está lista para completarse");
    }

    // CRITICAL: Check if escrow_release already exists for this transaction to prevent double payments
    const { data: existingRelease, error: releaseCheckError } = await supabaseClient
      .from("wallet_movements")
      .select("id")
      .eq("transaction_id", transactionId)
      .eq("type", "escrow_release")
      .eq("status", "approved")
      .maybeSingle();

    if (releaseCheckError) {
      console.error("[confirm-delivery] Error checking existing release", releaseCheckError);
      throw new Error("Error al verificar el estado del pago");
    }

    if (existingRelease) {
      console.log(`[confirm-delivery] Escrow release already exists for transaction ${transactionId}, skipping duplicate`);
      // Return success since the transaction was already completed
      return new Response(JSON.stringify({ success: true, message: "La transacción ya fue completada anteriormente" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get seller wallet
    const { data: sellerWallet, error: walletError } = await supabaseClient
      .from("wallets")
      .select("id, balance")
      .eq("user_id", tx.seller_id)
      .single();

    if (walletError || !sellerWallet) {
      console.error("[confirm-delivery] Error fetching seller wallet", walletError);
      throw new Error("Billetera del vendedor no encontrada");
    }

    // Recalculate commission using the same logic as frontend
    const transactionAmount = Number(tx.amount);
    const baseFee = transactionAmount * 0.05;
    const roundedFee = Math.round(baseFee / 10) * 10;
    const feeWithFloor = Math.max(roundedFee, 1000);
    const calculatedCommission = Math.min(feeWithFloor, 20000);

    const amountAfterCommission = transactionAmount - calculatedCommission;
    const currentBalance = Number(sellerWallet.balance ?? 0);
    const newSellerBalance = currentBalance + amountAfterCommission;

    // Determine sale type label for description
    const saleTypeLabel = tx.sale_type === "servicio" ? "Servicio" : "Venta";
    const shortId = transactionId.slice(0, 8).toUpperCase();

    console.log(`[confirm-delivery] Processing payment: amount=${transactionAmount}, commission=${calculatedCommission}, net=${amountAfterCommission}`);

    // Update seller wallet balance
    const { error: updateWalletError } = await supabaseClient
      .from("wallets")
      .update({ balance: newSellerBalance })
      .eq("id", sellerWallet.id);

    if (updateWalletError) {
      console.error("[confirm-delivery] Error updating seller wallet", updateWalletError);
      throw new Error("No se pudo actualizar la billetera del vendedor");
    }

    // Insert wallet movement with detailed description
    const { error: movementError } = await supabaseClient.from("wallet_movements").insert({
      wallet_id: sellerWallet.id,
      transaction_id: tx.id,
      type: "escrow_release",
      amount: amountAfterCommission,
      balance_after: newSellerBalance,
      description: `${saleTypeLabel} #${shortId}: "${tx.product_name}" ($${transactionAmount.toLocaleString('es-CL')} - $${calculatedCommission.toLocaleString('es-CL')} comisión)`,
      status: "approved",
    });

    if (movementError) {
      console.error("[confirm-delivery] Error inserting wallet movement", movementError);
      throw new Error("No se pudo registrar el movimiento de la billetera");
    }

    // Update transaction state
    const { error: txUpdateError } = await supabaseClient
      .from("transactions")
      .update({ 
        state: "completed", 
        completed_at: new Date().toISOString(),
        commission: calculatedCommission // Store the calculated commission
      })
      .eq("id", tx.id);

    if (txUpdateError) {
      console.error("[confirm-delivery] Error updating transaction", txUpdateError);
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
        console.error("[confirm-delivery] Error updating seller profile stats", profileUpdateError);
      }
    }

    // Update buyer profile stats
    const { data: buyerProfile, error: buyerProfileError } = await supabaseClient
      .from("profiles")
      .select("total_transactions")
      .eq("id", tx.buyer_id)
      .single();

    if (!buyerProfileError && buyerProfile) {
      const totalTransactionsBuyer = Number(buyerProfile.total_transactions ?? 0) + 1;

      const { error: buyerProfileUpdateError } = await supabaseClient
        .from("profiles")
        .update({ total_transactions: totalTransactionsBuyer })
        .eq("id", tx.buyer_id);

      if (buyerProfileUpdateError) {
        console.error("[confirm-delivery] Error updating buyer profile stats", buyerProfileUpdateError);
      }
    }

    console.log(`[confirm-delivery] Successfully completed transaction ${transactionId}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[confirm-delivery] Error:", error);
    return new Response(JSON.stringify({ error: error.message ?? "Error interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
