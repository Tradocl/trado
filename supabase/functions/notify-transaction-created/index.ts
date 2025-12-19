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

interface TransactionCreatedRequest {
  transactionId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT and get user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Invalid token:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid authorization token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { transactionId }: TransactionCreatedRequest = await req.json();

    // Validate transaction ID
    if (!isValidUuid(transactionId)) {
      console.error("Invalid transaction ID format");
      return new Response(
        JSON.stringify({ error: "Invalid transaction ID format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch transaction data from database with seller profile
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select(`
        id,
        product_name,
        product_description,
        amount,
        commission,
        invite_code,
        seller_id,
        profiles!transactions_seller_id_fkey (
          full_name,
          email
        )
      `)
      .eq("id", transactionId)
      .single();

    if (txError || !transaction) {
      console.error("Transaction not found:", txError);
      return new Response(
        JSON.stringify({ error: "Transaction not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify the user is the seller of this transaction
    if (transaction.seller_id !== user.id) {
      console.error("User is not authorized for this transaction");
      return new Response(
        JSON.stringify({ error: "Not authorized to send notification for this transaction" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const sellerProfile = transaction.profiles as any;
    const sellerEmail = validateString(sellerProfile?.email, 254);
    const sellerName = validateString(sellerProfile?.full_name, 200) || 'Vendedor';
    const productName = validateString(transaction.product_name, 200);
    const amount = validateAmount(transaction.amount);
    const commission = validateAmount(transaction.commission);
    const inviteCode = validateString(transaction.invite_code, 20);
    const sellerReceives = amount - commission;
    const buyerPays = amount;

    console.log("Sending transaction created notification:", {
      transactionId,
      sellerEmail,
      productName,
      amount,
      commission,
      sellerReceives,
    });

    const baseUrl = Deno.env.get("SITE_URL") || "https://trado.cl";
    const transactionUrl = `${baseUrl}/transaction/${transactionId}`;

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
              background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); 
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
            .content { 
              padding: 32px;
            }
            .highlight-box {
              background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
              border: 1px solid #bbf7d0;
              border-radius: 12px;
              padding: 24px;
              text-align: center;
              margin-bottom: 24px;
            }
            .highlight-box .label {
              font-size: 14px;
              color: #166534;
              margin-bottom: 8px;
              font-weight: 500;
            }
            .highlight-box .amount {
              font-size: 36px;
              font-weight: 700;
              color: #15803d;
              margin: 0;
            }
            .reference-badge {
              display: inline-block;
              background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
              color: white;
              padding: 8px 20px;
              border-radius: 20px;
              font-size: 16px;
              font-weight: 600;
              margin-top: 12px;
              letter-spacing: 1px;
            }
            .details {
              background: #f8fafc;
              border-radius: 12px;
              padding: 20px;
              margin-bottom: 24px;
            }
            .details h3 {
              margin: 0 0 16px 0;
              font-size: 16px;
              font-weight: 600;
              color: #374151;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .detail-row:last-child {
              border-bottom: none;
              padding-bottom: 0;
            }
            .detail-row .label {
              color: #6b7280;
              font-size: 14px;
            }
            .detail-row .value {
              color: #1f2937;
              font-weight: 500;
              font-size: 14px;
            }
            .detail-row.total .value {
              color: #15803d;
              font-weight: 700;
            }
            .cta-button {
              display: block;
              background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
              color: white !important;
              text-decoration: none;
              padding: 16px 32px;
              border-radius: 12px;
              font-weight: 600;
              text-align: center;
              margin: 24px 0;
              font-size: 16px;
            }
            .footer {
              text-align: center;
              padding: 24px;
              color: #9ca3af;
              font-size: 13px;
              border-top: 1px solid #f3f4f6;
            }
            .footer a {
              color: #7c3aed;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <span class="emoji">🛒</span>
                <h1>Nueva Orden Creada</h1>
              </div>
              <div class="content">
                <p style="margin: 0 0 24px 0; color: #4b5563;">
                  Hola <strong>${sellerName}</strong>, has creado una nueva orden. Comparte el enlace con el comprador para continuar.
                </p>
                
                <div class="highlight-box">
                  <div class="label">Recibirás cuando se complete</div>
                  <div class="amount">$${sellerReceives.toLocaleString('es-CL')}</div>
                  <span class="reference-badge">#${inviteCode}</span>
                </div>
                
                <div class="details">
                  <h3>📦 Detalles de la Transacción</h3>
                  <div class="detail-row">
                    <span class="label">Producto</span>
                    <span class="value">${productName}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Precio del producto</span>
                    <span class="value">$${buyerPays.toLocaleString('es-CL')} CLP</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Comisión Trado</span>
                    <span class="value">-$${commission.toLocaleString('es-CL')} CLP</span>
                  </div>
                  <div class="detail-row total">
                    <span class="label">Total a recibir</span>
                    <span class="value">$${sellerReceives.toLocaleString('es-CL')} CLP</span>
                  </div>
                </div>
                
                <a href="${transactionUrl}" class="cta-button">Ver Transacción</a>
              </div>
              <div class="footer">
                <p>Este es un correo automático de <a href="${baseUrl}">Trado</a>.</p>
                <p>Tu plataforma segura para transacciones entre personas.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Trado Notificaciones <notificaciones@trado.cl>",
      to: [sellerEmail],
      subject: `🔔 Trado - Nueva orden creada #${inviteCode}`,
      html: emailHtml,
    });

    console.log("Transaction created notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in notify-transaction-created function:", error);
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