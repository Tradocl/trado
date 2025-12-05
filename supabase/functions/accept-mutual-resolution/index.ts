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
    const { proposalId, appealId, transactionId, userId }: AcceptMutualResolutionRequest = await req.json();

    if (!proposalId || !appealId || !transactionId || !userId) {
      console.error("[accept-mutual-resolution] Missing required parameters", { proposalId, appealId, transactionId, userId });
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

    // 3. Verify user is not the proposer (must be the other party)
    if (proposal.proposer_id === userId) {
      console.error("[accept-mutual-resolution] User is the proposer", { proposer_id: proposal.proposer_id, userId });
      return new Response(JSON.stringify({ error: "No puedes aceptar tu propia propuesta" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 4. Get transaction to verify parties
    const { data: tx, error: txError } = await supabaseClient
      .from("transactions")
      .select("id, buyer_id, seller_id, amount")
      .eq("id", transactionId)
      .single();

    if (txError || !tx) {
      console.error("[accept-mutual-resolution] Error fetching transaction", txError);
      return new Response(JSON.stringify({ error: "Transacción no encontrada" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 5. Verify user is either buyer or seller
    if (tx.buyer_id !== userId && tx.seller_id !== userId) {
      console.error("[accept-mutual-resolution] User is not part of transaction", { buyer_id: tx.buyer_id, seller_id: tx.seller_id, userId });
      return new Response(JSON.stringify({ error: "No autorizado - no eres parte de esta transacción" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 6. Validate amounts against transaction total
    const totalAmount = Number(tx.amount);
    const buyerAmount = Number(proposal.buyer_amount);
    const sellerAmount = Number(proposal.seller_amount);

    if (buyerAmount + sellerAmount > totalAmount) {
      console.error(`[accept-mutual-resolution] Invalid amounts: buyer=${buyerAmount}, seller=${sellerAmount}, total=${totalAmount}`);
      return new Response(JSON.stringify({ error: "Los montos propuestos exceden el total de la transacción" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`[accept-mutual-resolution] Validation passed: buyer=${buyerAmount}, seller=${sellerAmount}, total=${totalAmount}`);

    // 7. Get wallets for both parties BEFORE making any changes
    const { data: buyerWallet, error: buyerWalletError } = await supabaseClient
      .from("wallets")
      .select("id, balance")
      .eq("user_id", tx.buyer_id)
      .single();

    const { data: sellerWallet, error: sellerWalletError } = await supabaseClient
      .from("wallets")
      .select("id, balance")
      .eq("user_id", tx.seller_id)
      .single();

    if (buyerWalletError || !buyerWallet || sellerWalletError || !sellerWallet) {
      console.error("[accept-mutual-resolution] Error fetching wallets", { buyerWalletError, sellerWalletError });
      return new Response(JSON.stringify({ error: "No se encontraron las billeteras de las partes" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`[accept-mutual-resolution] Wallets found: buyer=${buyerWallet.id}, seller=${sellerWallet.id}`);

    // === ATOMIC OPERATION STARTS HERE ===
    // We'll track what we've done so we can rollback if needed
    let proposalUpdated = false;
    let buyerWalletUpdated = false;
    let sellerWalletUpdated = false;
    const originalBuyerBalance = Number(buyerWallet.balance);
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

      // 9. Update buyer wallet if they get money
      if (buyerAmount > 0) {
        const newBuyerBalance = originalBuyerBalance + buyerAmount;
        
        const { error: updateBuyerError } = await supabaseClient
          .from("wallets")
          .update({ balance: newBuyerBalance })
          .eq("id", buyerWallet.id);

        if (updateBuyerError) {
          console.error("[accept-mutual-resolution] Error updating buyer wallet", updateBuyerError);
          throw new Error("No se pudo actualizar la billetera del comprador");
        }
        buyerWalletUpdated = true;

        // Create buyer movement
        const { error: buyerMovementError } = await supabaseClient
          .from("wallet_movements")
          .insert({
            wallet_id: buyerWallet.id,
            type: "refund",
            amount: buyerAmount,
            balance_after: newBuyerBalance,
            status: "approved",
            description: "Acuerdo mutuo - Reembolso",
            transaction_id: transactionId,
          });

        if (buyerMovementError) {
          console.error("[accept-mutual-resolution] Error creating buyer movement", buyerMovementError);
          // Movement is not critical, continue
        }

        console.log(`[accept-mutual-resolution] Buyer wallet updated: ${originalBuyerBalance} -> ${newBuyerBalance}`);
      }

      // 10. Update seller wallet if they get money
      if (sellerAmount > 0) {
        const newSellerBalance = originalSellerBalance + sellerAmount;
        
        const { error: updateSellerError } = await supabaseClient
          .from("wallets")
          .update({ balance: newSellerBalance })
          .eq("id", sellerWallet.id);

        if (updateSellerError) {
          console.error("[accept-mutual-resolution] Error updating seller wallet", updateSellerError);
          throw new Error("No se pudo actualizar la billetera del vendedor");
        }
        sellerWalletUpdated = true;

        // Create seller movement
        const { error: sellerMovementError } = await supabaseClient
          .from("wallet_movements")
          .insert({
            wallet_id: sellerWallet.id,
            type: "sale_release",
            amount: sellerAmount,
            balance_after: newSellerBalance,
            status: "approved",
            description: "Acuerdo mutuo - Liberación",
            transaction_id: transactionId,
          });

        if (sellerMovementError) {
          console.error("[accept-mutual-resolution] Error creating seller movement", sellerMovementError);
          // Movement is not critical, continue
        }

        console.log(`[accept-mutual-resolution] Seller wallet updated: ${originalSellerBalance} -> ${newSellerBalance}`);
      }

      // 11. Determine resolution type based on amounts
      const resolution = buyerAmount === totalAmount
        ? "reembolso_total"
        : buyerAmount > 0 && sellerAmount > 0
          ? "reembolso_parcial"
          : "liberar_fondos_vendedor";

      const appealStatus = buyerAmount === totalAmount
        ? "resuelta_a_favor_comprador"
        : buyerAmount > 0 && sellerAmount > 0
          ? "resuelta_parcial"
          : "resuelta_a_favor_vendedor";

      console.log(`[accept-mutual-resolution] Resolution: ${resolution}, Appeal status: ${appealStatus}`);

      // 12. Create appeal decision record (using service role, bypasses RLS)
      const { error: decisionError } = await supabaseClient
        .from("appeal_decisions")
        .insert({
          appeal_id: appealId,
          resolution,
          buyer_refund_amount: buyerAmount,
          seller_payment_amount: sellerAmount,
          resolution_notes: `Acuerdo mutuo entre las partes. ${proposal.message || ""}`.trim(),
          is_mutual_agreement: true,
          admin_id: null, // No admin involved in mutual agreement
        });

      if (decisionError) {
        console.error("[accept-mutual-resolution] Error creating decision record", decisionError);
        throw new Error("No se pudo crear el registro de decisión");
      }
      console.log("[accept-mutual-resolution] Decision record created");

      // 13. Update appeal status
      const { error: appealUpdateError } = await supabaseClient
        .from("appeals")
        .update({ status: appealStatus })
        .eq("id", appealId);

      if (appealUpdateError) {
        console.error("[accept-mutual-resolution] Error updating appeal", appealUpdateError);
        throw new Error("No se pudo actualizar el estado de la apelación");
      }
      console.log("[accept-mutual-resolution] Appeal status updated");

      // 14. Update transaction state to completed
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

      return new Response(JSON.stringify({ success: true, appealStatus }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } catch (atomicError: any) {
      // ROLLBACK: Try to revert changes if something failed
      console.error("[accept-mutual-resolution] ATOMIC ERROR - Attempting rollback", atomicError);

      try {
        // Revert proposal status
        if (proposalUpdated) {
          await supabaseClient
            .from("appeal_mutual_proposals")
            .update({ status: "pending", responded_at: null })
            .eq("id", proposalId);
          console.log("[accept-mutual-resolution] ROLLBACK - Proposal reverted to pending");
        }

        // Revert buyer wallet
        if (buyerWalletUpdated) {
          await supabaseClient
            .from("wallets")
            .update({ balance: originalBuyerBalance })
            .eq("id", buyerWallet.id);
          console.log("[accept-mutual-resolution] ROLLBACK - Buyer wallet reverted");
        }

        // Revert seller wallet
        if (sellerWalletUpdated) {
          await supabaseClient
            .from("wallets")
            .update({ balance: originalSellerBalance })
            .eq("id", sellerWallet.id);
          console.log("[accept-mutual-resolution] ROLLBACK - Seller wallet reverted");
        }
      } catch (rollbackError) {
        console.error("[accept-mutual-resolution] ROLLBACK FAILED", rollbackError);
      }

      return new Response(JSON.stringify({ error: atomicError.message || "Error al procesar el acuerdo" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

  } catch (error: any) {
    console.error("[accept-mutual-resolution] UNEXPECTED ERROR:", error);
    return new Response(JSON.stringify({ error: error.message ?? "Error interno del servidor" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
