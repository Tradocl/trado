import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const formatCurrency = (amount: number): string => {
  return `$${amount.toLocaleString('es-CL')}`;
};

const baseUrl = Deno.env.get("SITE_URL") || "https://trado.cl";

const generateReminderEmailHtml = (
  buyerName: string,
  productName: string,
  amount: number,
  sellerName: string,
  transactionId: string,
  referenceCode: string,
  hoursAgo: number
) => `
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
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); 
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
        background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
        border: 1px solid #fbbf24;
        border-radius: 12px;
        padding: 24px;
        margin-bottom: 24px;
      }
      .summary-box .product-name {
        font-size: 18px;
        font-weight: 600;
        color: #92400e;
        margin: 0 0 8px 0;
      }
      .summary-box .amount {
        font-size: 28px;
        font-weight: 700;
        color: #b45309;
        margin: 0 0 8px 0;
      }
      .summary-box .seller {
        font-size: 14px;
        color: #a16207;
        margin: 0;
      }
      .alert-box {
        background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
        border: 1px solid #fca5a5;
        border-radius: 12px;
        padding: 16px 20px;
        margin-bottom: 24px;
        display: flex;
        align-items: flex-start;
      }
      .alert-box .icon {
        font-size: 20px;
        margin-right: 12px;
      }
      .alert-box p {
        margin: 0;
        color: #b91c1c;
        font-size: 14px;
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
        margin-bottom: 12px;
      }
      .step-number {
        background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
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
        margin: 0;
        font-size: 14px;
      }
      .step-description {
        color: #6b7280;
        margin: 2px 0 0 0;
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
      .secondary-link {
        display: block;
        text-align: center;
        color: #16a34a;
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
        color: #16a34a;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="card">
        <div class="header">
          <span class="emoji">⏰</span>
          <h1>Recordatorio: Asegura tu Compra</h1>
          <p class="subtitle">Orden #${referenceCode}</p>
        </div>
        <div class="content">
          <p style="margin: 0 0 24px 0; color: #4b5563;">
            Hola <strong>${buyerName}</strong>, te recordamos que aún no has asegurado los fondos para tu compra con <strong>${sellerName}</strong>.
          </p>
          
          <div class="summary-box">
            <p class="product-name">${productName}</p>
            <p class="amount">${formatCurrency(amount)}</p>
            <p class="seller">Vendedor: ${sellerName}</p>
          </div>
          
          <div class="alert-box">
            <span class="icon">⚠️</span>
            <p>Han pasado más de ${hoursAgo} horas desde que te uniste a esta transacción. El vendedor está esperando que asegures los fondos para coordinar la entrega.</p>
          </div>
          
          <div class="steps-container">
            <h3 class="steps-title">📋 ¿Qué debes hacer?</h3>
            
            <div class="step">
              <div class="step-number">1</div>
              <div class="step-content">
                <p class="step-title">Revisa tu saldo en la Wallet</p>
                <p class="step-description">Si no tienes fondos suficientes, deposita primero.</p>
              </div>
            </div>
            
            <div class="step">
              <div class="step-number">2</div>
              <div class="step-content">
                <p class="step-title">Entra a la sala de transacción</p>
                <p class="step-description">Asegura los fondos haciendo clic en el botón correspondiente.</p>
              </div>
            </div>
          </div>
          
          <div class="security-box">
            <span class="icon">🛡️</span>
            <p>Recuerda: tu dinero está protegido. Solo se libera al vendedor cuando confirmas que recibiste el producto en buen estado.</p>
          </div>
          
          <a href="${baseUrl}/transaction/${transactionId}" class="cta-button">Asegurar Fondos Ahora</a>
          <a href="${baseUrl}/wallet" class="secondary-link">Ver mi Wallet</a>
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

const handler = async (req: Request): Promise<Response> => {
  console.log("send-deposit-reminder function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find transactions in "awaiting_deposit" state where buyer joined more than 24 hours ago
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select(`
        id,
        amount,
        product_name,
        invite_code,
        buyer_id,
        updated_at,
        email_thread_id,
        buyer:profiles!transactions_buyer_id_fkey(email, full_name),
        seller:profiles!transactions_seller_id_fkey(full_name)
      `)
      .eq("state", "awaiting_deposit")
      .not("buyer_id", "is", null)
      .lt("updated_at", twentyFourHoursAgo);

    if (txError) {
      console.error("Error fetching transactions:", txError);
      return new Response(
        JSON.stringify({ error: "Error fetching transactions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!transactions || transactions.length === 0) {
      console.log("No transactions pending deposit for more than 24 hours");
      return new Response(
        JSON.stringify({ success: true, message: "No reminders to send", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${transactions.length} transactions needing reminders`);

    let sentCount = 0;
    const errors: string[] = [];

    for (const transaction of transactions) {
      try {
        const buyerProfile = Array.isArray(transaction.buyer) ? transaction.buyer[0] : transaction.buyer;
        const sellerProfile = Array.isArray(transaction.seller) ? transaction.seller[0] : transaction.seller;
        
        const buyerEmail = buyerProfile?.email;
        const buyerName = buyerProfile?.full_name || "Comprador";
        const sellerName = sellerProfile?.full_name || "Vendedor";
        const referenceCode = transaction.invite_code || transaction.id.substring(0, 8).toUpperCase();

        if (!buyerEmail) {
          console.log(`Skipping transaction ${transaction.id}: No buyer email`);
          continue;
        }

        // Calculate hours since transaction was updated
        const updatedAt = new Date(transaction.updated_at);
        const hoursAgo = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60));

        const emailHtml = generateReminderEmailHtml(
          buyerName,
          transaction.product_name,
          transaction.amount,
          sellerName,
          transaction.id,
          referenceCode,
          hoursAgo
        );

        const threadSubject = `Re: [Orden #${referenceCode}] ${transaction.product_name}`;

        const emailOptions: any = {
          from: "Trado Recordatorio <notificaciones@trado.cl>",
          to: [buyerEmail],
          subject: threadSubject,
          html: emailHtml,
        };

        if (transaction.email_thread_id) {
          emailOptions.headers = {
            'In-Reply-To': transaction.email_thread_id,
            'References': transaction.email_thread_id,
          };
        }

        const emailResponse = await resend.emails.send(emailOptions);
        console.log(`Reminder sent to ${buyerEmail} for transaction ${transaction.id}:`, emailResponse);
        sentCount++;

      } catch (emailError: any) {
        console.error(`Error sending reminder for transaction ${transaction.id}:`, emailError);
        errors.push(`${transaction.id}: ${emailError.message}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${sentCount} reminders`,
        count: sentCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-deposit-reminder function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
