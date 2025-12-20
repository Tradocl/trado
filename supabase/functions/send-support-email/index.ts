import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validation helpers
function sanitizeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function validateString(value: unknown, maxLength: number = 500): string {
  if (typeof value !== 'string') return '';
  return sanitizeHtml(value.substring(0, maxLength));
}

function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

interface SupportRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const subjectLabels: Record<string, string> = {
  general: "Consulta General",
  transaction: "Problema con Transacción",
  wallet: "Consulta sobre Billetera",
  verification: "Verificación de Identidad",
  appeal: "Disputa o Apelación",
  other: "Otro",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Validate email
    if (!isValidEmail(body.email)) {
      console.error("Invalid email format:", body.email);
      return new Response(
        JSON.stringify({ error: "Email inválido" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Sanitize inputs
    const name = validateString(body.name, 100);
    const email = body.email.trim();
    const subject = body.subject && subjectLabels[body.subject] ? body.subject : 'other';
    const subjectLabel = subjectLabels[subject];
    const message = validateString(body.message, 2000);

    if (!name || name.length < 2) {
      return new Response(
        JSON.stringify({ error: "El nombre debe tener al menos 2 caracteres" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!message || message.length < 10) {
      return new Response(
        JSON.stringify({ error: "El mensaje debe tener al menos 10 caracteres" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Sending support email:", { name, email, subject: subjectLabel });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📬 Nueva Consulta de Soporte</h1>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #0ea5e9;">
              <h2 style="color: #0369a1; margin-top: 0; font-size: 18px;">
                ${subjectLabel}
              </h2>
            </div>

            <div style="margin-bottom: 25px;">
              <h3 style="color: #495057; border-bottom: 2px solid #e9ecef; padding-bottom: 10px; margin-bottom: 15px;">
                👤 Información del Contacto
              </h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #6c757d; width: 100px;">Nombre:</td>
                  <td style="padding: 10px 0;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #6c757d;">Email:</td>
                  <td style="padding: 10px 0;"><a href="mailto:${email}" style="color: #2563eb;">${email}</a></td>
                </tr>
              </table>
            </div>

            <div style="margin-bottom: 25px;">
              <h3 style="color: #495057; border-bottom: 2px solid #e9ecef; padding-bottom: 10px; margin-bottom: 15px;">
                💬 Mensaje
              </h3>
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; white-space: pre-wrap; font-size: 14px;">
${message}
              </div>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; text-align: center; color: #6c757d; font-size: 12px;">
              <p style="margin: 5px 0;">Este mensaje fue enviado desde el formulario de soporte de Trado</p>
              <p style="margin: 5px 0;">Puedes responder directamente a este correo para contactar al usuario</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Trado Soporte <soporte@trado.cl>",
        to: ["admin@trado.cl"],
        reply_to: email,
        subject: `[Trado Soporte] ${subjectLabel} - ${name}`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Resend API error:", error);
      throw new Error(`Resend API error: ${error}`);
    }

    const data = await response.json();
    console.log("Support email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-support-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
