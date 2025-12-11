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

function isValidUuid(uuid: unknown): boolean {
  if (typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function isValidUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  try {
    new URL(url);
    return url.length <= 2000;
  } catch {
    return false;
  }
}

interface VerificationNotificationRequest {
  userName: string;
  userEmail: string;
  userRut: string;
  userPhone: string;
  documentUrl: string;
  selfieUrl: string;
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Validate required fields
    if (!isValidEmail(body.userEmail)) {
      console.error("Invalid email format:", body.userEmail);
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!isValidUuid(body.userId)) {
      console.error("Invalid user ID format");
      return new Response(
        JSON.stringify({ error: "Invalid user ID format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Sanitize inputs
    const userName = validateString(body.userName, 200) || 'Usuario';
    const userEmail = body.userEmail;
    const userRut = validateString(body.userRut, 20) || 'No especificado';
    const userPhone = validateString(body.userPhone, 20) || 'No especificado';
    const userId = body.userId;

    // Validate and sanitize URLs
    const documentUrl = isValidUrl(body.documentUrl) ? body.documentUrl : '#';
    const selfieUrl = isValidUrl(body.selfieUrl) ? body.selfieUrl : '#';

    console.log("Sending verification notification:", { userName, userEmail, userId });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">
          📋 Nuevo Documento de Verificación Enviado
        </h1>
        <p>Se ha recibido un nuevo documento de verificación de identidad.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Datos del Usuario:</h3>
          <p style="margin: 5px 0;"><strong>Nombre:</strong> ${userName}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${sanitizeHtml(userEmail)}</p>
          <p style="margin: 5px 0;"><strong>RUT:</strong> ${userRut}</p>
          <p style="margin: 5px 0;"><strong>Teléfono:</strong> ${userPhone}</p>
          <p style="margin: 5px 0;"><strong>ID Usuario:</strong> ${userId}</p>
        </div>
        
        <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Documentos:</strong></p>
          <a href="${documentUrl}" 
             style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; 
                    text-decoration: none; border-radius: 5px; margin: 10px 10px 0 0;">
            Ver Carnet
          </a>
          <a href="${selfieUrl}" 
             style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; 
                    text-decoration: none; border-radius: 5px; margin: 10px 0 0 0;">
            Ver Selfie con Carnet
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
          Por favor, revisa el documento en el panel de administración y aprueba o rechaza la verificación.
        </p>
        
        <p>Saludos,<br>Sistema Trado</p>
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
        to: ["admin@trado.cl"],
        subject: `📋 Nueva Verificación de Identidad - ${userName}`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Resend API error:", error);
      throw new Error(`Resend API error: ${error}`);
    }

    const data = await response.json();
    console.log("Verification notification email sent successfully:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in notify-verification-submitted function:", error);
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
