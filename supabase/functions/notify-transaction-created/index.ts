import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  OPS_ALERT_EMAIL,
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

const TIPOS: Record<string, string> = {
  producto_envio: "Venta con envío",
  producto_persona: "Venta en persona",
  producto_digital: "Entrada o producto digital",
  servicio: "Trabajo o servicio",
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
        "id, product_name, amount, commission, invite_code, sale_type, initiator_role, seller_id, profiles!transactions_seller_id_fkey(full_name,email)",
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
    const referenceCode = tx.id.substring(0, 8).toUpperCase();
    const siteUrl = Deno.env.get("SITE_URL") || "https://trado.cl";
    // El link de invitación es /invite/<id>: el viejo /join/<código> no existe y daba 404
    const inviteLink = `${siteUrl}/invite/${tx.id}`;
    // Quien crea la sala queda en seller_id; initiator_role dice si en verdad vende o compra
    const creaComprador = tx.initiator_role === "buyer";
    const sinComision = commission === 0;
    const otraParte = tx.sale_type === "servicio"
      ? (creaComprador ? "a quien hará el trabajo" : "a tu cliente")
      : (creaComprador ? "al vendedor" : "a tu comprador");
    const tipo = TIPOS[String(tx.sale_type)] ?? "Sala";
    const mensajeWhatsApp =
      `¡Hola! Creé una sala en Trado para *${tx.product_name}* (${formatCLP(amount)}). ` +
      `La plata queda retenida hasta que se entrega lo acordado. Únete aquí: ${inviteLink}` +
      (tx.invite_code ? `\n\nSi el link no abre, entra a ${siteUrl}/join-transaction y usa el código ${tx.invite_code}` : "");
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(mensajeWhatsApp)}`;
    const thread = await buildThreadHeaders(supabase, transactionId, referenceCode);
    const html = renderTransactionalEmail({
      recipientName: sellerName,
      referenceCode,
      eyebrow: tipo,
      headline: `Tu sala está lista: ${productName}`,
      statusLine: creaComprador ? "Esperando que el vendedor se una" : "Esperando que el comprador se una y pague",
      tone: "celebrate",
      intro: `ya creaste tu sala. Ahora mándale el link ${otraParte}: cuando se una${creaComprador ? " podrás pagar y la plata quedará retenida" : " y pague, la plata queda retenida en Trado"} hasta que se entregue lo acordado.`,
      summaryTitle: "Resumen de la sala",
      summaryRows: creaComprador
        ? [
          { label: tx.sale_type === "servicio" ? "Trabajo" : "Producto", value: productName },
          { label: "Precio", value: formatCLP(amount) },
          { label: "Comisión Trado", value: sinComision ? "$0 · tu primera sala" : formatCLP(commission) },
          { label: "Pagas en total", value: formatCLP(amount + commission), emphasis: true },
        ]
        : [
          { label: tx.sale_type === "servicio" ? "Trabajo" : "Producto", value: productName },
          { label: "Paga quien compra", value: formatCLP(amount) },
          { label: "Comisión Trado", value: sinComision ? "$0 · tu primera sala" : `−${formatCLP(commission)}` },
          { label: "Recibes al completar", value: formatCLP(amount - commission), emphasis: true },
        ],
      nextStep:
        `Lo más rápido: mándale el link por WhatsApp con el botón de abajo. ${tx.invite_code ? `Si no le abre, puede unirse con el código <strong>${escapeHtml(tx.invite_code)}</strong>.` : ""} Te avisamos en este mismo hilo cuando se una.`,
      timelineActive: "created",
      ctaText: "Mandar por WhatsApp",
      ctaUrl: whatsappUrl,
      secondaryCtaText: "Ir a mi sala",
      secondaryCtaUrl: txUrl(transactionId),
      footerNote:
        "Te enviaremos un solo hilo de correo por esta sala con cada paso importante: pago retenido, entrega, recepción y liberación.",
    });

    const emailResponse = await sendEmail({
      to: seller.email,
      subject: buildThreadSubject(thread, tx.product_name),
      html,
      headers: thread.headers,
    });

    if (thread.isNewThread && thread.anchorId) {
      await persistThreadAnchor(supabase, transactionId, thread.anchorId);
    }

    // Copia operativa al equipo: hasta ahora nadie adentro se enteraba de que se
    // abría una sala. Va al final y envuelto: si falla, el correo al vendedor ya
    // salió y eso es lo que importa.
    try {
      await sendEmail({
        to: OPS_ALERT_EMAIL(),
        subject: `[Sala nueva] ${tx.product_name} · ${formatCLP(Number(tx.amount))}`,
        html: renderTransactionalEmail({
          recipientName: "equipo Trado",
          headline: "Se abrió una sala",
          eyebrow: "Seguimiento operativo",
          statusLine: "Esperando que el comprador se una",
          tone: "info",
          summaryTitle: "Detalles",
          summaryRows: [
            { label: "Producto", value: escapeHtml(tx.product_name) },
            { label: "Monto", value: formatCLP(Number(tx.amount)), emphasis: true },
            { label: "Creada por", value: escapeHtml(seller.full_name || seller.email || "—") },
            { label: "Tipo", value: TIPOS[String(tx.sale_type)] ?? escapeHtml(String(tx.sale_type ?? "—")) },
            { label: "Creada por el", value: tx.initiator_role === "buyer" ? "Comprador" : "Vendedor" },
          ],
          ctaText: "Ver la sala",
          ctaUrl: txUrl(transactionId),
        }),
      });
    } catch (opsErr) {
      console.error("[notify-transaction-created] ops alert failed (non-blocking):", opsErr);
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
