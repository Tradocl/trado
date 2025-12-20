import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

interface AuthEmailHookPayload {
  user: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string;
    };
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
}

const generatePasswordResetHtml = (resetLink: string, userName?: string) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperar Contraseña - Trado</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #06b6d4 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <div style="background-color: rgba(255, 255, 255, 0.15); width: 80px; height: 80px; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M9 12l2 2 4-4" stroke="#0d9488" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">Trado</h1>
              <p style="color: rgba(255, 255, 255, 0.9); font-size: 14px; margin: 8px 0 0 0;">Compra y vende con seguridad</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #18181b; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">Recuperar Contraseña</h2>
              
              <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Hola${userName ? ` ${userName}` : ''},
              </p>
              
              <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta en Trado. 
                Haz clic en el botón de abajo para crear una nueva contraseña:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(13, 148, 136, 0.4);">
                      Restablecer Contraseña
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
                Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña seguirá siendo la misma.
              </p>
              
              <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 16px 0 0 0;">
                Este enlace expirará en <strong style="color: #52525b;">1 hora</strong>.
              </p>
              
              <!-- Alternative Link -->
              <div style="background-color: #f4f4f5; border-radius: 8px; padding: 16px; margin-top: 24px;">
                <p style="color: #71717a; font-size: 12px; margin: 0 0 8px 0;">
                  Si el botón no funciona, copia y pega este enlace en tu navegador:
                </p>
                <p style="color: #0d9488; font-size: 12px; word-break: break-all; margin: 0;">
                  ${resetLink}
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Security Notice -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <div style="background: linear-gradient(135deg, rgba(13, 148, 136, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%); border-radius: 12px; padding: 20px; border: 1px solid rgba(13, 148, 136, 0.2);">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="width: 40px; vertical-align: top;">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#0d9488" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </td>
                    <td>
                      <p style="color: #0d9488; font-size: 14px; font-weight: 600; margin: 0 0 4px 0;">Consejo de seguridad</p>
                      <p style="color: #52525b; font-size: 13px; line-height: 1.5; margin: 0;">
                        Nunca compartas tu contraseña con nadie. El equipo de Trado nunca te pedirá tu contraseña por email o teléfono.
                      </p>
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
                      ¿Necesitas ayuda? Contáctanos en <a href="mailto:admin@trado.cl" style="color: #0d9488; text-decoration: none;">admin@trado.cl</a>
                    </p>
                    <p style="color: #a1a1aa; font-size: 12px; margin: 0 0 8px 0;">
                      © 2024 Trado. Todos los derechos reservados.
                    </p>
                    <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                      Compra y vende con total seguridad en Chile.
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

const generateMagicLinkHtml = (magicLink: string, userName?: string) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Iniciar Sesión - Trado</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <tr>
            <td style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #06b6d4 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <div style="background-color: rgba(255, 255, 255, 0.15); width: 80px; height: 80px; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M9 12l2 2 4-4" stroke="#0d9488" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">Trado</h1>
              <p style="color: rgba(255, 255, 255, 0.9); font-size: 14px; margin: 8px 0 0 0;">Compra y vende con seguridad</p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #18181b; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">Iniciar Sesión</h2>
              
              <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Hola${userName ? ` ${userName}` : ''},
              </p>
              
              <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Haz clic en el botón de abajo para iniciar sesión en tu cuenta de Trado:
              </p>
              
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${magicLink}" style="display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(13, 148, 136, 0.4);">
                      Iniciar Sesión
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
                Este enlace expirará en <strong style="color: #52525b;">1 hora</strong>.
              </p>
            </td>
          </tr>
          
          <tr>
            <td style="background-color: #fafafa; padding: 24px 30px; border-radius: 0 0 16px 16px; border-top: 1px solid #e4e4e7;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="text-align: center;">
                    <p style="color: #71717a; font-size: 13px; margin: 0 0 8px 0;">
                      ¿Necesitas ayuda? Contáctanos en <a href="mailto:admin@trado.cl" style="color: #0d9488; text-decoration: none;">admin@trado.cl</a>
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

serve(async (req) => {
  console.log("Auth email hook called");
  
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const payload: AuthEmailHookPayload = await req.json();
    
    console.log("Auth email hook payload:", JSON.stringify(payload, null, 2));
    
    const { user, email_data } = payload;
    const { token_hash, redirect_to, email_action_type } = email_data;
    
    // Build the verification/reset link using Supabase's auth endpoint
    const resetLink = `${SUPABASE_URL}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${encodeURIComponent(redirect_to)}`;
    
    console.log("Email action type:", email_action_type);
    console.log("Reset link:", resetLink);
    console.log("Sending to:", user.email);
    
    let emailHtml: string;
    let subject: string;
    
    // Handle different email types
    switch (email_action_type) {
      case 'recovery':
        emailHtml = generatePasswordResetHtml(resetLink, user.user_metadata?.full_name);
        subject = '🔐 Recupera tu contraseña - Trado';
        break;
      case 'magiclink':
        emailHtml = generateMagicLinkHtml(resetLink, user.user_metadata?.full_name);
        subject = '🔑 Inicia sesión en Trado';
        break;
      case 'signup':
      case 'email_change':
      case 'invite':
      default:
        // For other types, return empty response to let Supabase handle with default
        console.log("Email type not handled by custom hook, returning empty response");
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
    }
    
    // Send the custom email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Trado <no-reply@trado.cl>",
        to: [user.email],
        subject: subject,
        html: emailHtml,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailData);
      return new Response(
        JSON.stringify({
          error: {
            http_code: emailResponse.status,
            message: emailData.message || "Error sending email"
          }
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log("Custom email sent successfully:", emailData);
    
    // Return empty response to indicate we handled the email
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error("Error in auth-email-hook:", error);
    return new Response(
      JSON.stringify({
        error: {
          http_code: 500,
          message: error.message
        }
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
