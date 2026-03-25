import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentInstructionsRequest {
  transactionId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header and verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with auth
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { transactionId }: PaymentInstructionsRequest = await req.json();

    if (!transactionId) {
      return new Response(
        JSON.stringify({ error: "Transaction ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch transaction with buyer and seller profiles - server-side lookup
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select(`
        id,
        amount,
        product_name,
        invite_code,
        buyer_id,
        seller_id,
        buyer:profiles!transactions_buyer_id_fkey(email, full_name),
        seller:profiles!transactions_seller_id_fkey(email, full_name)
      `)
      .eq("id", transactionId)
      .single();

    if (txError || !transaction) {
      console.error("Transaction fetch error:", txError);
      return new Response(
        JSON.stringify({ error: "Transaction not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the authenticated user is a participant in this transaction
    if (user.id !== transaction.buyer_id && user.id !== transaction.seller_id) {
      console.error("User is not a participant in this transaction");
      return new Response(
        JSON.stringify({ error: "Not authorized for this transaction" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract data from server-side lookup (not from client request)
    const buyerProfile = Array.isArray(transaction.buyer) ? transaction.buyer[0] : transaction.buyer;
    const sellerProfile = Array.isArray(transaction.seller) ? transaction.seller[0] : transaction.seller;
    const buyerEmail = buyerProfile?.email;
    const buyerName = buyerProfile?.full_name || "Comprador";
    const sellerName = sellerProfile?.full_name || "Vendedor";
    const referenceCode = transaction.invite_code || transaction.id.substring(0, 8).toUpperCase();
    const totalAmount = transaction.amount;
    const productName = transaction.product_name;

    if (!buyerEmail) {
      console.error("Buyer email not found for transaction:", transactionId);
      return new Response(
        JSON.stringify({ error: "Buyer email not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending payment instructions to:", buyerEmail);

    const baseUrl = Deno.env.get("SITE_URL") || "https://trado.cl";

    // Datos bancarios de Trado
    const bankDetails = {
      bank: "Mercado Pago",
      accountType: "Cuenta Vista",
      accountNumber: "1020783447",
      rut: "78.236.214-3",
      email: "admin@trado.cl",
    };

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
            .header .subtitle {
              margin: 8px 0 0 0;
              font-size: 14px;
              opacity: 0.9;
            }
            .content { 
              padding: 32px;
            }
            .highlight-box {
              background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
              border: 1px solid #c4b5fd;
              border-radius: 12px;
              padding: 24px;
              text-align: center;
              margin-bottom: 24px;
            }
            .highlight-box .label {
              font-size: 14px;
              color: #5b21b6;
              margin-bottom: 8px;
              font-weight: 500;
            }
            .highlight-box .amount {
              font-size: 36px;
              font-weight: 700;
              color: #6d28d9;
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
            .bank-details {
              background: #f8fafc;
              border-radius: 12px;
              padding: 20px;
              margin-bottom: 24px;
            }
            .bank-details h3 {
              margin: 0 0 16px 0;
              font-size: 16px;
              font-weight: 600;
              color: #374151;
            }
            .bank-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .bank-row:last-child {
              border-bottom: none;
              padding-bottom: 0;
            }
            .bank-row .label {
              color: #6b7280;
              font-size: 14px;
            }
            .bank-row .value {
              color: #1f2937;
              font-weight: 500;
              font-size: 14px;
            }
            .warning-box {
              background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
              border: 1px solid #fbbf24;
              border-radius: 12px;
              padding: 20px;
              margin-bottom: 24px;
            }
            .warning-box h4 {
              margin: 0 0 8px 0;
              font-size: 14px;
              font-weight: 600;
              color: #92400e;
            }
            .warning-box p {
              margin: 0;
              color: #78350f;
              font-size: 14px;
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
                <span class="emoji">💳</span>
                <h1>Instrucciones de Pago</h1>
                <p class="subtitle">Orden #${referenceCode}</p>
              </div>
              <div class="content">
                <p style="margin: 0 0 24px 0; color: #4b5563;">
                  Hola <strong>${buyerName}</strong>, para asegurar tu compra de <strong>${productName}</strong> de <strong>${sellerName}</strong>, transfiere a la cuenta de custodia de Trado:
                </p>
                
                <div class="highlight-box">
                  <div class="label">Monto a transferir</div>
                  <div class="amount">$${totalAmount.toLocaleString('es-CL')}</div>
                  <span class="reference-badge">#${referenceCode}</span>
                </div>
                
                <div class="bank-details">
                  <h3>🏦 Datos Bancarios</h3>
                  <div class="bank-row">
                    <span class="label">Banco</span>
                    <span class="value">${bankDetails.bank}</span>
                  </div>
                  <div class="bank-row">
                    <span class="label">Tipo de cuenta</span>
                    <span class="value">${bankDetails.accountType}</span>
                  </div>
                  <div class="bank-row">
                    <span class="label">N° de cuenta</span>
                    <span class="value">${bankDetails.accountNumber}</span>
                  </div>
                  <div class="bank-row">
                    <span class="label">RUT</span>
                    <span class="value">${bankDetails.rut}</span>
                  </div>
                  <div class="bank-row">
                    <span class="label">Email</span>
                    <span class="value">${bankDetails.email}</span>
                  </div>
                </div>
                
                <div class="warning-box">
                  <h4>⚠️ Importante</h4>
                  <p>En el asunto o comentario de la transferencia debes poner el código: <strong>#${referenceCode}</strong></p>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; margin-bottom: 16px;">
                  Una vez transferido, responde a este correo con el comprobante. Tu dinero está protegido en custodia hasta que confirmes la recepción del producto.
                </p>
                
                <a href="${baseUrl}/transaction/${transactionId}" class="cta-button">Ver Transacción</a>
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

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Trado Notificaciones <notificaciones@trado.cl>",
        to: [buyerEmail],
        subject: `Instrucciones de Pago - Orden #${referenceCode}`,
        html: emailHtml,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error from Resend API:", data);
      throw new Error(data.message || "Failed to send email");
    }

    console.log("Payment instructions sent successfully:", data);

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-payment-instructions function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
