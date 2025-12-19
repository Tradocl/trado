import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MeetingProposalRequest {
  transactionId: string;
  proposerName: string;
  recipientEmail: string;
  recipientName: string;
  productName: string;
  location: string;
  datetime: string;
  message?: string;
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

    const {
      transactionId,
      proposerName,
      recipientEmail,
      recipientName,
      productName,
      location,
      datetime,
      message,
    }: MeetingProposalRequest = await req.json();

    if (!transactionId || !proposerName || !recipientEmail || !recipientName || !productName || !location || !datetime) {
      return new Response(JSON.stringify({ error: "Datos incompletos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch transaction to get email_thread_id and invite_code
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("invite_code, email_thread_id")
      .eq("id", transactionId)
      .single();

    if (txError) {
      console.error("Error fetching transaction:", txError);
    }

    const inviteCode = transaction?.invite_code || transactionId.substring(0, 8).toUpperCase();
    const emailThreadId = transaction?.email_thread_id;

    const formattedDate = new Date(datetime).toLocaleDateString("es-CL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const emailHtml = `
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
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">📍 Nueva Propuesta de Encuentro</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="color: #e0e0e0; font-size: 18px; margin: 0 0 20px; line-height: 1.6;">
                      ¡Hola <strong style="color: #667eea;">${recipientName}</strong>!
                    </p>
                    
                    <p style="color: #b0b0b0; font-size: 16px; margin: 0 0 30px; line-height: 1.6;">
                      <strong style="color: #e0e0e0;">${proposerName}</strong> te ha enviado una propuesta de encuentro para la transacción de <strong style="color: #667eea;">${productName}</strong>.
                    </p>
                    
                    <!-- Meeting Details Card -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(102, 126, 234, 0.1); border-radius: 12px; border: 1px solid rgba(102, 126, 234, 0.3); margin-bottom: 30px;">
                      <tr>
                        <td style="padding: 25px;">
                          <h3 style="color: #667eea; margin: 0 0 20px; font-size: 16px;">📋 Detalles del Encuentro</h3>
                          
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                                <span style="color: #888; font-size: 14px;">📍 Lugar</span><br>
                                <span style="color: #e0e0e0; font-size: 16px; font-weight: 500;">${location}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 10px 0; ${message ? 'border-bottom: 1px solid rgba(255,255,255,0.1);' : ''}">
                                <span style="color: #888; font-size: 14px;">📅 Fecha y Hora</span><br>
                                <span style="color: #e0e0e0; font-size: 16px; font-weight: 500;">${formattedDate}</span>
                              </td>
                            </tr>
                            ${message ? `
                            <tr>
                              <td style="padding: 10px 0;">
                                <span style="color: #888; font-size: 14px;">💬 Mensaje</span><br>
                                <span style="color: #e0e0e0; font-size: 16px; font-style: italic;">"${message}"</span>
                              </td>
                            </tr>
                            ` : ''}
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 10px 0 30px;">
                          <a href="https://trado.cl/transaction/${transactionId}" 
                             style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                            Ver Propuesta y Responder
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="color: #888; font-size: 14px; margin: 0; text-align: center; line-height: 1.6;">
                      Puedes aceptar o rechazar esta propuesta y sugerir otra alternativa desde tu panel de transacción.
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

    // Build thread subject
    const threadSubject = `Re: [Orden #${inviteCode}] ${productName}`;

    // Prepare email options with threading headers
    const emailOptions: any = {
      from: "Trado <notificaciones@trado.cl>",
      to: [recipientEmail],
      subject: threadSubject,
      html: emailHtml,
    };

    // Add threading headers if we have an email_thread_id
    if (emailThreadId) {
      emailOptions.headers = {
        'In-Reply-To': emailThreadId,
        'References': emailThreadId,
      };
      console.log("Adding threading headers with email_thread_id:", emailThreadId);
    }

    const emailResponse = await resend.emails.send(emailOptions);

    console.log("Meeting proposal notification sent:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending meeting proposal notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
