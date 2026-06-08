import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  buildThreadHeaders,
  escapeHtml,
  formatCLP,
  persistThreadAnchor,
  renderTransactionalEmail,
  sendEmail,
  txUrl,
} from "../_shared/email-templates/notification.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function isValidUuid(s: unknown): boolean {
  return typeof s === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { transactionId } = await req.json();
    if (!isValidUuid(transactionId)) {
      return new Response(JSON.stringify({ error: "Invalid transaction id" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: tx, error: txError } = await supabase
      .from("transactions")
      .select(
        "id, product_name, amount, commission, invite_code, sale_type, seller_id, profiles!transactions_seller_id_fkey(full_name,email)",
      )
      .eq("id", transactionId)
      .single();
    if (txError || !tx) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (tx.seller_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // deno-lint-ignore no-explicit-any
    const seller = tx.profiles as any;
    if (!seller?.email) {
      return new Response(JSON.stringify({ error: "Seller email missing" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const sellerName = escapeHtml(seller.full_name || "Vendedor");
    const productName = escapeHtml(tx.product_name);
    const amount = Number(tx.amount) || 0;
    const commission = Number(tx.commission) || 0;
    const sellerReceives = amount - commission;
    const referenceCode = tx.invite_code || tx.id.substring(0, 8).toUpperCase();
    const inviteLink = `${Deno.env.get("SITE_URL") || "https://trado.cl"}/join/${tx.invite_code || ""}`;

    const thread = await buildThreadHeaders(supabase, transactionId, referenceCode);

    const html = renderTransactionalEmail({
      recipientName: sellerName,
      referenceCode,
      headline: `Sala creada: ${productName}`,
      statusLine: "Sala lista · esperando al comprador",
      intro: "tu sala de escrow está lista. Comparte el enlace con tu comprador para que se una y deposite el pago.",
      summaryTitle: "Detalles de la venta",
      summaryRows: [
        { label: "Producto", value: productName },
        { label: "Paga el comprador", value: formatCLP(amount) },
        { label: "Comisión Trado", value: `−${formatCLP(commission)}` },
        { label: "Recibes al completar", value: formatCLP(sellerReceives), emphasis: true },
      ],
      nextStep:
        `Comparte el enlace de invitación con el comprador. Cuando se una y deposite, te avisamos en este mismo hilo de correo.`,
      timelineActive: "created",
      ctaText: "Ir a la sala",
      ctaUrl: txUrl(transactionId),
      secondaryCtaText: "Copiar enlace de invitación",
      secondaryCtaUrl: inviteLink,
      footerNote:
        "Te enviaremos un solo hilo de correo por esta transacción con cada paso importante: pago en custodia, envío, recepción y liberación.",
    });

    const emailResponse = await sendEmail({
      to: seller.email,
      subject: `${thread.subjectPrefix} Sala creada — esperando al comprador`,
      html,
      headers: thread.headers,
    });

    if (thread.isNewThread && thread.anchorId) {
      await persistThreadAnchor(supabase, transactionId, thread.anchorId);
    }

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("notify-transaction-created error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
