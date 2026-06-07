import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  userName: string;
}

const generateWelcomeEmailHtml = (userName: string) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>¡Bienvenido a Trado!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #06b6d4 100%); padding: 50px 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <div style="background-color: rgba(255, 255, 255, 0.15); width: 100px; height: 100px; border-radius: 24px; display: inline-block; line-height: 100px; margin-bottom: 20px; font-size: 56px;">
                🛡️
              </div>
              <h1 style="color: #ffffff; font-size: 32px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">¡Bienvenido a Trado!</h1>
              <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 12px 0 0 0;">Tu cuenta ha sido creada exitosamente</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #18181b; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">
                ¡Hola ${userName}! 👋
              </p>
              
              <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Gracias por unirte a Trado, la plataforma de compra-venta más segura de Chile. 
                Ahora puedes comprar y vender con total tranquilidad gracias a nuestro sistema de escrow.
              </p>
              
              <!-- Features Grid -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 24px 0;">
                <tr>
                  <td style="padding: 16px; background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%); border-radius: 12px; vertical-align: top; width: 50%;">
                    <div style="width: 40px; height: 40px; background-color: rgba(34, 197, 94, 0.2); border-radius: 10px; margin-bottom: 12px; text-align: center; line-height: 40px; font-size: 22px;">
                      🔒
                    </div>
                    <p style="color: #18181b; font-size: 14px; font-weight: 600; margin: 0 0 4px 0;">100% Seguro</p>
                    <p style="color: #71717a; font-size: 13px; margin: 0; line-height: 1.4;">Tu dinero protegido hasta confirmar la entrega</p>
                  </td>
                  <td style="width: 16px;"></td>
                  <td style="padding: 16px; background: linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%); border-radius: 12px; vertical-align: top; width: 50%;">
                    <div style="width: 40px; height: 40px; background-color: rgba(6, 182, 212, 0.2); border-radius: 10px; margin-bottom: 12px; text-align: center; line-height: 40px; font-size: 22px;">
                      ⭐
                    </div>
                    <p style="color: #18181b; font-size: 14px; font-weight: 600; margin: 0 0 4px 0;">Reputación</p>
                    <p style="color: #71717a; font-size: 13px; margin: 0; line-height: 1.4;">Sistema de calificaciones para mayor confianza</p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="https://trado.cl/dashboard" style="display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(13, 148, 136, 0.4);">
                      Ir a mi Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Next Steps -->
              <div style="background-color: #f4f4f5; border-radius: 12px; padding: 24px; margin-top: 24px;">
                <p style="color: #18181b; font-size: 16px; font-weight: 600; margin: 0 0 16px 0;">📋 Próximos pasos recomendados:</p>
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7;">
                      <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="width: 28px; vertical-align: top;">
                            <span style="display: inline-block; width: 24px; height: 24px; background-color: #0d9488; color: white; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600;">1</span>
                          </td>
                          <td>
                            <p style="color: #52525b; font-size: 14px; margin: 0;"><strong style="color: #18181b;">Verifica tu identidad</strong> - Aumenta tu límite de transacciones</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7;">
                      <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="width: 28px; vertical-align: top;">
                            <span style="display: inline-block; width: 24px; height: 24px; background-color: #0d9488; color: white; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600;">2</span>
                          </td>
                          <td>
                            <p style="color: #52525b; font-size: 14px; margin: 0;"><strong style="color: #18181b;">Configura tu cuenta bancaria</strong> - Para recibir pagos de tus ventas</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="width: 28px; vertical-align: top;">
                            <span style="display: inline-block; width: 24px; height: 24px; background-color: #0d9488; color: white; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600;">3</span>
                          </td>
                          <td>
                            <p style="color: #52525b; font-size: 14px; margin: 0;"><strong style="color: #18181b;">Crea tu primera transacción</strong> - Empieza a vender de forma segura</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 30px; border-radius: 0 0 16px 16px; border-top: 1px solid #e4e4e7;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="text-align: center;">
                    <p style="color: #71717a; font-size: 13px; margin: 0 0 8px 0;">
                      ¿Tienes preguntas? Contáctanos en <a href="mailto:contacto@trado.cl" style="color: #0d9488; text-decoration: none;">contacto@trado.cl</a>
                    </p>
                    <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                      © 2024 Trado. Todos los derechos reservados.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const handler = async (req: Request): Promise<Response> => {
  console.log("send-welcome-email function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const authClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims?.sub) {
    console.error("getClaims failed:", claimsError);
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const user = { id: claimsData.claims.sub as string, email: claimsData.claims.email as string | undefined };

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Load profile to get email/name
    const { data: profile } = await admin
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .maybeSingle();

    const email = profile?.email || user.email;
    const userName = profile?.full_name || "Usuario";

    if (!email) {
      return new Response(JSON.stringify({ error: "No email available" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Atomically claim the welcome-email lock to prevent duplicate sends from
    // concurrent invocations (auth state events can fire multiple times).
    const { data: claimed, error: claimError } = await admin
      .from("profiles")
      .update({ welcome_email_sent: true })
      .eq("id", user.id)
      .eq("welcome_email_sent", false)
      .select("id")
      .maybeSingle();

    if (claimError) {
      console.error("Error claiming welcome lock:", claimError);
      throw claimError;
    }

    if (!claimed) {
      // Another invocation already claimed it (or it was already sent).
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailHtml = generateWelcomeEmailHtml(userName);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Trado <bienvenida@trado.cl>",
        to: [email],
        subject: "🎉 ¡Bienvenido a Trado! Tu cuenta está lista",
        html: emailHtml,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      // Roll back the lock so a future retry can resend
      await admin.from("profiles").update({ welcome_email_sent: false }).eq("id", user.id);
      console.error("Resend API error:", emailData);
      throw new Error(emailData.message || "Error sending email");
    }

    console.log("Welcome email sent successfully to", email);

    return new Response(
      JSON.stringify({ success: true, data: emailData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
