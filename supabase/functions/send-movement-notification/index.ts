import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  userEmail: string;
  userName: string;
  movementType: string;
  amount: number;
  status: "approved" | "rejected";
  description?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, userName, movementType, amount, status, description }: NotificationRequest = await req.json();

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
        
        <p>Saludos,<br>El equipo de SafeTransaction</p>
      </div>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "SafeTransaction <onboarding@resend.dev>",
        to: [userEmail],
        subject: `${statusEmoji} ${typeText} ${statusText}`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
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
