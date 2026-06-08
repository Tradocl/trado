import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireServiceRole } from "../_shared/auth.ts";
import {
  buildThreadHeaders,
  buildThreadSubject,
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
  resolution: string;
  resolutionNotes: string;
  buyerRefundAmount: number | null;
  sellerPaymentAmount: number | null;
  isMutualAgreement: boolean;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const authFail = await requireServiceRole(req);
  if (authFail) {
    return new Response(authFail.body, {
      status: authFail.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const body: ReqBody = await req.json();
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: appeal, error } = await supabase
      .from("appeals")
      .select(
        "*, transactions!inner(id, product_name, amount, seller_id, buyer_id)",
      )
      .eq("id", body.appealId)
      .single();
    if (error || !appeal) {
      return new Response(JSON.stringify({ error: "Appeal not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const tx = appeal.transactions;

    const [{ data: buyer }, { data: seller }] = await Promise.all([
      supabase.from("profiles").select("full_name, email").eq("id", tx.buyer_id).single(),
      supabase.from("profiles").select("full_name, email").eq("id", tx.seller_id).single(),
    ]);
    if (!buyer || !seller) {
      return new Response(JSON.stringify({ error: "Profiles not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let label = "Caso cerrado";
    if (body.resolution === "reembolso_total") label = "Reembolso total al comprador";
    else if (body.resolution === "liberar_fondos_vendedor") label = "Fondos liberados al vendedor";
    else if (body.resolution === "reembolso_parcial") label = "Resolución parcial";

    const productName = escapeHtml(tx.product_name);
    const refCode = tx.id.substring(0, 8).toUpperCase();
    const thread = await buildThreadHeaders(supabase, tx.id, refCode);

    const buildHtml = (recipientName: string, role: "buyer" | "seller") => {
      const yourAmount = role === "buyer" ? body.buyerRefundAmount : body.sellerPaymentAmount;
      const yourLabel = role === "buyer" ? "Reembolso a tu billetera" : "Pago a tu billetera";
      const summary = [
        { label: "Producto / servicio", value: productName },
        { label: "Monto original", value: formatCLP(tx.amount) },
        { label: "Decisión", value: label },
      ];
      if (body.buyerRefundAmount && body.buyerRefundAmount > 0) {
        summary.push({ label: "Reembolso comprador", value: formatCLP(body.buyerRefundAmount) });
      }
      if (body.sellerPaymentAmount && body.sellerPaymentAmount > 0) {
        summary.push({ label: "Pago vendedor", value: formatCLP(body.sellerPaymentAmount) });
      }
      if (yourAmount && yourAmount > 0) {
        summary.push({ label: yourLabel, value: formatCLP(yourAmount), emphasis: true });
      }
      return renderTransactionalEmail({
        recipientName,
        headline: body.isMutualAgreement
          ? "Acuerdo mutuo confirmado"
          : "Apelación resuelta",
        statusLine: body.isMutualAgreement
          ? "Ambas partes llegaron a un acuerdo"
          : "Resolución del administrador",
        intro: body.isMutualAgreement
          ? "ambas partes acordaron una distribución de fondos. Ya quedó aplicada en tu billetera."
          : "un administrador resolvió la apelación de tu transacción y los fondos fueron distribuidos.",
        summaryTitle: "Detalles de la resolución",
        summaryRows: summary,
        nextStep: body.resolutionNotes
          ? `<em>"${escapeHtml(body.resolutionNotes)}"</em>`
          : "Los fondos fueron actualizados en tu billetera Trado.",
        ctaText: "Ver mi billetera",
        ctaUrl: `${Deno.env.get("SITE_URL") || "https://trado.cl"}/wallet`,
        secondaryCtaText: "Ver transacción",
        secondaryCtaUrl: txUrl(tx.id),
        timelineActive: "completed",
        referenceCode: refCode,
      });
    };

    const subject = buildThreadSubject(thread, tx.product_name);

    await Promise.all([
      sendEmail({
        to: buyer.email,
        subject,
        html: buildHtml(escapeHtml(buyer.full_name || "Comprador"), "buyer"),
        headers: thread.headers,
      }),
      sendEmail({
        to: seller.email,
        subject,
        html: buildHtml(escapeHtml(seller.full_name || "Vendedor"), "seller"),
        headers: thread.headers,
      }),
    ]);

    if (thread.isNewThread && thread.anchorId) {
      await persistThreadAnchor(supabase, tx.id, thread.anchorId);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-appeal-resolved]", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
