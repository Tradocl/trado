import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

interface ReqBody {
  appealId: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { appealId }: ReqBody = await req.json();
    if (!appealId) {
      return new Response(JSON.stringify({ error: "Appeal ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: appeal, error: appealError } = await supabase
      .from("appeals")
      .select(`
        id,
        initiator_id,
        transaction:transactions!appeals_transaction_id_fkey(
          id, amount, product_name, buyer_id, seller_id,
          buyer:profiles!transactions_buyer_id_fkey(email, full_name),
          seller:profiles!transactions_seller_id_fkey(email, full_name)
        )
      `)
      .eq("id", appealId)
      .single();

    if (appealError || !appeal) {
      return new Response(JSON.stringify({ error: "Appeal not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tx = Array.isArray(appeal.transaction)
      ? appeal.transaction[0]
      : appeal.transaction;
    if (!tx) {
      return new Response(
        JSON.stringify({ error: "Transaction not found for appeal" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (
      user.id !== tx.buyer_id &&
      user.id !== tx.seller_id &&
      user.id !== appeal.initiator_id
    ) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buyerProfile = Array.isArray(tx.buyer) ? tx.buyer[0] : tx.buyer;
    const sellerProfile = Array.isArray(tx.seller) ? tx.seller[0] : tx.seller;
    const buyerName = escapeHtml(buyerProfile?.full_name || "Comprador");
    const sellerName = escapeHtml(sellerProfile?.full_name || "Vendedor");
    const productName = escapeHtml(tx.product_name);
    const requesterName = user.id === tx.buyer_id ? buyerName : sellerName;
    const refCode = tx.id.substring(0, 8).toUpperCase();
    const thread = await buildThreadHeaders(supabase, tx.id, refCode);

    const buildHtml = (recipientName: string, isRequester: boolean) =>
      renderTransactionalEmail({
        recipientName,
        headline: "Apelación escalada a Trado",
        statusLine: "Intervención de administrador solicitada",
        intro: isRequester
          ? `confirmamos que <strong>solicitaste</strong> la intervención de un administrador para esta transacción.`
          : `<strong>${requesterName}</strong> solicitó la intervención de un administrador para resolver el caso.`,
        summaryTitle: "Caso en revisión",
        summaryRows: [
          { label: "Producto / servicio", value: productName },
          { label: "Monto en disputa", value: formatCLP(tx.amount), emphasis: true },
        ],
        nextStep:
          "Subí toda la evidencia que tengas (fotos, capturas, documentos). Un administrador revisará el caso y tomará una decisión imparcial en hasta 48 horas. La comisión de la transacción se cobra independientemente del resultado.",
        ctaText: "Ver caso y subir evidencia",
        ctaUrl: txUrl(tx.id),
        timelineActive: "in_delivery",
        timelineProblem: true,
        referenceCode: refCode,
        footerNote:
          "Mientras dure la revisión, los fondos permanecen en custodia de Trado.",
      });

    const subject = `${thread.subjectPrefix} Apelación escalada · ${productName}`;

    const tasks: Promise<unknown>[] = [];
    if (buyerProfile?.email) {
      tasks.push(sendEmail({
        to: buyerProfile.email,
        subject,
        html: buildHtml(buyerName, user.id === tx.buyer_id),
        headers: thread.headers,
      }));
    }
    if (sellerProfile?.email) {
      tasks.push(sendEmail({
        to: sellerProfile.email,
        subject,
        html: buildHtml(sellerName, user.id === tx.seller_id),
        headers: thread.headers,
      }));
    }

    // Admin notice (separate, not threaded into user thread)
    const adminHtml = renderTransactionalEmail({
      recipientName: "equipo Trado",
      headline: "Nueva apelación pendiente",
      statusLine: "Requiere arbitraje",
      summaryTitle: "Resumen del caso",
      summaryRows: [
        { label: "Referencia", value: `#${refCode}` },
        { label: "Producto", value: productName },
        { label: "Monto", value: formatCLP(tx.amount), emphasis: true },
        { label: "Comprador", value: `${buyerName} (${escapeHtml(buyerProfile?.email || "—")})` },
        { label: "Vendedor", value: `${sellerName} (${escapeHtml(sellerProfile?.email || "—")})` },
        { label: "Solicitado por", value: requesterName },
      ],
      ctaText: "Revisar caso",
      ctaUrl: txUrl(tx.id),
    });
    tasks.push(sendEmail({
      to: "admin@trado.cl",
      subject: `[Admin] Apelación escalada · #${refCode}`,
      html: adminHtml,
    }));

    await Promise.all(tasks);

    if (thread.isNewThread && thread.anchorId) {
      await persistThreadAnchor(supabase, tx.id, thread.anchorId);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-appeal-escalation]", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
