import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

function isValidUuid(uuid: unknown): boolean {
  if (typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function validateAmount(value: unknown): number {
  const num = Number(value);
  if (isNaN(num) || num < 0) return 0;
  return Math.min(num, 999999999);
}

interface WalletMovementRequest {
  movementId: string;
  userEmail: string;
  userName: string;
  type: "deposit" | "withdrawal";
  amount: number;
  bankDetails?: {
    holderName: string;
    holderRut: string;
    bankName: string;
    accountType: string;
    accountNumber: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Validate required fields
    if (!isValidUuid(body.movementId)) {
      console.error("Invalid movement ID format");
      return new Response(
        JSON.stringify({ error: "Invalid movement ID format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!isValidEmail(body.userEmail)) {
      console.error("Invalid email format:", body.userEmail);
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Sanitize inputs
    const movementId = body.movementId;
    const userEmail = body.userEmail;
    const userName = validateString(body.userName, 200) || 'Usuario';
    const type = body.type === 'deposit' || body.type === 'withdrawal' ? body.type : 'deposit';
    const amount = validateAmount(body.amount);
    
    // Sanitize bank details if provided
    let bankDetails = undefined;
    if (body.bankDetails && type === 'withdrawal') {
      bankDetails = {
        holderName: validateString(body.bankDetails.holderName, 200),
        holderRut: validateString(body.bankDetails.holderRut, 20),
        bankName: validateString(body.bankDetails.bankName, 100),
        accountType: validateString(body.bankDetails.accountType, 50),
        accountNumber: validateString(body.bankDetails.accountNumber, 30),
      };
    }

    console.log("Sending wallet movement notification:", {
      movementId,
      userEmail,
      type,
      amount,
    });

    const isDeposit = type === "deposit";
    const subject = isDeposit
      ? `Nueva Solicitud de Depósito - $${amount.toLocaleString("es-CL")} CLP`
      : `Nueva Solicitud de Retiro - $${amount.toLocaleString("es-CL")} CLP`;

    let bankDetailsHtml = "";
    if (!isDeposit && bankDetails) {
      bankDetailsHtml = `
        <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #0066cc; border-radius: 4px;">
          <h3 style="color: #0066cc; margin-top: 0;">💳 Datos Bancarios del Usuario</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #495057;">Titular:</td>
              <td style="padding: 8px 0;">${bankDetails.holderName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #495057;">RUT:</td>
              <td style="padding: 8px 0;">${bankDetails.holderRut}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #495057;">Banco:</td>
              <td style="padding: 8px 0;">${bankDetails.bankName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #495057;">Tipo de Cuenta:</td>
              <td style="padding: 8px 0;">${bankDetails.accountType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #495057;">Número de Cuenta:</td>
              <td style="padding: 8px 0;"><strong>${bankDetails.accountNumber}</strong></td>
            </tr>
          </table>
        </div>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">💰 Trado</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
              ${isDeposit ? "Solicitud de Depósito" : "Solicitud de Retiro"}
            </p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <div style="background-color: ${isDeposit ? "#d1f4e0" : "#fff3cd"}; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid ${isDeposit ? "#28a745" : "#ffc107"};">
              <h2 style="color: ${isDeposit ? "#155724" : "#856404"}; margin-top: 0; font-size: 20px;">
                ${isDeposit ? "✅ Nueva Solicitud de Depósito" : "📤 Nueva Solicitud de Retiro"}
              </h2>
              <p style="color: ${isDeposit ? "#155724" : "#856404"}; margin: 10px 0 0 0; font-size: 16px;">
                <strong>Monto: $${amount.toLocaleString("es-CL")} CLP</strong>
              </p>
            </div>

            <div style="margin-bottom: 25px;">
              <h3 style="color: #495057; border-bottom: 2px solid #e9ecef; padding-bottom: 10px; margin-bottom: 15px;">
                👤 Información del Usuario
              </h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #6c757d;">Nombre:</td>
                  <td style="padding: 10px 0;">${userName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #6c757d;">Email:</td>
                  <td style="padding: 10px 0;">${sanitizeHtml(userEmail)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #6c757d;">ID Movimiento:</td>
                  <td style="padding: 10px 0; font-family: monospace; font-size: 12px; color: #6c757d;">${movementId}</td>
                </tr>
              </table>
            </div>

            ${bankDetailsHtml}

            ${isDeposit ? `
              <div style="margin-top: 25px; padding: 15px; background-color: #e7f3ff; border-left: 4px solid #0066cc; border-radius: 4px;">
                <p style="margin: 0; color: #004085; font-size: 14px;">
                  ℹ️ <strong>Nota:</strong> El usuario debe realizar la transferencia a la cuenta bancaria de Trado y esperar la aprobación del administrador.
                </p>
              </div>
            ` : ""}

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; text-align: center; color: #6c757d; font-size: 12px;">
              <p style="margin: 5px 0;">Esta es una notificación automática del sistema Trado</p>
              <p style="margin: 5px 0;">Por favor revisa y aprueba/rechaza esta solicitud desde el panel de administración</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Trado Notificaciones <notificaciones@trado.cl>",
      to: ["admin@trado.cl"],
      subject: subject,
      html: html,
    });

    console.log("Wallet movement notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in notify-wallet-movement function:", error);
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
