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

interface AcceptMutualResolutionRequest {
  proposalId: string;
  appealId: string;
  transactionId: string;
}

// Commission calculation matching the frontend logic
function calculateCommission(amount: number): number {
  const BASE_RATE = 0.05;
  const MIN_COMMISSION = 1000;
  const MAX_COMMISSION = 20000;
  const ROUNDING_FACTOR = 10;

  const rawCommission = amount * BASE_RATE;
  const roundedCommission = Math.round(rawCommission / ROUNDING_FACTOR) * ROUNDING_FACTOR;
  return Math.max(MIN_COMMISSION, Math.min(MAX_COMMISSION, roundedCommission));
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
      console.error("[accept-mutual-resolution] Auth error:", authError);
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userId = user.id;
    const { proposalId, appealId, transactionId }: AcceptMutualResolutionRequest = await req.json();

    if (!proposalId || !appealId || !transactionId) {
      console.error("[accept-mutual-resolution] Missing required parameters", { proposalId, appealId, transactionId });
      return new Response(JSON.stringify({ error: "Faltan parámetros requeridos" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`[accept-mutual-resolution] START - Processing proposal: ${proposalId}, appeal: ${appealId}, user: ${userId}`);

    // 1. Get the proposal
    const { data: proposal, error: proposalError } = await supabaseClient
      .from("appeal_mutual_proposals")
      .select("*")
      .eq("id", proposalId)
      .eq("appeal_id", appealId)
      .single();

    if (proposalError || !proposal) {
      console.error("[accept-mutual-resolution] Error fetching proposal", proposalError);
      return new Response(JSON.stringify({ error: "Propuesta no encontrada" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 2. Verify proposal is pending
    if (proposal.status !== "pending") {
      console.error("[accept-mutual-resolution] Proposal is not pending", { status: proposal.status });
      return new Response(JSON.stringify({ error: "La propuesta ya no está pendiente" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 3. SECURITY: Verify authenticated user is not the proposer (must be the other party)
    if (proposal.proposer_id === userId) {
      console.error("[accept-mutual-resolution] User is the proposer", { proposer_id: proposal.proposer_id, userId });
      return new Response(JSON.stringify({ error: "No puedes aceptar tu propia propuesta" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 4. Get transaction to verify parties and get commission info
    const { data: tx, error: txError } = await supabaseClient
      .from("transactions")
      .select("id, buyer_id, seller_id, amount, commission, initiator_role, product_name")
      .eq("id", transactionId)
      .single();

    if (txError || !tx) {
      console.error("[accept-mutual-resolution] Error fetching transaction", txError);
      return new Response(JSON.stringify({ error: "Transacción no encontrada" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 5. SECURITY: Verify authenticated user is either buyer or seller
    if (tx.buyer_id !== userId && tx.seller_id !== userId) {
      console.error("[accept-mutual-resolution] User is not part of transaction", { buyer_id: tx.buyer_id, seller_id: tx.seller_id, userId });
      return new Response(JSON.stringify({ error: "No autorizado - no eres parte de esta transacción" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 6. Calculate amounts
    const transactionAmount = Number(tx.amount);
    const commission = Number(tx.commission) || calculateCommission(transactionAmount);
    const buyerProposedAmount = Number(proposal.buyer_amount);
    const sellerProposedAmount = Number(proposal.seller_amount);

    // Validate total doesn't exceed transaction amount
    if (buyerProposedAmount + sellerProposedAmount > transactionAmount) {
      console.error(`[accept-mutual-resolution] Invalid amounts: buyer=${buyerProposedAmount}, seller=${sellerProposedAmount}, total=${transactionAmount}`);
      return new Response(JSON.stringify({ error: "Los montos propuestos exceden el total de la transacción" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Commission is paid by the party who initiated the transaction
    // If buyer initiated, they already paid commission in their deposit (no deduction from seller)
    // If seller initiated, commission is deducted from seller's portion
    const initiatorRole = tx.initiator_role || 'seller';
    
    // Calculate actual amounts after commission
    let buyerFinalAmount = buyerProposedAmount;
    let sellerFinalAmount = sellerProposedAmount;
    let commissionToDeduct = 0;

    // Commission is only applied when seller receives money
    if (sellerProposedAmount > 0) {
      if (initiatorRole === 'seller') {
        // Seller pays commission from their portion
        commissionToDeduct = Math.min(commission, sellerProposedAmount);
        sellerFinalAmount = sellerProposedAmount - commissionToDeduct;
      }
      // If buyer initiated, commission was already added to their deposit, seller gets full amount
    }

    console.log(`[accept-mutual-resolution] Amounts - Buyer: ${buyerProposedAmount}->${buyerFinalAmount}, Seller: ${sellerProposedAmount}->${sellerFinalAmount}, Commission: ${commissionToDeduct}`);

    // 7. Get wallets for both parties (including blocked_balance)
    const { data: buyerWallet, error: buyerWalletError } = await supabaseClient
      .from("wallets")
      .select("id, balance, blocked_balance")
      .eq("user_id", tx.buyer_id)
      .single();

    const { data: sellerWallet, error: sellerWalletError } = await supabaseClient
      .from("wallets")
      .select("id, balance, blocked_balance")
      .eq("user_id", tx.seller_id)
      .single();

    if (buyerWalletError || !buyerWallet || sellerWalletError || !sellerWallet) {
      console.error("[accept-mutual-resolution] Error fetching wallets", { buyerWalletError, sellerWalletError });
      return new Response(JSON.stringify({ error: "No se encontraron las billeteras de las partes" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`[accept-mutual-resolution] Wallets found: buyer=${buyerWallet.id} (blocked: ${buyerWallet.blocked_balance}), seller=${sellerWallet.id}`);

    // === ATOMIC OPERATION STARTS HERE ===
    let proposalUpdated = false;
    let buyerWalletUpdated = false;
    let sellerWalletUpdated = false;
    const originalBuyerBalance = Number(buyerWallet.balance);
    const originalBuyerBlockedBalance = Number(buyerWallet.blocked_balance);
    const originalSellerBalance = Number(sellerWallet.balance);

    try {
      // 8. Update proposal status to accepted
      const { error: updateProposalError } = await supabaseClient
        .from("appeal_mutual_proposals")
        .update({
          status: "accepted",
          responded_at: new Date().toISOString()
        })
        .eq("id", proposalId);

      if (updateProposalError) {
        console.error("[accept-mutual-resolution] Error updating proposal", updateProposalError);
        throw new Error("No se pudo actualizar la propuesta");
      }
      proposalUpdated = true;
      console.log("[accept-mutual-resolution] Proposal updated to accepted");

      // Calculate total escrow to release (the amount that was in blocked_balance for this transaction)
      // This is either the transaction amount or transaction amount + commission depending on who initiated
      const escrowAmount = initiatorRole === 'buyer' ? transactionAmount + commission : transactionAmount;

      // 8.5. Update the original escrow_lock movement to approved
      const { error: updateEscrowMovementError } = await supabaseClient
        .from("wallet_movements")
        .update({ status: "approved" })
        .eq("transaction_id", transactionId)
        .eq("type", "escrow_lock")
        .eq("status", "pending");

      if (updateEscrowMovementError) {
        console.error("[accept-mutual-resolution] Error updating escrow movement", updateEscrowMovementError);
        // Non-critical, continue
      } else {
        console.log("[accept-mutual-resolution] Original escrow_lock movement updated to approved");
      }

      // 9. Update buyer wallet - release blocked_balance and add their refund if any
      const newBuyerBlockedBalance = Math.max(0, originalBuyerBlockedBalance - escrowAmount);
      const newBuyerBalance = originalBuyerBalance + buyerFinalAmount;
      
      const { error: updateBuyerError } = await supabaseClient
        .from("wallets")
        .update({ 
          balance: newBuyerBalance,
          blocked_balance: newBuyerBlockedBalance
        })
        .eq("id", buyerWallet.id);

      if (updateBuyerError) {
        console.error("[accept-mutual-resolution] Error updating buyer wallet", updateBuyerError);
        throw new Error("No se pudo actualizar la billetera del comprador");
      }
      buyerWalletUpdated = true;
      console.log(`[accept-mutual-resolution] Buyer wallet updated: balance ${originalBuyerBalance}->${newBuyerBalance}, blocked ${originalBuyerBlockedBalance}->${newBuyerBlockedBalance}`);

      // Create buyer movement if they get money
      if (buyerFinalAmount > 0) {
        const { error: buyerMovementError } = await supabaseClient
          .from("wallet_movements")
          .insert({
            wallet_id: buyerWallet.id,
            type: "escrow_release",
            amount: buyerFinalAmount,
            balance_after: newBuyerBalance,
            status: "approved",
            description: `Reembolso "${tx.product_name}"`,
            transaction_id: transactionId,
          });

        if (buyerMovementError) {
          console.error("[accept-mutual-resolution] Error creating buyer movement", buyerMovementError);
          // Non-critical, continue
        } else {
          console.log("[accept-mutual-resolution] Buyer movement created");
        }
      }

      // 10. Update seller wallet if they get money
      if (sellerFinalAmount > 0) {
        const newSellerBalance = originalSellerBalance + sellerFinalAmount;
        
        const { error: updateSellerError } = await supabaseClient
          .from("wallets")
          .update({ balance: newSellerBalance })
          .eq("id", sellerWallet.id);

        if (updateSellerError) {
          console.error("[accept-mutual-resolution] Error updating seller wallet", updateSellerError);
          throw new Error("No se pudo actualizar la billetera del vendedor");
        }
        sellerWalletUpdated = true;
        console.log(`[accept-mutual-resolution] Seller wallet updated: ${originalSellerBalance} -> ${newSellerBalance}`);

        // Create seller movement
        const movementDescription = commissionToDeduct > 0 
          ? `Venta "${tx.product_name}" (neto después de comisión)`
          : `Venta "${tx.product_name}"`;

        const { error: sellerMovementError } = await supabaseClient
          .from("wallet_movements")
          .insert({
            wallet_id: sellerWallet.id,
            type: "escrow_release",
            amount: sellerFinalAmount,
            balance_after: newSellerBalance,
            status: "approved",
            description: movementDescription,
            transaction_id: transactionId,
          });

        if (sellerMovementError) {
          console.error("[accept-mutual-resolution] Error creating seller movement", sellerMovementError);
          // Non-critical, continue
        } else {
          console.log("[accept-mutual-resolution] Seller movement created");
        }
      }

      // 11. Create commission movement if applicable
      if (commissionToDeduct > 0) {
        const { error: commissionMovementError } = await supabaseClient
          .from("wallet_movements")
          .insert({
            wallet_id: sellerWallet.id,
            type: "commission",
            amount: -commissionToDeduct,
            balance_after: originalSellerBalance + sellerFinalAmount,
            status: "approved",
            description: `Comisión Trado "${tx.product_name}"`,
            transaction_id: transactionId,
          });

        if (commissionMovementError) {
          console.error("[accept-mutual-resolution] Error creating commission movement", commissionMovementError);
          // Non-critical, continue
        } else {
          console.log("[accept-mutual-resolution] Commission movement created");
        }
      }

      // 12. Determine resolution type based on amounts
      const resolution = buyerProposedAmount === transactionAmount
        ? "reembolso_total"
        : buyerProposedAmount > 0 && sellerProposedAmount > 0
          ? "reembolso_parcial"
          : "liberar_fondos_vendedor";

      const appealStatus = buyerProposedAmount === transactionAmount
        ? "resuelta_a_favor_comprador"
        : buyerProposedAmount > 0 && sellerProposedAmount > 0
          ? "resuelta_parcial"
          : "resuelta_a_favor_vendedor";

      console.log(`[accept-mutual-resolution] Resolution: ${resolution}, Appeal status: ${appealStatus}`);

      // 13. Create appeal decision record
      const resolutionNotes = commissionToDeduct > 0
        ? `Acuerdo mutuo entre las partes. Comisión de $${commissionToDeduct.toLocaleString('es-CL')} descontada del monto del vendedor. ${proposal.message || ""}`.trim()
        : `Acuerdo mutuo entre las partes. ${proposal.message || ""}`.trim();

      const { error: decisionError } = await supabaseClient
        .from("appeal_decisions")
        .insert({
          appeal_id: appealId,
          resolution,
          buyer_refund_amount: buyerFinalAmount,
          seller_payment_amount: sellerFinalAmount,
          resolution_notes: resolutionNotes,
          is_mutual_agreement: true,
          admin_id: null,
        });

      if (decisionError) {
        console.error("[accept-mutual-resolution] Error creating decision record", decisionError);
        throw new Error("No se pudo crear el registro de decisión");
      }
      console.log("[accept-mutual-resolution] Decision record created");

      // 14. Update appeal status
      const { error: appealUpdateError } = await supabaseClient
        .from("appeals")
        .update({ status: appealStatus })
        .eq("id", appealId);

      if (appealUpdateError) {
        console.error("[accept-mutual-resolution] Error updating appeal", appealUpdateError);
        throw new Error("No se pudo actualizar el estado de la apelación");
      }
      console.log("[accept-mutual-resolution] Appeal status updated");

      // 15. Update transaction state to completed
      const { error: txUpdateError } = await supabaseClient
        .from("transactions")
        .update({
          state: "completed",
          appeal_status: appealStatus,
          completed_at: new Date().toISOString()
        })
        .eq("id", transactionId);

      if (txUpdateError) {
        console.error("[accept-mutual-resolution] Error updating transaction", txUpdateError);
        throw new Error("No se pudo actualizar el estado de la transacción");
      }
      console.log("[accept-mutual-resolution] Transaction updated to completed");

      console.log(`[accept-mutual-resolution] SUCCESS - Mutual resolution processed for appeal ${appealId}`);

      // Send notification emails to both parties (fire and forget)
      try {
        const notifyResponse = await fetch(`${SUPABASE_URL}/functions/v1/notify-appeal-resolved`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            appealId,
            resolution,
            resolutionNotes,
            buyerRefundAmount: buyerFinalAmount,
            sellerPaymentAmount: sellerFinalAmount,
            isMutualAgreement: true,
          }),
        });
        
        if (!notifyResponse.ok) {
          console.error("[accept-mutual-resolution] Failed to send notification emails:", await notifyResponse.text());
        } else {
          console.log("[accept-mutual-resolution] Notification emails sent successfully");
        }
      } catch (notifyError) {
        console.error("[accept-mutual-resolution] Error sending notification emails:", notifyError);
        // Don't fail the resolution if notification fails
      }

      return new Response(JSON.stringify({ 
        success: true, 
        appealStatus,
        buyerRefund: buyerFinalAmount,
        sellerPayment: sellerFinalAmount,
        commissionDeducted: commissionToDeduct
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } catch (atomicError: any) {
      console.error("[accept-mutual-resolution] ATOMIC ERROR - Attempting rollback", atomicError);

      try {
        if (proposalUpdated) {
          await supabaseClient
            .from("appeal_mutual_proposals")
            .update({ status: "pending", responded_at: null })
            .eq("id", proposalId);
          console.log("[accept-mutual-resolution] ROLLBACK - Proposal reverted to pending");
        }

        if (buyerWalletUpdated) {
          await supabaseClient
            .from("wallets")
            .update({ 
              balance: originalBuyerBalance,
              blocked_balance: originalBuyerBlockedBalance
            })
            .eq("id", buyerWallet.id);
          console.log("[accept-mutual-resolution] ROLLBACK - Buyer wallet reverted");
        }

        if (sellerWalletUpdated) {
          await supabaseClient
            .from("wallets")
            .update({ balance: originalSellerBalance })
            .eq("id", sellerWallet.id);
          console.log("[accept-mutual-resolution] ROLLBACK - Seller wallet reverted");
        }

        // Also try to delete any wallet movements created for this transaction
        await supabaseClient
          .from("wallet_movements")
          .delete()
          .eq("transaction_id", transactionId)
          .in("type", ["escrow_release", "commission"])
          .eq("status", "approved");
        console.log("[accept-mutual-resolution] ROLLBACK - Wallet movements deleted");

      } catch (rollbackError) {
        console.error("[accept-mutual-resolution] CRITICAL - Rollback failed", rollbackError);
      }

      throw atomicError;
    }
  } catch (error: any) {
    console.error("[accept-mutual-resolution] Error:", error);
    return new Response(JSON.stringify({ error: error.message ?? "Error interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
