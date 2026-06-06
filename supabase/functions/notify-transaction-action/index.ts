import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendPushToUsers } from "../_shared/push.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ActionRequest {
  transactionId: string;
  actionType: string;
  actorId: string;
  additionalData?: Record<string, any>;
}

// Action types configuration
const actionConfig: Record<string, {
  emoji: string;
  title: string;
  getDescription: (actorName: string, productName: string, data?: Record<string, any>) => string;
  ctaText: string;
  ctaPath: string; // 'transaction' or 'appeal' or 'return'
}> = {
  // Transaction actions
  buyer_joined: {
    emoji: "🤝",
    title: "Trado - Nuevo Participante",
    getDescription: (actorName, productName) => 
      `<strong>${actorName}</strong> se ha unido a tu transacción de <strong>${productName}</strong> en Trado.`,
    ctaText: "Ver Transacción",
    ctaPath: "transaction",
  },
  funds_deposited: {
    emoji: "💰",
    title: "Trado - Fondos Asegurados",
    getDescription: (actorName, productName) =>
      `<strong>${actorName}</strong> ha depositado los fondos para <strong>${productName}</strong> en Trado. ¡Ya puedes proceder con el envío/entrega!`,
    ctaText: "Ver Transacción",
    ctaPath: "transaction",
  },
  marked_shipped: {
    emoji: "📦",
    title: "Trado - Pedido Enviado",
    getDescription: (actorName, productName, data) =>
      `<strong>${actorName}</strong> ha marcado el pedido de <strong>${productName}</strong> como enviado en Trado.${data?.trackingInfo ? ` Tracking: ${data.trackingInfo}` : ''}`,
    ctaText: "Ver Transacción",
    ctaPath: "transaction",
  },
  marked_received: {
    emoji: "✅",
    title: "Trado - Producto Recibido",
    getDescription: (actorName, productName) =>
      `<strong>${actorName}</strong> ha confirmado que recibió el producto <strong>${productName}</strong> en Trado. Ahora tiene un período para revisarlo.`,
    ctaText: "Ver Transacción",
    ctaPath: "transaction",
  },
  // Meeting actions
  meeting_proposed: {
    emoji: "📍",
    title: "Trado - Nueva Propuesta de Encuentro",
    getDescription: (actorName, productName, data) =>
      `<strong>${actorName}</strong> te propone un encuentro para <strong>${productName}</strong> en Trado.${data?.location ? ` Lugar: ${data.location}` : ''}${data?.datetime ? ` Fecha: ${data.datetime}` : ''}`,
    ctaText: "Ver y Responder",
    ctaPath: "transaction",
  },
  meeting_accepted: {
    emoji: "✅",
    title: "Trado - Encuentro Confirmado",
    getDescription: (actorName, productName) =>
      `<strong>${actorName}</strong> ha aceptado tu propuesta de encuentro para <strong>${productName}</strong> en Trado. ¡Coordinen la entrega!`,
    ctaText: "Ver Detalles",
    ctaPath: "transaction",
  },
  meeting_rejected: {
    emoji: "❌",
    title: "Trado - Propuesta Rechazada",
    getDescription: (actorName, productName) =>
      `<strong>${actorName}</strong> ha rechazado tu propuesta de encuentro para <strong>${productName}</strong> en Trado. Puedes proponer otra alternativa.`,
    ctaText: "Proponer Nueva Fecha",
    ctaPath: "transaction",
  },
  // Appeal actions
  appeal_created: {
    emoji: "⚖️",
    title: "Trado - Nueva Apelación",
    getDescription: (actorName, productName, data) =>
      `<strong>${actorName}</strong> ha iniciado una apelación para la transacción de <strong>${productName}</strong> en Trado.${data?.reason ? ` Motivo: ${data.reason}` : ''} Tienes 48 horas para negociar una resolución.`,
    ctaText: "Ver Apelación",
    ctaPath: "appeal",
  },
  appeal_evidence_uploaded: {
    emoji: "📎",
    title: "Trado - Nueva Evidencia",
    getDescription: (actorName, productName) =>
      `<strong>${actorName}</strong> ha subido nueva evidencia a la apelación de <strong>${productName}</strong> en Trado.`,
    ctaText: "Ver Evidencia",
    ctaPath: "appeal",
  },
  appeal_escalated: {
    emoji: "🚨",
    title: "Trado - Caso Escalado",
    getDescription: (actorName, productName) =>
      `<strong>${actorName}</strong> ha escalado la apelación de <strong>${productName}</strong> a un administrador de Trado. Un mediador revisará el caso.`,
    ctaText: "Ver Apelación",
    ctaPath: "appeal",
  },
  appeal_proposal_sent: {
    emoji: "🤝",
    title: "Trado - Nueva Propuesta de Acuerdo",
    getDescription: (actorName, productName, data) =>
      `<strong>${actorName}</strong> te ha enviado una propuesta de acuerdo mutuo para <strong>${productName}</strong> en Trado.${data?.distribution ? ` Propuesta: ${data.distribution}` : ''}`,
    ctaText: "Ver Propuesta",
    ctaPath: "appeal",
  },
  appeal_proposal_rejected: {
    emoji: "❌",
    title: "Trado - Propuesta Rechazada",
    getDescription: (actorName, productName) =>
      `<strong>${actorName}</strong> ha rechazado tu propuesta de acuerdo para <strong>${productName}</strong> en Trado. Puedes enviar una contra-propuesta.`,
    ctaText: "Ver Apelación",
    ctaPath: "appeal",
  },
  appeal_proposal_cancelled: {
    emoji: "🔙",
    title: "Trado - Propuesta Cancelada",
    getDescription: (actorName, productName) =>
      `<strong>${actorName}</strong> ha cancelado su propuesta de acuerdo para <strong>${productName}</strong> en Trado.`,
    ctaText: "Ver Apelación",
    ctaPath: "appeal",
  },
  appeal_resolved: {
    emoji: "✅",
    title: "Trado - Apelación Resuelta",
    getDescription: (actorName, productName, data) =>
      `La apelación de <strong>${productName}</strong> ha sido resuelta en Trado.${data?.resolution ? ` Resolución: ${data.resolution}` : ''}`,
    ctaText: "Ver Resultado",
    ctaPath: "transaction",
  },
  // Return actions
  return_requested: {
    emoji: "↩️",
    title: "Trado - Solicitud de Devolución",
    getDescription: (actorName, productName, data) =>
      `<strong>${actorName}</strong> ha solicitado una devolución para <strong>${productName}</strong> en Trado.${data?.reason ? ` Motivo: ${data.reason}` : ''}`,
    ctaText: "Revisar Solicitud",
    ctaPath: "transaction",
  },
  return_accepted: {
    emoji: "✅",
    title: "Trado - Devolución Aceptada",
    getDescription: (actorName, productName) =>
      `<strong>${actorName}</strong> ha aceptado tu solicitud de devolución para <strong>${productName}</strong> en Trado. Procede a enviar el producto.`,
    ctaText: "Ver Detalles",
    ctaPath: "transaction",
  },
  return_rejected: {
    emoji: "⚖️",
    title: "Trado - Devolución en Mediación",
    getDescription: (actorName, productName) =>
      `<strong>${actorName}</strong> ha rechazado tu solicitud de devolución para <strong>${productName}</strong> en Trado. El caso será revisado por un administrador.`,
    ctaText: "Ver Mediación",
    ctaPath: "transaction",
  },
  // Funds released action
  funds_released: {
    emoji: "💸",
    title: "Trado - ¡Fondos Liberados!",
    getDescription: (actorName, productName, data) =>
      `<strong>${actorName}</strong> ha confirmado la recepción de <strong>${productName}</strong> y los fondos han sido liberados a tu billetera en Trado.${data?.amount ? ` Monto: $${Number(data.amount).toLocaleString('es-CL')} CLP` : ''}`,
    ctaText: "Ver Mi Billetera",
    ctaPath: "wallet",
  },
  // Admin resolution actions
  admin_appeal_resolved: {
    emoji: "⚖️",
    title: "Trado - Apelación Resuelta por Administrador",
    getDescription: (actorName, productName, data) => {
      let resolutionText = "La apelación ha sido resuelta.";
      if (data?.resolution === "liberar_fondos_vendedor") {
        resolutionText = "Se liberaron los fondos al vendedor.";
      } else if (data?.resolution === "reembolso_total") {
        resolutionText = "Se otorgó reembolso total al comprador.";
      } else if (data?.resolution === "reembolso_parcial") {
        resolutionText = `Se acordó un reembolso parcial.${data?.buyerAmount ? ` Comprador: $${Number(data.buyerAmount).toLocaleString('es-CL')}` : ''}${data?.sellerAmount ? `, Vendedor: $${Number(data.sellerAmount).toLocaleString('es-CL')}` : ''}`;
      }
      return `Un administrador de Trado ha resuelto la apelación de <strong>${productName}</strong>. ${resolutionText}`;
    },
    ctaText: "Ver Resultado",
    ctaPath: "transaction",
  },
  admin_return_mediation_resolved: {
    emoji: "📦",
    title: "Trado - Mediación de Devolución Resuelta",
    getDescription: (actorName, productName, data) => {
      const paidBy = data?.shippingPaidBy === "seller" 
        ? "El vendedor pagará el envío de retorno." 
        : "El comprador pagará el envío de retorno.";
      return `Un administrador de Trado ha resuelto la mediación de devolución de <strong>${productName}</strong>. ${paidBy}`;
    },
    ctaText: "Ver Detalles",
    ctaPath: "transaction",
  },
  // Mutual proposal acceptance
  mutual_proposal_accepted: {
    emoji: "🤝",
    title: "Trado - ¡Acuerdo Mutuo Aceptado!",
    getDescription: (actorName, productName, data) => {
      let distributionText = "Los fondos han sido distribuidos según el acuerdo.";
      if (data?.buyerAmount && data?.sellerAmount) {
        distributionText = `Comprador: $${Number(data.buyerAmount).toLocaleString('es-CL')}, Vendedor: $${Number(data.sellerAmount).toLocaleString('es-CL')}`;
      } else if (data?.buyerAmount) {
        distributionText = `Reembolso total de $${Number(data.buyerAmount).toLocaleString('es-CL')} al comprador.`;
      } else if (data?.sellerAmount) {
        distributionText = `Fondos liberados de $${Number(data.sellerAmount).toLocaleString('es-CL')} al vendedor.`;
      }
      return `Se ha aceptado el acuerdo mutuo para la apelación de <strong>${productName}</strong> en Trado. ${distributionText}`;
    },
    ctaText: "Ver Transacción",
    ctaPath: "transaction",
  },
};

function generateEmailHtml(
  recipientName: string,
  emoji: string,
  title: string,
  description: string,
  ctaText: string,
  ctaUrl: string
): string {
  const baseUrl = Deno.env.get("SITE_URL") || "https://trado.cl";
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
            line-height: 1.6; 
            color: #1a1a1a; 
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 40px 20px;
          }
          .card {
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            overflow: hidden;
          }
          .header { 
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); 
            color: white; 
            padding: 32px; 
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          .header .emoji {
            font-size: 48px;
            margin-bottom: 16px;
            display: block;
          }
          .content { 
            padding: 32px;
          }
          .message-box {
            background: #f8fafc;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 24px;
            border-left: 4px solid #7c3aed;
          }
          .message-box p {
            margin: 0;
            color: #4b5563;
            font-size: 15px;
            line-height: 1.7;
          }
          .cta-button {
            display: block;
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
            color: white !important;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 12px;
            font-weight: 600;
            text-align: center;
            margin: 24px 0;
            font-size: 16px;
          }
          .footer {
            text-align: center;
            padding: 24px;
            color: #9ca3af;
            font-size: 13px;
            border-top: 1px solid #f3f4f6;
          }
          .footer a {
            color: #7c3aed;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <span class="emoji">${emoji}</span>
              <h1>${title}</h1>
            </div>
            <div class="content">
              <p style="margin: 0 0 24px 0; color: #4b5563;">
                Hola <strong>${recipientName}</strong>,
              </p>
              
              <div class="message-box">
                <p>${description}</p>
              </div>
              
              <a href="${ctaUrl}" class="cta-button">${ctaText}</a>
              
              <p style="color: #9ca3af; font-size: 13px; text-align: center; margin: 0;">
                Si tienes alguna pregunta, responde a este correo o visita nuestra plataforma.
              </p>
            </div>
            <div class="footer">
              <p>Este es un correo automático de <a href="${baseUrl}">Trado</a>.</p>
              <p>Tu plataforma segura para transacciones entre personas.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    // Allow service-role callers (server-to-server) or verified end-users
    let callerId: string | null = null;
    if (token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      callerId = null; // trusted server caller
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

    const { transactionId, actionType, actorId: bodyActorId, additionalData }: ActionRequest = await req.json();

    if (!transactionId || !actionType) {
      return new Response(JSON.stringify({ error: "Datos incompletos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = actionConfig[actionType];
    if (!config) {
      console.error("Unknown action type:", actionType);
      return new Response(JSON.stringify({ error: "Tipo de acción desconocido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch transaction with profiles
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("id, product_name, seller_id, buyer_id")
      .eq("id", transactionId)
      .single();

    if (txError || !transaction) {
      console.error("Transaction not found:", txError);
      return new Response(JSON.stringify({ error: "Transacción no encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine actor: for end-user callers, force actor = callerId AND verify participation.
    // Service-role callers may notify either side. They can pass body.actorId; defaults to seller.
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
      const bodyActor = (req as any)._bodyActorId as string | undefined;
      if (bodyActor && (bodyActor === transaction.seller_id || bodyActor === transaction.buyer_id)) {
        actorId = bodyActor;
      } else {
        actorId = transaction.seller_id;
      }
    }


    // Determine recipient (the other party)
    const recipientId = actorId === transaction.seller_id
      ? transaction.buyer_id
      : transaction.seller_id;

    if (!recipientId) {
      console.log("No recipient to notify (other party not joined yet)");
      return new Response(JSON.stringify({ success: true, message: "No recipient to notify" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", [actorId, recipientId]);

    if (!profiles || profiles.length < 2) {
      console.error("Could not fetch profiles");
      return new Response(JSON.stringify({ error: "Perfiles no encontrados" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actorProfile = profiles.find(p => p.id === actorId);
    const recipientProfile = profiles.find(p => p.id === recipientId);

    if (!actorProfile || !recipientProfile) {
      console.error("Missing profile data");
      return new Response(JSON.stringify({ error: "Datos de perfil incompletos" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build CTA URL based on action type
    const baseUrl = Deno.env.get("SITE_URL") || "https://trado.cl";
    let ctaUrl = `${baseUrl}/transaction/${transactionId}`;
    if (config.ctaPath === "appeal" && additionalData?.appealId) {
      ctaUrl = `${baseUrl}/appeal/${additionalData.appealId}`;
    } else if (config.ctaPath === "return" && additionalData?.returnId) {
      ctaUrl = `${baseUrl}/return/${additionalData.returnId}`;
    } else if (config.ctaPath === "wallet") {
      ctaUrl = `${baseUrl}/wallet`;
    }

    // Sanitize caller-supplied additionalData fields before HTML interpolation
    const escapeHtml = (s: any) => String(s ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    const safeAdditional: Record<string, any> = {};
    if (additionalData && typeof additionalData === "object") {
      for (const [k, v] of Object.entries(additionalData)) {
        safeAdditional[k] = typeof v === "string" ? escapeHtml(v) : v;
      }
    }

    // Generate email content
    const description = config.getDescription(
      escapeHtml(actorProfile.full_name),
      escapeHtml(transaction.product_name),
      safeAdditional
    );

    const emailHtml = generateEmailHtml(
      escapeHtml(recipientProfile.full_name ?? ""),
      config.emoji,
      config.title,
      description,
      config.ctaText,
      ctaUrl
    );

    // Send email + push in parallel
    const [emailResponse] = await Promise.all([
      resend.emails.send({
        from: "Trado <notificaciones@trado.cl>",
        to: [recipientProfile.email],
        subject: `${config.emoji} ${config.title} - ${transaction.product_name}`,
        html: emailHtml,
      }),
      sendPushToUsers([recipientId], {
        title: config.title,
        body: `${transaction.product_name}`,
        url: ctaUrl,
        tag: `transaction-${transactionId}-${actionType}`,
      }).catch((err) => console.error("Push failed (non-blocking):", err)),
    ]);

    console.log(`Notification sent for action ${actionType}:`, emailResponse);

    // Send push notification (fire and forget)
    const pushBody = `${config.emoji} ${transaction.product_name}`;
    supabase.functions.invoke('send-push-notification', {
      body: {
        userIds: [recipientId],
        title: config.title.replace('Trado - ', ''),
        body: pushBody,
        url: ctaUrl.replace(Deno.env.get("SITE_URL") || "https://trado.cl", ''),
        tag: `tx-${transactionId}-${actionType}`,
      },
    }).catch(() => {});

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
