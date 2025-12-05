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
      return new Response(JSON.stringify({ error: "Faltan parámetros requeridos" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`[accept-mutual-resolution] Processing proposal: ${proposalId}, appeal: ${appealId}, user: ${userId}`);

    // Get the proposal
    const { data: proposal, error: proposalError } = await supabaseClient
      .from("appeal_mutual_proposals")
      .select("*")
      .eq("id", proposalId)
      .eq("appeal_id", appealId)
      .single();

    if (proposalError || !proposal) {
      console.error("[accept-mutual-resolution] Error fetching proposal", proposalError);
      throw new Error("Propuesta no encontrada");
    }

    // Verify proposal is pending
    if (proposal.status !== "pending") {
      throw new Error("La propuesta ya no está pendiente");
    }

    // Verify user is not the proposer (must be the other party)
    if (proposal.proposer_id === userId) {
      throw new Error("No puedes aceptar tu propia propuesta");
    }

    // Get transaction to verify parties
    const { data: tx, error: txError } = await supabaseClient
      .from("transactions")
      .select("id, buyer_id, seller_id, amount")
      .eq("id", transactionId)
      .single();

    if (txError || !tx) {
      console.error("[accept-mutual-resolution] Error fetching transaction", txError);
      throw new Error("Transacción no encontrada");
    }

    // Verify user is either buyer or seller
    if (tx.buyer_id !== userId && tx.seller_id !== userId) {
      throw new Error("No autorizado - no eres parte de esta transacción");
    }

    // Validate amounts against transaction total
    const totalAmount = Number(tx.amount);
    const buyerAmount = Number(proposal.buyer_amount);
    const sellerAmount = Number(proposal.seller_amount);

    if (buyerAmount + sellerAmount > totalAmount) {
      console.error(`[accept-mutual-resolution] Invalid amounts: buyer=${buyerAmount}, seller=${sellerAmount}, total=${totalAmount}`);
      throw new Error("Los montos propuestos exceden el total de la transacción");
    }

    console.log(`[accept-mutual-resolution] Amounts validated: buyer=${buyerAmount}, seller=${sellerAmount}, total=${totalAmount}`);

    // 1. Update proposal status
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

    // 2. Get wallets for both parties
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
      throw new Error("No se encontraron las billeteras");
    }

    // 3. Update wallets and create movements
    if (buyerAmount > 0) {
      const newBuyerBalance = Number(buyerWallet.balance) + buyerAmount;
      
      const { error: updateBuyerError } = await supabaseClient
        .from("wallets")
        .update({ balance: newBuyerBalance })
        .eq("id", buyerWallet.id);

      if (updateBuyerError) {
        console.error("[accept-mutual-resolution] Error updating buyer wallet", updateBuyerError);
        throw new Error("No se pudo actualizar la billetera del comprador");
      }

      const { error: buyerMovementError } = await supabaseClient
        .from("wallet_movements")
        .insert({
          wallet_id: buyerWallet.id,
          type: "refund",
          amount: buyerAmount,
          balance_after: newBuyerBalance,
          status: "approved",
          description: "Acuerdo mutuo - Reembolso",
        });

      if (buyerMovementError) {
        console.error("[accept-mutual-resolution] Error creating buyer movement", buyerMovementError);
      }

      console.log(`[accept-mutual-resolution] Buyer wallet updated: ${buyerWallet.balance} -> ${newBuyerBalance}`);
    }

    if (sellerAmount > 0) {
      const newSellerBalance = Number(sellerWallet.balance) + sellerAmount;
      
      const { error: updateSellerError } = await supabaseClient
        .from("wallets")
        .update({ balance: newSellerBalance })
        .eq("id", sellerWallet.id);

      if (updateSellerError) {
        console.error("[accept-mutual-resolution] Error updating seller wallet", updateSellerError);
        throw new Error("No se pudo actualizar la billetera del vendedor");
      }

      const { error: sellerMovementError } = await supabaseClient
        .from("wallet_movements")
        .insert({
          wallet_id: sellerWallet.id,
          type: "sale_release",
          amount: sellerAmount,
          balance_after: newSellerBalance,
          status: "approved",
          description: "Acuerdo mutuo - Liberación",
        });

      if (sellerMovementError) {
        console.error("[accept-mutual-resolution] Error creating seller movement", sellerMovementError);
      }

      console.log(`[accept-mutual-resolution] Seller wallet updated: ${sellerWallet.balance} -> ${newSellerBalance}`);
    }

    // 4. Determine resolution type based on amounts
    const resolution = buyerAmount === totalAmount
      ? "reembolso_total"
      : "liberar_fondos_vendedor";

    const appealStatus = buyerAmount === totalAmount
      ? "resuelta_a_favor_comprador"
      : "resuelta_a_favor_vendedor";

    // 5. Create appeal decision record
    const { error: decisionError } = await supabaseClient
      .from("appeal_decisions")
      .insert({
        appeal_id: appealId,
        resolution,
        buyer_refund_amount: buyerAmount,
        seller_payment_amount: sellerAmount,
        resolution_notes: `Acuerdo mutuo entre las partes. ${proposal.message || ""}`,
        is_mutual_agreement: true,
      });

    if (decisionError) {
      console.error("[accept-mutual-resolution] Error creating decision record", decisionError);
    }

    // 6. Update appeal status
    const { error: appealUpdateError } = await supabaseClient
      .from("appeals")
      .update({ status: appealStatus })
      .eq("id", appealId);

    if (appealUpdateError) {
      console.error("[accept-mutual-resolution] Error updating appeal", appealUpdateError);
    }

    // 7. Update transaction state to completed
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
    }

    console.log(`[accept-mutual-resolution] Successfully processed mutual resolution for appeal ${appealId}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[accept-mutual-resolution] Error:", error);
    return new Response(JSON.stringify({ error: error.message ?? "Error interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
