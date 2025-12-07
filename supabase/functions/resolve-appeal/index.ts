import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResolveAppealRequest {
  appealId: string;
  resolution: string;
  resolutionNotes: string;
  buyerRefundAmount: number | null;
  sellerPaymentAmount: number | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to verify identity
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("User authentication failed:", userError);
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User authenticated:", user.id);

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Verify admin role server-side
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      console.error("Admin role verification failed:", roleError);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Admin role verified for user:", user.id);

    const body: ResolveAppealRequest = await req.json();
    const { appealId, resolution, resolutionNotes, buyerRefundAmount, sellerPaymentAmount } = body;

    // Validate required fields
    if (!appealId || !resolution || !resolutionNotes?.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate amounts based on resolution type
    if ((resolution === "reembolso_parcial" || resolution === "reembolso_total") && 
        (!buyerRefundAmount || buyerRefundAmount <= 0)) {
      return new Response(
        JSON.stringify({ error: "Buyer refund amount required for this resolution" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (resolution === "liberar_fondos_vendedor" && (!sellerPaymentAmount || sellerPaymentAmount <= 0)) {
      return new Response(
        JSON.stringify({ error: "Seller payment amount required for this resolution" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch appeal data
    const { data: appeal, error: appealError } = await supabaseAdmin
      .from("appeals")
      .select("*")
      .eq("id", appealId)
      .single();

    if (appealError || !appeal) {
      console.error("Appeal not found:", appealError);
      return new Response(
        JSON.stringify({ error: "Appeal not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify appeal is in a state that can be resolved
    if (!["pendiente_intervencion_plataforma", "en_revision_plataforma"].includes(appeal.status)) {
      console.error("Appeal status does not allow resolution:", appeal.status);
      return new Response(
        JSON.stringify({ error: "Appeal cannot be resolved in current state" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch transaction data
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("id", appeal.transaction_id)
      .single();

    if (transactionError || !transaction) {
      console.error("Transaction not found:", transactionError);
      return new Response(
        JSON.stringify({ error: "Transaction not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate amounts against transaction amount (don't allow more than escrow)
    const escrowAmount = transaction.amount + (transaction.commission || 0);
    const totalDistribution = (buyerRefundAmount || 0) + (sellerPaymentAmount || 0);
    
    if (totalDistribution > escrowAmount) {
      console.error("Distribution exceeds escrow:", { totalDistribution, escrowAmount });
      return new Response(
        JSON.stringify({ error: "Total distribution cannot exceed escrow amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing appeal resolution:", { appealId, resolution, buyerRefundAmount, sellerPaymentAmount });

    // Create decision record
    const { error: decisionError } = await supabaseAdmin
      .from("appeal_decisions")
      .insert({
        appeal_id: appealId,
        admin_id: user.id,
        resolution: resolution,
        resolution_notes: resolutionNotes.trim(),
        buyer_refund_amount: buyerRefundAmount,
        seller_payment_amount: sellerPaymentAmount,
      });

    if (decisionError) {
      console.error("Error creating decision:", decisionError);
      return new Response(
        JSON.stringify({ error: "Failed to create decision record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine new appeal status
    let newStatus = "cerrada";
    if (resolution === "reembolso_total") newStatus = "resuelta_a_favor_comprador";
    else if (resolution === "liberar_fondos_vendedor") newStatus = "resuelta_a_favor_vendedor";
    else if (resolution === "reembolso_parcial") newStatus = "resuelta_parcial";

    // Update appeal status
    const { error: updateAppealError } = await supabaseAdmin
      .from("appeals")
      .update({ status: newStatus })
      .eq("id", appealId);

    if (updateAppealError) {
      console.error("Error updating appeal status:", updateAppealError);
      return new Response(
        JSON.stringify({ error: "Failed to update appeal status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get buyer wallet to clear blocked balance
    const { data: buyerWallet, error: buyerWalletError } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("user_id", transaction.buyer_id)
      .single();

    if (buyerWalletError || !buyerWallet) {
      console.error("Buyer wallet not found:", buyerWalletError);
      return new Response(
        JSON.stringify({ error: "Buyer wallet not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate the amount that was blocked (escrow amount)
    const blockedAmount = escrowAmount;
    const newBuyerBlockedBalance = Math.max(0, (buyerWallet.blocked_balance || 0) - blockedAmount);

    console.log("Clearing blocked balance:", { 
      currentBlocked: buyerWallet.blocked_balance, 
      blockedAmount, 
      newBuyerBlockedBalance 
    });

    // Process buyer refund if applicable
    if (buyerRefundAmount && buyerRefundAmount > 0) {
      const newBuyerBalance = (buyerWallet.balance || 0) + buyerRefundAmount;

      const { error: updateBuyerError } = await supabaseAdmin
        .from("wallets")
        .update({ 
          balance: newBuyerBalance,
          blocked_balance: newBuyerBlockedBalance
        })
        .eq("id", buyerWallet.id);

      if (updateBuyerError) {
        console.error("Error updating buyer wallet:", updateBuyerError);
        return new Response(
          JSON.stringify({ error: "Failed to update buyer wallet" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: buyerMovementError } = await supabaseAdmin
        .from("wallet_movements")
        .insert({
          wallet_id: buyerWallet.id,
          type: "escrow_release",
          amount: buyerRefundAmount,
          balance_after: newBuyerBalance,
          description: `Reembolso por apelación - ${transaction.product_name}`,
          transaction_id: transaction.id,
          status: "approved",
        });

      if (buyerMovementError) {
        console.error("Error creating buyer wallet movement:", buyerMovementError);
      }

      console.log("Buyer refund processed:", { buyerRefundAmount, newBuyerBalance, newBuyerBlockedBalance });
    } else {
      // Still need to clear blocked balance even if no refund
      const { error: updateBuyerBlockedError } = await supabaseAdmin
        .from("wallets")
        .update({ blocked_balance: newBuyerBlockedBalance })
        .eq("id", buyerWallet.id);

      if (updateBuyerBlockedError) {
        console.error("Error clearing buyer blocked balance:", updateBuyerBlockedError);
      }
    }

    // Process seller payment if applicable
    if (sellerPaymentAmount && sellerPaymentAmount > 0) {
      const { data: sellerWallet, error: sellerWalletError } = await supabaseAdmin
        .from("wallets")
        .select("*")
        .eq("user_id", transaction.seller_id)
        .single();

      if (sellerWalletError || !sellerWallet) {
        console.error("Seller wallet not found:", sellerWalletError);
        return new Response(
          JSON.stringify({ error: "Seller wallet not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const newSellerBalance = (sellerWallet.balance || 0) + sellerPaymentAmount;

      const { error: updateSellerError } = await supabaseAdmin
        .from("wallets")
        .update({ balance: newSellerBalance })
        .eq("id", sellerWallet.id);

      if (updateSellerError) {
        console.error("Error updating seller wallet:", updateSellerError);
        return new Response(
          JSON.stringify({ error: "Failed to update seller wallet" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: sellerMovementError } = await supabaseAdmin
        .from("wallet_movements")
        .insert({
          wallet_id: sellerWallet.id,
          type: "escrow_release",
          amount: sellerPaymentAmount,
          balance_after: newSellerBalance,
          description: `Pago liberado por apelación - ${transaction.product_name}`,
          transaction_id: transaction.id,
          status: "approved",
        });

      if (sellerMovementError) {
        console.error("Error creating seller wallet movement:", sellerMovementError);
      }

      console.log("Seller payment processed:", { sellerPaymentAmount, newSellerBalance });
    }

    // Mark any pending escrow_lock movements as approved (resolved)
    const { error: escrowUpdateError } = await supabaseAdmin
      .from("wallet_movements")
      .update({ status: "approved" })
      .eq("transaction_id", transaction.id)
      .eq("type", "escrow_lock")
      .eq("status", "pending");

    if (escrowUpdateError) {
      console.error("Error updating escrow_lock movement:", escrowUpdateError);
    }

    // Update transaction state
    const { error: updateTransactionError } = await supabaseAdmin
      .from("transactions")
      .update({
        state: "completed",
        appeal_status: newStatus,
        completed_at: new Date().toISOString(),
      })
      .eq("id", transaction.id);

    if (updateTransactionError) {
      console.error("Error updating transaction:", updateTransactionError);
      return new Response(
        JSON.stringify({ error: "Failed to update transaction" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Appeal resolution completed successfully:", { appealId, newStatus });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Appeal resolved successfully",
        newStatus 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error in resolve-appeal:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
