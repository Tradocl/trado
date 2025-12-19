import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    title: "Nuevo Participante",
    getDescription: (actorName, productName) => 
      `<strong>${actorName}</strong> se ha unido a tu transacción de <strong>${productName}</strong>.`,
    ctaText: "Ver Transacción",
    ctaPath: "transaction",
  },
  funds_deposited: {
    emoji: "💰",
    title: "Fondos Asegurados",
    getDescription: (actorName, productName) =>
      `<strong>${actorName}</strong> ha depositado los fondos para <strong>${productName}</strong>. ¡Ya puedes proceder con el envío/entrega!`,
    ctaText: "Ver Transacción",
    ctaPath: "transaction",
  },
  marked_shipped: {
    emoji: "📦",
    title: "Pedido Enviado",
    getDescription: (actorName, productName, data) =>
      `<strong>${actorName}</strong> ha marcado el pedido de <strong>${productName}</strong> como enviado.${data?.trackingInfo ? ` Tracking: ${data.trackingInfo}` : ''}`,
    ctaText: "Ver Transacción",
    ctaPath: "transaction",
  },
  marked_received: {
    emoji: "✅",
    title: "Producto Recibido",
    getDescription: (actorName, productName) =>
      `<strong>${actorName}</strong> ha confirmado que recibió el producto <strong>${productName}</strong>. Ahora tiene un período para revisarlo.`,
    ctaText: "Ver Transacción",
    ctaPath: "transaction",
  },
  // Meeting actions
  meeting_proposed: {
    emoji: "📍",
    title: "Nueva Propuesta de Encuentro",
    getDescription: (actorName, productName, data) =>
      `<strong>${actorName}</strong> te propone un encuentro para <strong>${productName}</strong>.${data?.location ? ` Lugar: ${data.location}` : ''}${data?.datetime ? ` Fecha: ${data.datetime}` : ''}`,
    ctaText: "Ver y Responder",
    ctaPath: "transaction",
  },
  meeting_accepted: {
    emoji: "✅",
    title: "Encuentro Confirmado",
    getDescription: (actorName, productName) =>
      `<strong>${actorName}</strong> ha aceptado tu propuesta de encuentro para <strong>${productName}</strong>. ¡Coordinen la entrega!`,
    ctaText: "Ver Detalles",
    ctaPath: "transaction",
  },
  meeting_rejected: {
    emoji: "❌",
    title: "Propuesta Rechazada",
    getDescription: (actorName, productName) =>
      `<strong>${actorName}</strong> ha rechazado tu propuesta de encuentro para <strong>${productName}</strong>. Puedes proponer otra alternativa.`,
    ctaText: "Proponer Nueva Fecha",
    ctaPath: "transaction",
  },
  // Appeal actions
  appeal_created: {
    emoji: "⚖️",
    title: "Nueva Apelación",
    getDescription: (actorName, productName, data) =>
      `<strong>${actorName}</strong> ha iniciado una apelación para la transacción de <strong>${productName}</strong>.${data?.reason ? ` Motivo: ${data.reason}` : ''} Tienes 48 horas para negociar una resolución.`,
    ctaText: "Ver Apelación",
    ctaPath: "appeal",
  },
  appeal_evidence_uploaded: {
    emoji: "📎",
    title: "Nueva Evidencia",
    getDescription: (actorName, productName) =>
      `<strong>${actorName}</strong> ha subido nueva evidencia a la apelación de <strong>${productName}</strong>.`,
    ctaText: "Ver Evidencia",
    ctaPath: "appeal",
  },
  appeal_escalated: {
    emoji: "🚨",
    title: "Caso Escalado",
    getDescription: (actorName, productName) =>
      `<strong>${actorName}</strong> ha escalado la apelación de <strong>${productName}</strong> a un administrador. Un mediador revisará el caso.`,
    ctaText: "Ver Apelación",
    ctaPath: "appeal",
  },
  appeal_proposal_sent: {
    emoji: "🤝",
    title: "Nueva Propuesta de Acuerdo",
    getDescription: (actorName, productName, data) =>
      `<strong>${actorName}</strong> te ha enviado una propuesta de acuerdo mutuo para <strong>${productName}</strong>.${data?.distribution ? ` Propuesta: ${data.distribution}` : ''}`,
    ctaText: "Ver Propuesta",
    ctaPath: "appeal",
  },
  appeal_proposal_rejected: {
    emoji: "❌",
    title: "Propuesta Rechazada",
    getDescription: (actorName, productName) =>
      `<strong>${actorName}</strong> ha rechazado tu propuesta de acuerdo para <strong>${productName}</strong>. Puedes enviar una contra-propuesta.`,
    ctaText: "Ver Apelación",
    ctaPath: "appeal",
  },
  appeal_proposal_cancelled: {
    emoji: "🔙",
    title: "Propuesta Cancelada",
    getDescription: (actorName, productName) =>
      `<strong>${actorName}</strong> ha cancelado su propuesta de acuerdo para <strong>${productName}</strong>.`,
    ctaText: "Ver Apelación",
    ctaPath: "appeal",
  },
  appeal_resolved: {
    emoji: "✅",
    title: "Apelación Resuelta",
    getDescription: (actorName, productName, data) =>
      `La apelación de <strong>${productName}</strong> ha sido resuelta.${data?.resolution ? ` Resolución: ${data.resolution}` : ''}`,
    ctaText: "Ver Resultado",
    ctaPath: "transaction",
  },
  // Return actions
  return_requested: {
    emoji: "↩️",
    title: "Solicitud de Devolución",
    getDescription: (actorName, productName, data) =>
      `<strong>${actorName}</strong> ha solicitado una devolución para <strong>${productName}</strong>.${data?.reason ? ` Motivo: ${data.reason}` : ''}`,
    ctaText: "Revisar Solicitud",
    ctaPath: "transaction",
  },
  return_accepted: {
    emoji: "✅",
    title: "Devolución Aceptada",
    getDescription: (actorName, productName) =>
      `<strong>${actorName}</strong> ha aceptado tu solicitud de devolución para <strong>${productName}</strong>. Procede a enviar el producto.`,
    ctaText: "Ver Detalles",
    ctaPath: "transaction",
  },
  return_rejected: {
    emoji: "⚖️",
    title: "Devolución en Mediación",
    getDescription: (actorName, productName) =>
      `<strong>${actorName}</strong> ha rechazado tu solicitud de devolución para <strong>${productName}</strong>. El caso será revisado por un administrador.`,
    ctaText: "Ver Mediación",
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
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; border: 1px solid #2a2a4a;">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">${emoji} ${title}</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="color: #e0e0e0; font-size: 18px; margin: 0 0 20px; line-height: 1.6;">
                    ¡Hola <strong style="color: #667eea;">${recipientName}</strong>!
                  </p>
                  
                  <p style="color: #b0b0b0; font-size: 16px; margin: 0 0 30px; line-height: 1.6;">
                    ${description}
                  </p>
                  
                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 10px 0 30px;">
                        <a href="${ctaUrl}" 
                           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                          ${ctaText}
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #888; font-size: 14px; margin: 0; text-align: center; line-height: 1.6;">
                    Si tienes alguna pregunta, responde a este correo o visita nuestra plataforma.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background: rgba(0,0,0,0.3); padding: 25px 30px; text-align: center; border-top: 1px solid #2a2a4a;">
                  <p style="color: #666; font-size: 12px; margin: 0;">
                    © 2024 Trado - Transacciones seguras entre personas
                  </p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
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

    const { transactionId, actionType, actorId, additionalData }: ActionRequest = await req.json();

    if (!transactionId || !actionType || !actorId) {
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
    let ctaUrl = `https://trado.cl/transaction/${transactionId}`;
    if (config.ctaPath === "appeal" && additionalData?.appealId) {
      ctaUrl = `https://trado.cl/appeal/${additionalData.appealId}`;
    } else if (config.ctaPath === "return" && additionalData?.returnId) {
      ctaUrl = `https://trado.cl/return/${additionalData.returnId}`;
    }

    // Generate email content
    const description = config.getDescription(
      actorProfile.full_name,
      transaction.product_name,
      additionalData
    );

    const emailHtml = generateEmailHtml(
      recipientProfile.full_name,
      config.emoji,
      config.title,
      description,
      config.ctaText,
      ctaUrl
    );

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Trado <notificaciones@trado.cl>",
      to: [recipientProfile.email],
      subject: `${config.emoji} ${config.title} - ${transaction.product_name}`,
      html: emailHtml,
    });

    console.log(`Notification sent for action ${actionType}:`, emailResponse);

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
