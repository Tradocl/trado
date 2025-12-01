import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { userName, userEmail, userRut, userPhone, documentUrl, selfieUrl, userId }: VerificationNotificationRequest = await req.json();

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
          <p style="margin: 5px 0;"><strong>Email:</strong> ${userEmail}</p>
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
