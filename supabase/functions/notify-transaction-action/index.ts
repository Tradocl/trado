import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendPushToUsers } from "../_shared/push.ts";
import {
  appealUrl,
  buildThreadHeaders,
  buildThreadSubject,
  escapeHtml,
  formatCLP,
  persistThreadAnchor,
  renderTransactionalEmail,
  sendEmail,
  SITE_URL,
  type TimelineKey,
  txUrl,
  walletUrl,
} from "../_shared/email-templates/notification.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ActionRequest {
  transactionId: string;
  actionType: string;
  actorId?: string;
  additionalData?: Record<string, unknown>;
}

interface ActionCfg {
  headline: (actorName: string, productName: string) => string;
  status?: string;
  next: (actorName: string, productName: string, d: Record<string, unknown>) => string;
  ctaText: string;
  ctaUrlFor: (txId: string, d: Record<string, unknown>) => string;
  timeline?: TimelineKey;
  timelineProblem?: boolean;
  audience?: "other" | "actor" | "both";
}

const A: Record<string, ActionCfg> = {
  buyer_joined: {
    headline: (a, p) => `${a} se unió a la sala de ${p}`,
    status: "Comprador unido a la sala",
    next: (a) => `Esperamos que <strong>${a}</strong> deposite el pago en custodia. Te avisamos en cuanto esté listo.`,
    ctaText: "Ir a la sala",
    ctaUrlFor: (id) => txUrl(id),
    timeline: "invited",
  },
  funds_deposited: {
    headline: (_a, p) => `Fondos en custodia para ${p}`,
    status: "Pago asegurado por Trado",
    next: (_a, _p, d) => {
      const t = (d.saleType as string) || "";
      if (t === "service") {
        return "Puedes realizar el servicio. Cuando termines, márcalo desde la sala para que el comprador confirme.";
      }
      if (t === "in_person_product") {
        return "Coordina con el comprador la fecha y lugar de entrega desde la sala. Una vez entregado, el comprador confirma y se liberan los fondos.";
      }
      return "Envía el producto y registra el seguimiento desde la sala. Cuando el comprador reciba y confirme, se liberan los fondos.";
    },
    ctaText: "Ir a la sala",
    ctaUrlFor: (id) => txUrl(id),
    timeline: "funds_secured",
  },
  marked_shipped: {
    headline: (_a, p) => `Tu producto va en camino: ${p}`,
    status: "Envío en curso",
    next: (_a, _p, d) => {
      const t = d.trackingInfo ? `Seguimiento: <strong>${escapeHtml(String(d.trackingInfo))}</strong>. ` : "";
      return `${t}Cuando recibas el producto, revísalo y confirma la entrega desde la sala para liberar el pago.`;
    },
    ctaText: "Ver seguimiento",
    ctaUrlFor: (id) => txUrl(id),
    timeline: "in_delivery",
  },
  marked_received: {
    headline: (a, p) => `${a} recibió ${p}`,
    status: "Producto recibido, en revisión",
    next: () => "El comprador está revisando que todo esté bien. Si pasa el plazo o confirma, los fondos se liberan a tu billetera.",
    ctaText: "Ver transacción",
    ctaUrlFor: (id) => txUrl(id),
    timeline: "awaiting_buyer_review",
  },
  funds_released: {
    headline: (_a, p) => `Pago liberado: ${p}`,
    status: "Venta completada",
    next: (_a, _p, d) => {
      const amount = d.amount ? formatCLP(Number(d.amount)) : null;
      return amount
        ? `Recibiste <strong>${amount}</strong> en tu billetera Trado. Puedes retirarlo a tu cuenta bancaria cuando quieras.`
        : "Los fondos ya están en tu billetera Trado.";
    },
    ctaText: "Ver mi billetera",
    ctaUrlFor: () => walletUrl(),
    timeline: "completed",
  },
  meeting_proposed: {
    headline: (a, p) => `${a} propone un encuentro para ${p}`,
    status: "Nueva propuesta de encuentro",
    next: (_a, _p, d) => {
      const loc = d.location ? `Lugar: <strong>${escapeHtml(String(d.location))}</strong>. ` : "";
      const dt = d.datetime ? `Fecha: <strong>${escapeHtml(String(d.datetime))}</strong>. ` : "";
      return `${loc}${dt}Acepta, rechaza o propón otra alternativa desde la sala.`;
    },
    ctaText: "Ver propuesta",
    ctaUrlFor: (id) => txUrl(id),
    timeline: "funds_secured",
  },
  meeting_accepted: {
    headline: (a, p) => `${a} aceptó el encuentro para ${p}`,
    status: "Encuentro confirmado",
    next: () => "Coordinen la entrega en el lugar y fecha acordados. Cuando se concrete, el comprador confirma en la sala y se liberan los fondos.",
    ctaText: "Ver detalles",
    ctaUrlFor: (id) => txUrl(id),
    timeline: "in_delivery",
  },
  meeting_rejected: {
    headline: (a, p) => `${a} rechazó el encuentro para ${p}`,
    status: "Propuesta rechazada",
    next: () => "Puedes proponer otra fecha o lugar desde la sala.",
    ctaText: "Proponer nueva fecha",
    ctaUrlFor: (id) => txUrl(id),
    timeline: "funds_secured",
  },
  appeal_created: {
    headline: (a, p) => `${a} abrió una disputa por ${p}`,
    status: "Disputa abierta · 48h para negociar",
    next: (_a, _p, d) => {
      const r = d.reason ? `Motivo: <strong>${escapeHtml(String(d.reason))}</strong>. ` : "";
      return `${r}Tienen 48 horas para llegar a un acuerdo mutuo. Sube evidencia y propón una resolución desde la sala de la disputa.`;
    },
    ctaText: "Ver disputa",
    ctaUrlFor: (_id, d) => d.appealId ? appealUrl(String(d.appealId)) : txUrl(_id),
    timeline: "awaiting_buyer_review",
    timelineProblem: true,
  },
  appeal_evidence_uploaded: {
    headline: (a, p) => `${a} subió evidencia a la disputa de ${p}`,
    next: () => "Revisa la nueva evidencia y, si quieres, sube la tuya o envía una propuesta de acuerdo.",
    ctaText: "Ver evidencia",
    ctaUrlFor: (_id, d) => d.appealId ? appealUrl(String(d.appealId)) : txUrl(_id),
    timeline: "awaiting_buyer_review",
    timelineProblem: true,
  },
  appeal_escalated: {
    headline: (_a, p) => `Disputa de ${p} escalada a Trado`,
    status: "En revisión por un administrador",
    next: () => "Un mediador de Trado revisará el caso, leerá la evidencia y el chat, y tomará una decisión imparcial. Sube ahora toda la evidencia que tengas.",
    ctaText: "Ver disputa",
    ctaUrlFor: (_id, d) => d.appealId ? appealUrl(String(d.appealId)) : txUrl(_id),
    timeline: "awaiting_buyer_review",
    timelineProblem: true,
  },
  appeal_proposal_sent: {
    headline: (a, p) => `${a} te envió una propuesta de acuerdo por ${p}`,
    status: "Propuesta de acuerdo mutuo",
    next: (_a, _p, d) => {
      const dist = d.distribution ? `Propuesta: <strong>${escapeHtml(String(d.distribution))}</strong>. ` : "";
      return `${dist}Acepta, rechaza o envía una contra-propuesta desde la disputa.`;
    },
    ctaText: "Ver propuesta",
    ctaUrlFor: (_id, d) => d.appealId ? appealUrl(String(d.appealId)) : txUrl(_id),
    timeline: "awaiting_buyer_review",
    timelineProblem: true,
  },
  appeal_proposal_rejected: {
    headline: (a, p) => `${a} rechazó tu propuesta de acuerdo por ${p}`,
    next: () => "Puedes enviar una contra-propuesta o escalar el caso a un administrador de Trado.",
    ctaText: "Ver disputa",
    ctaUrlFor: (_id, d) => d.appealId ? appealUrl(String(d.appealId)) : txUrl(_id),
    timeline: "awaiting_buyer_review",
    timelineProblem: true,
  },
  appeal_proposal_cancelled: {
    headline: (a, p) => `${a} canceló su propuesta de acuerdo por ${p}`,
    next: () => "Puedes enviar tu propia propuesta o seguir conversando en la disputa.",
    ctaText: "Ver disputa",
    ctaUrlFor: (_id, d) => d.appealId ? appealUrl(String(d.appealId)) : txUrl(_id),
    timeline: "awaiting_buyer_review",
    timelineProblem: true,
  },
  appeal_resolved: {
    headline: (_a, p) => `Disputa resuelta: ${p}`,
    status: "Caso cerrado",
    next: (_a, _p, d) => {
      const r = d.resolution ? `Resolución: <strong>${escapeHtml(String(d.resolution))}</strong>. ` : "";
      return `${r}Los fondos fueron distribuidos según el acuerdo. Revisa el detalle en tu transacción.`;
    },
    ctaText: "Ver resultado",
    ctaUrlFor: (id) => txUrl(id),
    timeline: "completed",
  },
  return_requested: {
    headline: (a, p) => `${a} solicitó la devolución de ${p}`,
    status: "Solicitud de devolución",
    next: (_a, _p, d) => {
      const r = d.reason ? `Motivo: <strong>${escapeHtml(String(d.reason))}</strong>. ` : "";
      return `${r}Acepta o rechaza la devolución desde la sala. Si la aceptas, se coordina el envío de retorno.`;
    },
    ctaText: "Revisar solicitud",
    ctaUrlFor: (id) => txUrl(id),
    timeline: "awaiting_buyer_review",
    timelineProblem: true,
  },
  return_accepted: {
    headline: (a, p) => `${a} aceptó tu devolución de ${p}`,
    status: "Devolución aceptada",
    next: () => "Envía el producto de vuelta y registra el seguimiento desde la sala. Cuando el vendedor lo reciba, se procesa el reembolso.",
    ctaText: "Ver detalles",
    ctaUrlFor: (id) => txUrl(id),
    timeline: "in_delivery",
    timelineProblem: true,
  },
  return_rejected: {
    headline: (a, p) => `${a} rechazó tu devolución de ${p}`,
    status: "Devolución en mediación",
    next: () => "Un administrador de Trado revisará el caso y decidirá. Sube evidencia desde la sala para apoyar tu posición.",
    ctaText: "Ver mediación",
    ctaUrlFor: (id) => txUrl(id),
    timelineProblem: true,
  },
  admin_appeal_resolved: {
    headline: (_a, p) => `Disputa resuelta por Trado: ${p}`,
    status: "Decisión del administrador",
    next: (_a, _p, d) => {
      const r = d.resolution;
      if (r === "liberar_fondos_vendedor") return "Los fondos fueron liberados al vendedor.";
      if (r === "reembolso_total") return "Se otorgó reembolso total al comprador.";
      if (r === "reembolso_parcial") {
        const b = d.buyerAmount ? formatCLP(Number(d.buyerAmount)) : null;
        const s = d.sellerAmount ? formatCLP(Number(d.sellerAmount)) : null;
        return `Reembolso parcial. ${b ? `Comprador: <strong>${b}</strong>. ` : ""}${s ? `Vendedor: <strong>${s}</strong>.` : ""}`;
      }
      return "Revisa el detalle de la resolución en tu transacción.";
    },
    ctaText: "Ver resultado",
    ctaUrlFor: (id) => txUrl(id),
    timeline: "completed",
  },
  admin_return_mediation_resolved: {
    headline: (_a, p) => `Mediación de devolución resuelta: ${p}`,
    status: "Decisión del administrador",
    next: (_a, _p, d) =>
      d.shippingPaidBy === "seller"
        ? "El vendedor pagará el envío de retorno."
        : "El comprador pagará el envío de retorno.",
    ctaText: "Ver detalles",
    ctaUrlFor: (id) => txUrl(id),
    timeline: "in_delivery",
    timelineProblem: true,
  },
  mutual_proposal_accepted: {
    headline: (_a, p) => `Acuerdo mutuo aceptado: ${p}`,
    status: "Acuerdo cerrado",
    next: (_a, _p, d) => {
      const b = d.buyerAmount ? formatCLP(Number(d.buyerAmount)) : null;
      const s = d.sellerAmount ? formatCLP(Number(d.sellerAmount)) : null;
      if (b && s) return `Distribución: comprador <strong>${b}</strong>, vendedor <strong>${s}</strong>. Los fondos ya fueron distribuidos.`;
      if (b) return `Reembolso total al comprador: <strong>${b}</strong>.`;
      if (s) return `Fondos liberados al vendedor: <strong>${s}</strong>.`;
      return "Los fondos fueron distribuidos según el acuerdo.";
    },
    ctaText: "Ver transacción",
    ctaUrlFor: (id) => txUrl(id),
    timeline: "completed",
  },
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace(/^Bearer\s+/i, "");

    let callerId: string | null = null;
    if (token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      callerId = null;
    } else {
      const { data: authData, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !authData?.user) {
        return new Response(JSON.stringify({ error: "Token inválido" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      callerId = authData.user.id;
    }

    const { transactionId, actionType, additionalData = {} }: ActionRequest = await req.json();
    if (!transactionId || !actionType) {
      return new Response(JSON.stringify({ error: "Datos incompletos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cfg = A[actionType];
    if (!cfg) {
      return new Response(JSON.stringify({ error: "Tipo de acción desconocido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("id, product_name, amount, commission, sale_type, invite_code, seller_id, buyer_id")
      .eq("id", transactionId)
      .single();

    if (txError || !transaction) {
      return new Response(JSON.stringify({ error: "Transacción no encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let actorId: string;
    if (callerId) {
      if (callerId !== transaction.seller_id && callerId !== transaction.buyer_id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      actorId = callerId;
    } else {
      actorId = transaction.seller_id;
    }

    const recipientId = actorId === transaction.seller_id
      ? transaction.buyer_id
      : transaction.seller_id;
    if (!recipientId) {
      return new Response(
        JSON.stringify({ success: true, message: "No recipient to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", [actorId, recipientId]);

    const actorProfile = profiles?.find((p) => p.id === actorId);
    const recipientProfile = profiles?.find((p) => p.id === recipientId);
    if (!actorProfile || !recipientProfile?.email) {
      return new Response(JSON.stringify({ error: "Perfiles incompletos" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actorName = escapeHtml(actorProfile.full_name || "Tu contraparte");
    const productName = escapeHtml(transaction.product_name);
    const recipientName = escapeHtml(recipientProfile.full_name || "");
    const data: Record<string, unknown> = { ...additionalData, saleType: transaction.sale_type };

    const headline = cfg.headline(actorName, productName);
    const nextStep = cfg.next(actorName, productName, data);
    const ctaUrl = cfg.ctaUrlFor(transactionId, data);
    const referenceCode = transaction.invite_code ||
      transaction.id.substring(0, 8).toUpperCase();

    const summaryRows = [
      { label: "Producto", value: productName },
      { label: "Monto", value: formatCLP(Number(transaction.amount)) },
      {
        label: actorId === transaction.seller_id ? "Vendedor" : "Comprador",
        value: actorName,
      },
    ];

    const thread = await buildThreadHeaders(supabase, transactionId, referenceCode);

    const html = renderTransactionalEmail({
      recipientName,
      headline,
      statusLine: cfg.status,
      nextStep,
      summaryTitle: "Detalles de la transacción",
      summaryRows,
      timelineActive: cfg.timeline,
      timelineProblem: cfg.timelineProblem,
      referenceCode,
      ctaText: cfg.ctaText,
      ctaUrl,
      footerNote:
        "Si no reconoces esta actividad, escríbenos a contacto@trado.cl.",
    });

    const subject = buildThreadSubject(thread, transaction.product_name);

    const [emailResponse] = await Promise.all([
      sendEmail({
        to: recipientProfile.email,
        subject,
        html,
        headers: thread.headers,
      }),
      sendPushToUsers([recipientId], {
        title: "Trado",
        body: headline,
        url: ctaUrl,
        tag: `tx-${transactionId}-${actionType}`,
      }).catch((err) => console.error("Push failed (non-blocking):", err)),
    ]);

    if (thread.isNewThread && thread.anchorId) {
      await persistThreadAnchor(supabase, transactionId, thread.anchorId);
    }

    console.log(`[notify-transaction-action] sent ${actionType}`, emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
