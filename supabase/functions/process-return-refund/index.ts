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
    // SECURITY: Extract and verify user from JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error("[process-return-refund] Auth error:", authError);
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userId = user.id;
    const { returnRequestId, transactionId }: ProcessReturnRefundRequest = await req.json();

    if (!returnRequestId || !transactionId) {
      return new Response(JSON.stringify({ error: "Faltan parámetros requeridos" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`[process-return-refund] Processing return: ${returnRequestId}, transaction: ${transactionId}, user: ${userId}`);

    // Get transaction - IMPORTANT: include initiator_role and commission
    const { data: tx, error: txError } = await supabaseClient
      .from("transactions")
      .select("id, buyer_id, seller_id, amount, commission, initiator_role, state, product_name")
      .eq("id", transactionId)
      .single();

    if (txError || !tx) {
      console.error("[process-return-refund] Error fetching transaction", txError);
      throw new Error("Transacción no encontrada");
    }

    // SECURITY: Verify authenticated user is the seller (only seller can confirm receipt)
    if (tx.seller_id !== userId) {
      console.error("[process-return-refund] User is not the seller");
      return new Response(JSON.stringify({ error: "No autorizado - solo el vendedor puede confirmar la recepción" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
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

    // RACE CONDITION FIX: Use return_request status update as atomic lock.
    // Only one concurrent request can succeed in changing status from "shipped" to "completed".
    const { data: locked, error: lockError } = await supabaseClient
      .from("return_requests")
      .update({ status: "completed", received_at: new Date().toISOString() })
      .eq("id", returnRequestId)
      .eq("status", "shipped")
      .select("id")
      .maybeSingle();

    if (lockError) {
      console.error("[process-return-refund] Error acquiring return request lock", lockError);
      throw new Error("Error al procesar la devolución");
    }

    if (!locked) {
      console.log(`[process-return-refund] Return request ${returnRequestId} already processed by concurrent request`);
      return new Response(JSON.stringify({ success: true, message: "El reembolso ya fue procesado" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
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

    // Calculate correct escrow amount based on initiator_role
    const initiatorRole = tx.initiator_role || 'seller';
    const transactionAmount = Number(tx.amount);
    const commission = Number(tx.commission) || 0;
    
    // If buyer initiated, they paid amount + commission. If seller initiated, buyer paid just amount.
    const escrowAmount = initiatorRole === 'buyer' 
      ? transactionAmount + commission 
      : transactionAmount;

    // IMPORTANT: Commission is ALWAYS charged on returns
    // Refund amount = what they paid MINUS commission
    const refundAmount = escrowAmount - commission;
    const currentBalance = Number(wallet.balance);
    const newBalance = currentBalance + refundAmount;
    
    // Release the blocked amount (full escrow)
    const currentBlocked = Number(wallet.blocked_balance ?? 0);
    const newBlocked = Math.max(0, currentBlocked - escrowAmount);

    console.log(`[process-return-refund] Processing refund: initiatorRole=${initiatorRole}, escrowAmount=${escrowAmount}, commission=${commission}, refundAmount=${refundAmount}`);
    console.log(`[process-return-refund] Balance: ${currentBalance} -> ${newBalance}, Blocked: ${currentBlocked} -> ${newBlocked}`);

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
    } else {
      console.log("[process-return-refund] escrow_lock movement marked as approved");
    }

    // Create wallet movement for the refund (minus commission)
    const { error: movementError } = await supabaseClient
      .from("wallet_movements")
      .insert({
        wallet_id: wallet.id,
        transaction_id: transactionId,
        type: "escrow_release",
        amount: refundAmount,
        balance_after: newBalance,
        description: `Reembolso "${tx.product_name}" (menos comisión)`,
        status: "approved",
      });

    if (movementError) {
      console.error("[process-return-refund] Error creating movement", movementError);
      // Log but don't fail - wallet balance is already updated
    } else {
      console.log("[process-return-refund] escrow_release movement created successfully");
    }

    // Create commission movement to track platform revenue
    // balance_after for this record = newBalance - commission (reflects the actual deduction)
    if (commission > 0) {
      const { error: commissionError } = await supabaseClient
        .from("wallet_movements")
        .insert({
          wallet_id: wallet.id,
          transaction_id: transactionId,
          type: "commission",
          amount: -commission,
          balance_after: newBalance - commission,
          description: `Comisión "${tx.product_name}"`,
          status: "approved",
        });

      if (commissionError) {
        console.error("[process-return-refund] Error creating commission movement", commissionError);
      } else {
        console.log("[process-return-refund] commission movement created successfully");
      }
    }

    // Update transaction state to completed
    const { error: txUpdateError } = await supabaseClient
      .from("transactions")
      .update({ state: "completed", completed_at: new Date().toISOString() })
      .eq("id", transactionId)
      .eq("state", "return_in_progress"); // idempotency guard

    if (txUpdateError) {
      console.error("[process-return-refund] Error updating transaction", txUpdateError);
      throw new Error("No se pudo actualizar la transacción");
    }

    console.log(`[process-return-refund] Successfully processed refund for transaction ${transactionId}: refund=${refundAmount}`);

    return new Response(JSON.stringify({ success: true, refundAmount }), {
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
