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

function validateAmount(value: unknown): number {
  const num = Number(value);
  if (isNaN(num) || num < 0) return 0;
  return Math.min(num, 999999999);
}

interface NotificationRequest {
  userEmail: string;
  userName: string;
  movementType: string;
  amount: number;
  status: "approved" | "rejected";
  description?: string;
}

import { requireServiceRole } from "../_shared/auth.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authFail = await requireServiceRole(req);
  if (authFail) return new Response(authFail.body, { status: authFail.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const body = await req.json();
    
    // Validate email
    const userEmail = body.userEmail;
    if (!isValidEmail(userEmail)) {
      console.error("Invalid email format:", userEmail);
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Sanitize inputs
    const userName = validateString(body.userName, 200) || 'Usuario';
    const movementType = body.movementType === 'deposit' || body.movementType === 'withdrawal' 
      ? body.movementType 
      : 'deposit';
    const amount = validateAmount(body.amount);
    const status = body.status === 'approved' || body.status === 'rejected' 
      ? body.status 
      : 'rejected';
    const description = body.description ? validateString(body.description, 500) : undefined;

    console.log(`Processing movement notification for: ${userEmail}`);

    const statusText = status === "approved" ? "aprobado" : "rechazado";
    const statusEmoji = status === "approved" ? "✅" : "❌";
    const typeText = movementType === "deposit" ? "Depósito" : "Retiro";

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: ${status === "approved" ? "#22c55e" : "#ef4444"};">
          ${statusEmoji} ${typeText} ${statusText}
        </h1>
        <p>Hola ${userName},</p>
        <p>Tu solicitud de ${typeText.toLowerCase()} ha sido <strong>${statusText}</strong>.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Tipo:</strong> ${typeText}</p>
          <p style="margin: 5px 0;"><strong>Monto:</strong> $${amount.toLocaleString('es-CL')}</p>
          <p style="margin: 5px 0;"><strong>Estado:</strong> ${statusText}</p>
          ${description ? `<p style="margin: 5px 0;"><strong>Descripción:</strong> ${description}</p>` : ''}
        </div>
        
        ${status === "approved" 
          ? `<p>El saldo de tu billetera ha sido actualizado.</p>` 
          : `<p>Si tienes alguna pregunta sobre este rechazo, por favor contacta con soporte.</p>`
        }
        
        <p>Saludos,<br>El equipo de Trado</p>
      </div>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Trado Notificaciones <notificaciones@trado.cl>",
        to: [userEmail],
        subject: `${statusEmoji} Trado - ${typeText} ${statusText}`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Resend API error:", error);
      throw new Error(`Resend API error: ${error}`);
    }

    const data = await response.json();
    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-movement-notification function:", error);
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
