import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireServiceRole } from "../_shared/auth.ts";
import {
  buildThreadHeaders,
  buildThreadSubject,
  escapeHtml,
  formatCLP,
  persistThreadAnchor,
  renderTransactionalEmail,
  sendEmail,
  SITE_URL,
  txUrl,
  walletUrl,
} from "../_shared/email-templates/notification.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReqBody {
  buyerEmail: string;
  buyerName: string;
  sellerEmail: string;
  sellerName: string;
  productName: string;
  amount: number;
  commission: number;
  transactionId: string;
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
    const b: ReqBody = await req.json();
    if (!b.buyerEmail || !b.sellerEmail || !b.productName || !b.amount) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const productName = escapeHtml(b.productName);
    const buyerName = escapeHtml(b.buyerName || "Comprador");
    const sellerName = escapeHtml(b.sellerName || "Vendedor");
    const commission = b.commission ?? Math.round(b.amount * 0.05);
    const sellerNet = b.amount - commission;
    const refCode = b.transactionId.substring(0, 8).toUpperCase();

    const thread = await buildThreadHeaders(
      supabase,
      b.transactionId,
      refCode,
    );

    const buyerHtml = renderTransactionalEmail({
      recipientName: buyerName,
      headline: "Transacción completada",
      statusLine: "Pago liberado al vendedor",
      intro:
        `confirmaste la recepción de <strong>${productName}</strong>. La transacción quedó cerrada exitosamente.`,
      summaryTitle: "Detalles",
      summaryRows: [
        { label: "Producto / servicio", value: productName },
        { label: "Vendedor", value: sellerName },
        { label: "Monto pagado", value: formatCLP(b.amount), emphasis: true },
      ],
      nextStep:
        "Si lo deseas, calificá al vendedor para ayudar a la comunidad Trado.",
      ctaText: "Dejar calificación",
      ctaUrl: txUrl(b.transactionId),
      timelineActive: "completed",
      referenceCode: refCode,
      footerNote:
        "Guarda este correo como respaldo de tu transacción. Si necesitás ayuda, escribinos a soporte@trado.cl.",
    });

    const sellerHtml = renderTransactionalEmail({
      recipientName: sellerName,
      headline: "¡Venta liberada a tu billetera!",
      statusLine: "Saldo disponible en tu cuenta Trado",
      intro:
        `el comprador confirmó la recepción de <strong>${productName}</strong> y los fondos ya están disponibles en tu billetera.`,
      summaryTitle: "Liquidación",
      summaryRows: [
        { label: "Monto bruto", value: formatCLP(b.amount) },
        { label: "Comisión Trado", value: `- ${formatCLP(commission)}` },
        { label: "Total recibido", value: formatCLP(sellerNet), emphasis: true },
      ],
      nextStep:
        "Puedes solicitar el retiro a tu cuenta bancaria desde Mi Billetera cuando quieras.",
      ctaText: "Ir a Mi Billetera",
      ctaUrl: walletUrl(),
      secondaryCtaText: "Ver detalle de la venta",
      secondaryCtaUrl: txUrl(b.transactionId),
      timelineActive: "completed",
      referenceCode: refCode,
    });

    const subject = buildThreadSubject(thread, productName);

    const [buyerRes, sellerRes] = await Promise.all([
      sendEmail({
        to: b.buyerEmail,
        subject,
        html: buyerHtml,
        headers: thread.headers,
      }),
      sendEmail({
        to: b.sellerEmail,
        subject,
        html: sellerHtml,
        headers: thread.headers,
      }),
    ]);

    if (thread.isNewThread && thread.anchorId) {
      await persistThreadAnchor(supabase, b.transactionId, thread.anchorId);
    }

    return new Response(
      JSON.stringify({ success: true, buyer: buyerRes, seller: sellerRes }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[notify-transaction-completed]", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
