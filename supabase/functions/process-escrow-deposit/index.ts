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

interface ProcessEscrowDepositRequest {
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
      console.error("[process-escrow-deposit] Auth error:", authError);
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userId = user.id;
    const { transactionId }: ProcessEscrowDepositRequest = await req.json();

    if (!transactionId) {
      return new Response(JSON.stringify({ error: "transactionId requerido" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`[process-escrow-deposit] Processing deposit for transaction: ${transactionId}, user: ${userId}`);

    // Get transaction
    const { data: tx, error: txError } = await supabaseClient
      .from("transactions")
      .select("id, seller_id, buyer_id, amount, commission, state, product_name, sale_type, initiator_role")
      .eq("id", transactionId)
      .single();

    if (txError || !tx) {
      console.error("[process-escrow-deposit] Error fetching transaction", txError);
      throw new Error("Transacción no encontrada");
    }

    // SECURITY: Verify authenticated user is the buyer
    if (tx.buyer_id !== userId) {
      console.error("[process-escrow-deposit] User is not the buyer");
      return new Response(JSON.stringify({ error: "No autorizado - solo el comprador puede depositar" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify transaction state - accept both "invited" and "awaiting_deposit"
    const validStates = ["invited", "awaiting_deposit"];
    if (!validStates.includes(tx.state)) {
      console.log(`[process-escrow-deposit] Transaction state ${tx.state} is not valid for deposit`);
      throw new Error("La transacción no está en un estado válido para depositar");
    }

    // Check if escrow_lock already exists for this transaction
    const { data: existingLock, error: lockCheckError } = await supabaseClient
      .from("wallet_movements")
      .select("id")
      .eq("transaction_id", transactionId)
      .eq("type", "escrow_lock")
      .in("status", ["pending", "approved"])
      .maybeSingle();

    if (lockCheckError) {
      console.error("[process-escrow-deposit] Error checking existing lock", lockCheckError);
      throw new Error("Error al verificar el estado del depósito");
    }

    if (existingLock) {
      console.log(`[process-escrow-deposit] Escrow lock already exists for transaction ${transactionId}`);
      return new Response(JSON.stringify({ success: true, message: "Los fondos ya fueron bloqueados" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get buyer wallet
    const { data: wallet, error: walletError } = await supabaseClient
      .from("wallets")
      .select("id, balance, blocked_balance")
      .eq("user_id", userId)
      .single();

    if (walletError || !wallet) {
      console.error("[process-escrow-deposit] Error fetching wallet", walletError);
      throw new Error("Billetera no encontrada");
    }

    // Calculate deposit amount based on initiator_role
    const initiatorRole = tx.initiator_role || "seller";
    const depositAmount = initiatorRole === "buyer"
      ? Number(tx.amount) + Number(tx.commission)
      : Number(tx.amount);

    console.log(`[process-escrow-deposit] Deposit amount: ${depositAmount}, initiatorRole: ${initiatorRole}`);

    // Check sufficient balance
    if (Number(wallet.balance) < depositAmount) {
      console.log(`[process-escrow-deposit] Insufficient balance: ${wallet.balance} < ${depositAmount}`);
      return new Response(JSON.stringify({ 
        error: "Saldo insuficiente", 
        insufficientFunds: true 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Calculate new balances
    const currentBlocked = Number(wallet.blocked_balance ?? 0);
    const newBlockedBalance = currentBlocked + depositAmount;
    const newAvailableBalance = Number(wallet.balance) - depositAmount;
    const typeLabel = tx.sale_type === "servicio" ? "Servicio" : "Compra";

    console.log(`[process-escrow-deposit] Updating wallet: balance ${wallet.balance} -> ${newAvailableBalance}, blocked ${currentBlocked} -> ${newBlockedBalance}`);

    // Update wallet: reduce available balance, increase blocked balance
    const { error: updateWalletError } = await supabaseClient
      .from("wallets")
      .update({
        balance: newAvailableBalance,
        blocked_balance: newBlockedBalance
      })
      .eq("id", wallet.id);

    if (updateWalletError) {
      console.error("[process-escrow-deposit] Error updating wallet", updateWalletError);
      throw new Error("No se pudo actualizar la billetera");
    }

    // Insert escrow_lock movement
    const { error: movementError } = await supabaseClient
      .from("wallet_movements")
      .insert({
        wallet_id: wallet.id,
        transaction_id: transactionId,
        type: "escrow_lock",
        amount: -depositAmount,
        balance_after: newAvailableBalance,
        description: `${typeLabel} "${tx.product_name}"`,
        status: "pending",
      });

    if (movementError) {
      console.error("[process-escrow-deposit] Error inserting movement", movementError);
      throw new Error("No se pudo registrar el movimiento");
    }

    // Update transaction state
    const { error: txUpdateError } = await supabaseClient
      .from("transactions")
      .update({ state: "funds_secured", deposited_at: new Date().toISOString() })
      .eq("id", transactionId);

    if (txUpdateError) {
      console.error("[process-escrow-deposit] Error updating transaction", txUpdateError);
      throw new Error("No se pudo actualizar la transacción");
    }

    console.log(`[process-escrow-deposit] Successfully processed deposit for transaction ${transactionId}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[process-escrow-deposit] Error:", error);
    return new Response(JSON.stringify({ error: error.message ?? "Error interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
