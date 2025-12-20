import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
        email_thread_id,
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
    const emailThreadId = transaction.email_thread_id;

    if (!buyerEmail) {
      console.error("Buyer email not found for transaction:", transactionId);
      return new Response(
        JSON.stringify({ error: "Buyer email not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending payment instructions to:", buyerEmail);

    const baseUrl = Deno.env.get("SITE_URL") || "https://trado.cl";

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
            .summary-box {
              background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
              border: 1px solid #c4b5fd;
              border-radius: 12px;
              padding: 24px;
              margin-bottom: 24px;
            }
            .summary-box .product-name {
              font-size: 18px;
              font-weight: 600;
              color: #5b21b6;
              margin: 0 0 8px 0;
            }
            .summary-box .amount {
              font-size: 28px;
              font-weight: 700;
              color: #6d28d9;
              margin: 0 0 8px 0;
            }
            .summary-box .seller {
              font-size: 14px;
              color: #7c3aed;
              margin: 0;
            }
            .steps-container {
              margin-bottom: 24px;
            }
            .steps-title {
              font-size: 16px;
              font-weight: 600;
              color: #374151;
              margin: 0 0 16px 0;
            }
            .step {
              display: flex;
              margin-bottom: 16px;
            }
            .step-number {
              background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
              color: white;
              width: 28px;
              height: 28px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              font-weight: 600;
              flex-shrink: 0;
              margin-right: 12px;
            }
            .step-content {
              flex: 1;
            }
            .step-title {
              font-weight: 600;
              color: #1f2937;
              margin: 0 0 4px 0;
              font-size: 14px;
            }
            .step-description {
              color: #6b7280;
              margin: 0;
              font-size: 13px;
            }
            .security-box {
              background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
              border: 1px solid #6ee7b7;
              border-radius: 12px;
              padding: 16px 20px;
              margin-bottom: 24px;
              display: flex;
              align-items: flex-start;
            }
            .security-box .icon {
              font-size: 20px;
              margin-right: 12px;
            }
            .security-box p {
              margin: 0;
              color: #047857;
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
              margin: 24px 0 16px 0;
              font-size: 16px;
            }
            .secondary-link {
              display: block;
              text-align: center;
              color: #7c3aed;
              text-decoration: none;
              font-size: 14px;
              font-weight: 500;
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
                <span class="emoji">🛡️</span>
                <h1>Siguiente Paso: Asegurar tu Compra</h1>
                <p class="subtitle">Orden #${referenceCode}</p>
              </div>
              <div class="content">
                <p style="margin: 0 0 24px 0; color: #4b5563;">
                  Hola <strong>${buyerName}</strong>, te has unido a la compra con <strong>${sellerName}</strong>.
                </p>
                
                <div class="summary-box">
                  <p class="product-name">${productName}</p>
                  <p class="amount">$${totalAmount.toLocaleString('es-CL')}</p>
                  <p class="seller">Vendedor: ${sellerName}</p>
                </div>
                
                <div class="steps-container">
                  <h3 class="steps-title">📋 ¿Cómo funciona Trado?</h3>
                  
                  <div class="step">
                    <div class="step-number">1</div>
                    <div class="step-content">
                      <p class="step-title">Asegura los fondos</p>
                      <p class="step-description">Entra a la sala de transacción y asegura el monto. Si no tienes saldo suficiente en tu Wallet, primero deposita desde ahí.</p>
                    </div>
                  </div>
                  
                  <div class="step">
                    <div class="step-number">2</div>
                    <div class="step-content">
                      <p class="step-title">Coordina la entrega</p>
                      <p class="step-description">Una vez asegurados los fondos, coordina con el vendedor la entrega o envío del producto.</p>
                    </div>
                  </div>
                  
                  <div class="step">
                    <div class="step-number">3</div>
                    <div class="step-content">
                      <p class="step-title">Confirma la recepción</p>
                      <p class="step-description">Cuando recibas el producto en buen estado, confirma la entrega en la sala de transacción.</p>
                    </div>
                  </div>
                  
                  <div class="step">
                    <div class="step-number">4</div>
                    <div class="step-content">
                      <p class="step-title">Liberación del pago</p>
                      <p class="step-description">El dinero se libera automáticamente al vendedor después de tu confirmación.</p>
                    </div>
                  </div>
                </div>
                
                <div class="security-box">
                  <span class="icon">💡</span>
                  <p>Tu dinero está protegido en custodia de Trado durante todo el proceso. Solo se libera cuando confirmas que recibiste el producto.</p>
                </div>
                
                <a href="${baseUrl}/transaction/${transactionId}" class="cta-button">Ir a la Transacción</a>
                <a href="${baseUrl}/wallet" class="secondary-link">Ver mi Wallet</a>
              </div>
              <div class="footer">
                <p>¿Tienes dudas? Escríbenos a <a href="mailto:admin@trado.cl">admin@trado.cl</a></p>
                <p>Este es un correo automático de <a href="${baseUrl}">Trado</a> - Tu plataforma segura para transacciones entre personas.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Build thread subject
    const threadSubject = `Re: [Orden #${referenceCode}] ${productName}`;

    // Prepare email options with threading headers
    const emailOptions: any = {
      from: "Trado Notificaciones <notificaciones@trado.cl>",
      to: [buyerEmail],
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

    console.log("Payment instructions sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
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
