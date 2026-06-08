import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildThreadHeaders,
  buildThreadSubject,
  escapeHtml,
  formatCLP,
  persistThreadAnchor,
  renderTransactionalEmail,
  sendEmail,
  txUrl,
  walletUrl,
} from "../_shared/email-templates/notification.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentInstructionsRequest {
  transactionId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { transactionId }: PaymentInstructionsRequest = await req.json();

    if (!transactionId) {
      return new Response(
        JSON.stringify({ error: "Transaction ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select(`
        id,
        amount,
        commission,
        product_name,
        invite_code,
        sale_type,
        buyer_id,
        seller_id,
        buyer:profiles!transactions_buyer_id_fkey(email, full_name),
        seller:profiles!transactions_seller_id_fkey(email, full_name)
      `)
      .eq("id", transactionId)
      .single();

    if (txError || !transaction) {
      return new Response(
        JSON.stringify({ error: "Transaction not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (user.id !== transaction.buyer_id && user.id !== transaction.seller_id) {
      return new Response(
        JSON.stringify({ error: "Not authorized for this transaction" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const buyerProfile = Array.isArray(transaction.buyer) ? transaction.buyer[0] : transaction.buyer;
    const sellerProfile = Array.isArray(transaction.seller) ? transaction.seller[0] : transaction.seller;
    const buyerEmail = buyerProfile?.email;
    const buyerName = buyerProfile?.full_name || "Comprador";
    const sellerName = sellerProfile?.full_name || "la otra parte";
    const referenceCode = transaction.id.substring(0, 8).toUpperCase();
    const totalAmount = transaction.amount;
    const commission = transaction.commission || 0;
    const productName = transaction.product_name;
    const saleType = transaction.sale_type;

    if (!buyerEmail) {
      return new Response(
        JSON.stringify({ error: "Buyer email not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transactionUrl = txUrl(transactionId);


    const saleTypeLabel =
      saleType === "service"
        ? "el servicio"
        : saleType === "in_person_product"
        ? "el producto (entrega presencial)"
        : saleType === "shipped_product"
        ? "el producto (envío)"
        : "la transacción";

    const safeBuyerName = escapeHtml(buyerName);
    const safeSellerName = escapeHtml(sellerName);
    const safeProduct = escapeHtml(productName);
    const itemWord = saleType === "service" ? "el servicio" : "el producto";

    const intro = `ya estás dentro de la sala de escrow con <strong>${safeSellerName}</strong> por ${saleTypeLabel}: <strong>${safeProduct}</strong>.`;

    const summaryRows = [
      { label: "Transacción", value: safeProduct },
      { label: "Vendedor", value: safeSellerName },
      { label: "Monto total a pagar", value: formatCLP(totalAmount), emphasis: true },
    ];
    if (commission > 0) {
      summaryRows.push({ label: "Incluye comisión Trado", value: formatCLP(commission) });
    }

    const nextStep = `
      <ol style="margin:8px 0 0;padding-left:20px;font-size:14px;line-height:1.7;color:#0F1424;">
        <li><strong>Revisa tu saldo en la sala.</strong> Si ya tienes saldo suficiente en tu billetera Trado, puedes pagar desde ahí.</li>
        <li><strong>Si no tienes saldo, recárgalo</strong> en Mi Billetera con nuestra pasarela segura (tarjeta, débito y otros medios).</li>
        <li><strong>Vuelve a la sala y confirma el pago.</strong> El monto queda en custodia: ${safeSellerName} no recibe nada hasta que tú confirmes la entrega.</li>
        <li><strong>Recibes ${itemWord}</strong> y revisas que todo esté como acordaron.</li>
        <li><strong>Confirmas la recepción</strong> y se libera el pago al vendedor.</li>
      </ol>`;

    const thread = await buildThreadHeaders(supabase, transactionId, referenceCode);

    const html = renderTransactionalEmail({
      recipientName: safeBuyerName,
      eyebrow: "Te uniste a una sala Trado",
      headline: `¡Listo ${safeBuyerName}! Ya estás dentro de la sala`,
      statusLine: "Comprador unido",
      intro,
      summaryTitle: "Detalle de la transacción",
      summaryRows,
      nextStep,
      timelineActive: "invited",
      ctaText: "Ir a la sala",
      ctaUrl: txUrl(transactionId),
      secondaryCtaText: "Recargar saldo en Mi Billetera",
      secondaryCtaUrl: walletUrl(),
      referenceCode,
      footerNote: "Si algo no llega como acordaron, puedes abrir una disputa desde la misma sala y nuestro equipo media para resolverlo.",
      tone: "info",
    });

    const data = await sendEmail({
      to: buyerEmail,
      subject: buildThreadSubject(thread, productName),
      html,
      headers: thread.headers,
    });

    if (thread.isNewThread && thread.anchorId) {
      await persistThreadAnchor(supabase, transactionId, thread.anchorId);
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-payment-instructions function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
