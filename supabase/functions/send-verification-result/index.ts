import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationResultRequest {
  userEmail: string;
  userName: string;
  status: "approved" | "rejected";
  rejectionReason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, userName, status, rejectionReason }: VerificationResultRequest = await req.json();

    console.log("Sending verification result notification:", { userEmail, userName, status });

    const isApproved = status === "approved";
    const baseUrl = Deno.env.get("SITE_URL") || "https://trado.cl";
    
    const emailHtml = isApproved ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #22c55e;">
          ✅ ¡Verificación Aprobada!
        </h1>
        <p>Hola ${userName},</p>
        
        <div style="background-color: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
          <p style="margin: 0; font-size: 16px; color: #15803d;">
            <strong>¡Felicitaciones!</strong> Tu identidad ha sido verificada exitosamente en Trado.
          </p>
        </div>
        
        <p>Tu cuenta ahora tiene el sello de verificación, lo que aumentará tu reputación en la plataforma y generará más confianza con otros usuarios.</p>
        
        <p style="margin-top: 30px;">
          <a href="${baseUrl}/dashboard" 
             style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 5px; font-weight: bold;">
            Ir a Trado
          </a>
        </p>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Gracias por ser parte de Trado, la plataforma de compra y venta segura.
        </p>
        
        <p>Saludos,<br>Equipo Trado</p>
      </div>
    ` : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #ef4444;">
          ❌ Verificación No Aprobada
        </h1>
        <p>Hola ${userName},</p>
        
        <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <p style="margin: 0; font-size: 16px; color: #991b1b;">
            Lamentablemente, no pudimos verificar tu identidad con la documentación enviada en Trado.
          </p>
        </div>
        
        ${rejectionReason ? `
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0 0 5px 0; font-weight: bold; color: #92400e;">Motivo del rechazo:</p>
            <p style="margin: 0; color: #78350f; white-space: pre-wrap;">${rejectionReason}</p>
          </div>
        ` : `
          <p><strong>Posibles motivos:</strong></p>
          <ul style="color: #6b7280;">
            <li>La imagen del documento no es clara o legible</li>
            <li>La selfie con el carnet no muestra tu rostro o el documento con claridad</li>
            <li>Los datos del documento no coinciden con tu información registrada</li>
            <li>El documento no es válido o está vencido</li>
          </ul>
        `}
        
        <p><strong>¿Qué puedes hacer?</strong></p>
        <p>Puedes intentar nuevamente subiendo imágenes más claras donde se vean todos los datos de tu cédula y tu rostro de forma nítida.</p>
        
        <p style="margin-top: 30px;">
          <a href="${baseUrl}/verification" 
             style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 5px; font-weight: bold;">
            Intentar Nuevamente
          </a>
        </p>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Si tienes dudas, contáctanos en <a href="mailto:soporte@trado.cl" style="color: #2563eb;">soporte@trado.cl</a>
        </p>
        
        <p>Saludos,<br>Equipo Trado</p>
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
        subject: isApproved 
          ? "✅ ¡Tu verificación ha sido aprobada!" 
          : "❌ Verificación no aprobada - Inténtalo nuevamente",
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }

    const data = await response.json();
    console.log("Verification result email sent successfully:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-verification-result function:", error);
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
