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
    // Extract and verify user from JWT token
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
      console.error("[confirm-delivery] Auth error:", authError);
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { transactionId }: ConfirmDeliveryRequest = await req.json();

    if (!transactionId) {
      return new Response(JSON.stringify({ error: "transactionId requerido" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`[confirm-delivery] User ${user.id} processing transaction: ${transactionId}`);

    // Get transaction with initiator_role
    const { data: tx, error: txError } = await supabaseClient
      .from("transactions")
      .select("id, seller_id, buyer_id, amount, commission, state, product_name, sale_type, initiator_role")
      .eq("id", transactionId)
      .single();

    if (txError || !tx) {
      console.error("[confirm-delivery] Error fetching transaction", txError);
      throw new Error("Transacción no encontrada");
    }

    if (!tx.buyer_id || !tx.seller_id) {
      throw new Error("Transacción inválida");
    }

    // SECURITY: Verify the authenticated user is the buyer of this transaction
    if (user.id !== tx.buyer_id) {
      console.error(`[confirm-delivery] Unauthorized: user ${user.id} is not buyer ${tx.buyer_id}`);
      return new Response(JSON.stringify({ error: "No tienes permiso para confirmar esta entrega" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Allow completion from funds_secured (legacy), in_delivery (legacy), or awaiting_buyer_review (new flow)
    const allowedStates = ["funds_secured", "in_delivery", "awaiting_buyer_review"];
    if (!allowedStates.includes(tx.state)) {
      console.log(`[confirm-delivery] Transaction state ${tx.state} not in allowed states: ${allowedStates.join(", ")}`);
      throw new Error("La transacción no está lista para completarse");
    }

    // RACE CONDITION FIX: Use the transaction state update as an atomic lock.
    // Only ONE concurrent request can succeed in changing the state from an allowed state
    // to "completed". Postgres guarantees this update is atomic, preventing double payments.
    const { data: locked, error: lockError } = await supabaseClient
      .from("transactions")
      .update({ state: "completed", completed_at: new Date().toISOString(), commission: Number(tx.commission) || 0 })
      .eq("id", transactionId)
      .in("state", allowedStates)
      .select("id")
      .maybeSingle();

    if (lockError) {
      console.error("[confirm-delivery] Error acquiring transaction lock", lockError);
      throw new Error("Error al procesar la transacción");
    }

    if (!locked) {
      // Another concurrent request already completed this transaction
      console.log(`[confirm-delivery] Transaction ${transactionId} already completed by concurrent request`);
      return new Response(JSON.stringify({ success: true, message: "La transacción ya fue completada" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get buyer wallet to release blocked funds
    const { data: buyerWallet, error: buyerWalletError } = await supabaseClient
      .from("wallets")
      .select("id, balance, blocked_balance")
      .eq("user_id", tx.buyer_id)
      .single();

    if (buyerWalletError || !buyerWallet) {
      console.error("[confirm-delivery] Error fetching buyer wallet", buyerWalletError);
      throw new Error("Billetera del comprador no encontrada");
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

    // Use commission from database (stored when transaction was created)
    const transactionAmount = Number(tx.amount);
    const calculatedCommission = Number(tx.commission) || 0;
    
    if (!tx.commission) {
      console.warn(`[confirm-delivery] Transaction ${transactionId} has no commission stored, using 0`);
    }

    // Determine how much the seller receives based on initiator_role
    // If buyer initiated: buyer already paid price + commission, so seller gets full amount
    // If seller initiated: commission is deducted from seller's payment
    const initiatorRole = (tx as any).initiator_role || "seller";
    const amountToSeller = initiatorRole === "buyer" 
      ? transactionAmount  // Buyer paid commission, seller gets full price
      : transactionAmount - calculatedCommission;  // Seller pays commission

    const currentSellerBalance = Number(sellerWallet.balance ?? 0);
    const newSellerBalance = currentSellerBalance + amountToSeller;

    // Calculate how much was blocked in escrow
    // If buyer initiated, they blocked amount + commission
    // If seller initiated, buyer blocked just the amount
    const escrowAmount = initiatorRole === "buyer"
      ? transactionAmount + calculatedCommission
      : transactionAmount;

    // Release buyer's blocked funds
    const currentBuyerBlocked = Number(buyerWallet.blocked_balance ?? 0);
    if (currentBuyerBlocked < escrowAmount) {
      console.error(`[confirm-delivery] DATA INCONSISTENCY: blocked_balance (${currentBuyerBlocked}) < escrowAmount (${escrowAmount}) for tx ${transactionId}`);
    }
    const newBuyerBlocked = Math.max(0, currentBuyerBlocked - escrowAmount);

    // Determine sale type label for description
    const saleTypeLabel = tx.sale_type === "servicio" ? "Servicio" : "Venta";

    console.log(`[confirm-delivery] Processing payment: initiatorRole=${initiatorRole}, amount=${transactionAmount}, commission=${calculatedCommission}, sellerReceives=${amountToSeller}`);
    console.log(`[confirm-delivery] Buyer blocked: ${currentBuyerBlocked} -> ${newBuyerBlocked} (releasing ${escrowAmount})`);

    // Update buyer wallet: release blocked funds
    const { error: updateBuyerWalletError } = await supabaseClient
      .from("wallets")
      .update({ blocked_balance: newBuyerBlocked })
      .eq("id", buyerWallet.id);

    if (updateBuyerWalletError) {
      console.error("[confirm-delivery] Error updating buyer wallet", updateBuyerWalletError);
      throw new Error("No se pudo actualizar la billetera del comprador");
    }

    // Approve the buyer's escrow_lock movement (mark as spent)
    const { error: approveMovementError } = await supabaseClient
      .from("wallet_movements")
      .update({ status: "approved" })
      .eq("transaction_id", transactionId)
      .eq("type", "escrow_lock")
      .eq("status", "pending");

    if (approveMovementError) {
      console.error("[confirm-delivery] Error approving escrow_lock movement", approveMovementError);
      // Continue anyway, it's not critical
    }

    // Update seller wallet balance
    const { error: updateWalletError } = await supabaseClient
      .from("wallets")
      .update({ balance: newSellerBalance })
      .eq("id", sellerWallet.id);

    if (updateWalletError) {
      console.error("[confirm-delivery] Error updating seller wallet", updateWalletError);
      throw new Error("No se pudo actualizar la billetera del vendedor");
    }

    // Insert seller wallet movement
    const { error: movementError } = await supabaseClient.from("wallet_movements").insert({
      wallet_id: sellerWallet.id,
      transaction_id: tx.id,
      type: "escrow_release",
      amount: amountToSeller,
      balance_after: newSellerBalance,
      description: `${saleTypeLabel} "${tx.product_name}"`,
      status: "approved",
    });

    if (movementError) {
      console.error("[confirm-delivery] Error inserting wallet movement", movementError);
      throw new Error("No se pudo registrar el movimiento de la billetera");
    }

    // Transaction state was already set to "completed" in the lock step above.
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

    // Send notification emails to both buyer and seller
    try {
      // Get profiles for email data
      const { data: sellerProfileData } = await supabaseClient
        .from("profiles")
        .select("email, full_name")
        .eq("id", tx.seller_id)
        .single();

      const { data: buyerProfileData } = await supabaseClient
        .from("profiles")
        .select("email, full_name")
        .eq("id", tx.buyer_id)
        .single();

      if (sellerProfileData && buyerProfileData) {
        // Call the notification edge function
        const notifyResponse = await fetch(`${SUPABASE_URL}/functions/v1/notify-transaction-completed`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            buyerEmail: buyerProfileData.email,
            buyerName: buyerProfileData.full_name,
            sellerEmail: sellerProfileData.email,
            sellerName: sellerProfileData.full_name,
            productName: tx.product_name,
            amount: transactionAmount,
            commission: tx.commission || 0,
            transactionId: tx.id,
          }),
        });

        const notifyData = await notifyResponse.json();
        console.log("[confirm-delivery] Transaction notification sent:", notifyData);
      }
    } catch (notifyError) {
      console.error("[confirm-delivery] Error sending notification emails:", notifyError);
    }

    // Push notifications (fire and forget)
    supabaseClient.functions.invoke('send-push-notification', {
      body: {
        userIds: [tx.seller_id],
        title: '¡Fondos liberados!',
        body: `💸 ${tx.product_name} — los fondos están en tu billetera`,
        url: '/wallet',
        tag: `delivery-seller-${transactionId}`,
      },
    }).catch(() => {});
    supabaseClient.functions.invoke('send-push-notification', {
      body: {
        userIds: [tx.buyer_id],
        title: 'Transacción completada',
        body: `✅ ${tx.product_name} — transacción cerrada exitosamente`,
        url: `/transaction/${transactionId}`,
        tag: `delivery-buyer-${transactionId}`,
      },
    }).catch(() => {});

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