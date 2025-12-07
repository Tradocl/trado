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

interface ProcessReturnRefundRequest {
  returnRequestId: string;
  transactionId: string;
  userId: string;
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
    const { returnRequestId, transactionId, userId }: ProcessReturnRefundRequest = await req.json();

    if (!returnRequestId || !transactionId || !userId) {
      return new Response(JSON.stringify({ error: "Faltan parámetros requeridos" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`[process-return-refund] Processing return: ${returnRequestId}, transaction: ${transactionId}, user: ${userId}`);

    // Get transaction
    const { data: tx, error: txError } = await supabaseClient
      .from("transactions")
      .select("id, buyer_id, seller_id, amount, state")
      .eq("id", transactionId)
      .single();

    if (txError || !tx) {
      console.error("[process-return-refund] Error fetching transaction", txError);
      throw new Error("Transacción no encontrada");
    }

    // Verify user is the seller (only seller can confirm receipt)
    if (tx.seller_id !== userId) {
      console.error("[process-return-refund] User is not the seller");
      throw new Error("No autorizado - solo el vendedor puede confirmar la recepción");
    }

    // Verify transaction state
    if (tx.state !== "return_in_progress") {
      console.log(`[process-return-refund] Transaction state ${tx.state} is not return_in_progress`);
      throw new Error("La transacción no está en proceso de devolución");
    }

    // Get return request
    const { data: returnRequest, error: returnError } = await supabaseClient
      .from("return_requests")
      .select("id, status")
      .eq("id", returnRequestId)
      .eq("transaction_id", transactionId)
      .single();

    if (returnError || !returnRequest) {
      console.error("[process-return-refund] Error fetching return request", returnError);
      throw new Error("Solicitud de devolución no encontrada");
    }

    // Verify return request status
    if (returnRequest.status !== "shipped") {
      throw new Error("El producto aún no ha sido enviado");
    }

    // Check for existing refund to prevent duplicates
    const { data: existingRefund, error: refundCheckError } = await supabaseClient
      .from("wallet_movements")
      .select("id")
      .eq("transaction_id", transactionId)
      .eq("type", "refund")
      .eq("status", "approved")
      .maybeSingle();

    if (refundCheckError) {
      console.error("[process-return-refund] Error checking existing refund", refundCheckError);
      throw new Error("Error al verificar el estado del reembolso");
    }

    if (existingRefund) {
      console.log(`[process-return-refund] Refund already exists for transaction ${transactionId}`);
      return new Response(JSON.stringify({ success: true, message: "El reembolso ya fue procesado" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Update return request status
    const { error: updateReturnError } = await supabaseClient
      .from("return_requests")
      .update({
        status: "completed",
        received_at: new Date().toISOString(),
      })
      .eq("id", returnRequestId);

    if (updateReturnError) {
      console.error("[process-return-refund] Error updating return request", updateReturnError);
      throw new Error("No se pudo actualizar la solicitud de devolución");
    }

    // Get buyer's wallet and process refund
    if (!tx.buyer_id) {
      throw new Error("La transacción no tiene comprador");
    }

    const { data: wallet, error: walletError } = await supabaseClient
      .from("wallets")
      .select("id, balance, blocked_balance")
      .eq("user_id", tx.buyer_id)
      .single();

    if (walletError || !wallet) {
      console.error("[process-return-refund] Error fetching buyer wallet", walletError);
      throw new Error("Billetera del comprador no encontrada");
    }

    const refundAmount = Number(tx.amount);
    const newBalance = Number(wallet.balance) + refundAmount;
    // Release the blocked amount (escrow was the transaction amount)
    const currentBlocked = Number(wallet.blocked_balance ?? 0);
    const newBlocked = Math.max(0, currentBlocked - refundAmount);

    console.log(`[process-return-refund] Processing refund: amount=${refundAmount}, balance ${wallet.balance} -> ${newBalance}, blocked ${currentBlocked} -> ${newBlocked}`);

    // Update buyer wallet (balance + blocked_balance)
    const { error: updateWalletError } = await supabaseClient
      .from("wallets")
      .update({ 
        balance: newBalance,
        blocked_balance: newBlocked
      })
      .eq("id", wallet.id);

    if (updateWalletError) {
      console.error("[process-return-refund] Error updating wallet", updateWalletError);
      throw new Error("No se pudo actualizar la billetera");
    }

    // Mark escrow_lock movement as approved (resolved)
    const { error: escrowUpdateError } = await supabaseClient
      .from("wallet_movements")
      .update({ status: "approved" })
      .eq("transaction_id", transactionId)
      .eq("type", "escrow_lock")
      .eq("status", "pending");

    if (escrowUpdateError) {
      console.error("[process-return-refund] Error updating escrow_lock movement", escrowUpdateError);
    }

    // Create wallet movement
    const { error: movementError } = await supabaseClient
      .from("wallet_movements")
      .insert({
        wallet_id: wallet.id,
        transaction_id: transactionId,
        type: "refund",
        amount: refundAmount,
        balance_after: newBalance,
        description: "Reembolso por devolución",
        status: "approved",
      });

    if (movementError) {
      console.error("[process-return-refund] Error creating movement", movementError);
    }

    // Update transaction state to completed
    const { error: txUpdateError } = await supabaseClient
      .from("transactions")
      .update({
        state: "completed",
        completed_at: new Date().toISOString()
      })
      .eq("id", transactionId);

    if (txUpdateError) {
      console.error("[process-return-refund] Error updating transaction", txUpdateError);
      throw new Error("No se pudo actualizar la transacción");
    }

    console.log(`[process-return-refund] Successfully processed refund for transaction ${transactionId}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[process-return-refund] Error:", error);
    return new Response(JSON.stringify({ error: error.message ?? "Error interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
