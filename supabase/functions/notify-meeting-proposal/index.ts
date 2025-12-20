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
    const baseUrl = Deno.env.get("SITE_URL") || "https://trado.cl";
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
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
              line-height: 1.6; 
              color: #1a1a1a; 
              margin: 0;
              padding: 0;
              background-color: #f8fafc;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 40px 20px;
            }
            .card {
              background: #ffffff;
              border-radius: 16px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
              overflow: hidden;
            }
            .header { 
              background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); 
              color: white; 
              padding: 32px; 
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .header .emoji {
              font-size: 48px;
              margin-bottom: 16px;
              display: block;
            }
            .header .subtitle {
              margin: 8px 0 0 0;
              font-size: 14px;
              opacity: 0.9;
            }
            .content { 
              padding: 32px;
            }
            .meeting-box {
              background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
              border: 1px solid #6ee7b7;
              border-radius: 12px;
              padding: 24px;
              margin-bottom: 24px;
            }
            .meeting-box h3 {
              margin: 0 0 16px 0;
              font-size: 16px;
              font-weight: 600;
              color: #047857;
            }
            .meeting-row {
              display: flex;
              padding: 10px 0;
              border-bottom: 1px solid rgba(6, 95, 70, 0.1);
            }
            .meeting-row:last-child {
              border-bottom: none;
              padding-bottom: 0;
            }
            .meeting-row .icon {
              font-size: 16px;
              margin-right: 12px;
            }
            .meeting-row .content-text {
              flex: 1;
            }
            .meeting-row .label {
              color: #047857;
              font-size: 12px;
              margin-bottom: 2px;
            }
            .meeting-row .value {
              color: #065f46;
              font-weight: 500;
              font-size: 14px;
            }
            .product-info {
              background: #f8fafc;
              border-radius: 12px;
              padding: 16px 20px;
              margin-bottom: 24px;
              display: flex;
              align-items: center;
            }
            .product-info .icon {
              font-size: 24px;
              margin-right: 12px;
            }
            .product-info .text {
              flex: 1;
            }
            .product-info .label {
              color: #6b7280;
              font-size: 12px;
              margin-bottom: 2px;
            }
            .product-info .name {
              color: #1f2937;
              font-weight: 600;
              font-size: 14px;
            }
            .cta-button {
              display: block;
              background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
              color: white !important;
              text-decoration: none;
              padding: 16px 32px;
              border-radius: 12px;
              font-weight: 600;
              text-align: center;
              margin: 24px 0 16px 0;
              font-size: 16px;
            }
            .help-text {
              color: #6b7280;
              font-size: 14px;
              text-align: center;
              margin: 0;
            }
            .footer {
              text-align: center;
              padding: 24px;
              color: #9ca3af;
              font-size: 13px;
              border-top: 1px solid #f3f4f6;
            }
            .footer a {
              color: #16a34a;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <span class="emoji">📍</span>
                <h1>Nueva Propuesta de Encuentro</h1>
                <p class="subtitle">De ${proposerName}</p>
              </div>
              <div class="content">
                <p style="margin: 0 0 24px 0; color: #4b5563;">
                  Hola <strong>${recipientName}</strong>, <strong>${proposerName}</strong> te ha enviado una propuesta de encuentro.
                </p>
                
                <div class="product-info">
                  <span class="icon">📦</span>
                  <div class="text">
                    <div class="label">Producto</div>
                    <div class="name">${productName}</div>
                  </div>
                </div>
                
                <div class="meeting-box">
                  <h3>📋 Detalles del Encuentro</h3>
                  
                  <div class="meeting-row">
                    <span class="icon">📍</span>
                    <div class="content-text">
                      <div class="label">Lugar propuesto</div>
                      <div class="value">${location}</div>
                    </div>
                  </div>
                  
                  <div class="meeting-row">
                    <span class="icon">📅</span>
                    <div class="content-text">
                      <div class="label">Fecha y hora</div>
                      <div class="value">${formattedDate}</div>
                    </div>
                  </div>
                  
                  ${message ? `
                  <div class="meeting-row">
                    <span class="icon">💬</span>
                    <div class="content-text">
                      <div class="label">Mensaje</div>
                      <div class="value" style="font-style: italic;">"${message}"</div>
                    </div>
                  </div>
                  ` : ''}
                </div>
                
                <a href="${baseUrl}/transaction/${transactionId}" class="cta-button">Ver Propuesta y Responder</a>
                
                <p class="help-text">Puedes aceptar, rechazar o sugerir otra alternativa desde la sala de transacción.</p>
              </div>
              <div class="footer">
                <p>¿Tienes dudas? Escríbenos a <a href="mailto:soporte@trado.cl">soporte@trado.cl</a></p>
                <p>Este es un correo automático de <a href="${baseUrl}">Trado</a> - Tu plataforma segura para transacciones entre personas.</p>
              </div>
            </div>
          </div>
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
