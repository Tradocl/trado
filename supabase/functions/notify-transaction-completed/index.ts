import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TransactionCompletedRequest {
  buyerEmail: string;
  buyerName: string;
  sellerEmail: string;
  sellerName: string;
  productName: string;
  amount: number;
  transactionId: string;
}

const formatCurrency = (amount: number): string => {
  return `$${amount.toLocaleString('es-CL')}`;
};

const baseUrl = Deno.env.get("SITE_URL") || "https://trado.cl";

const generateBuyerEmailHtml = (buyerName: string, productName: string, amount: number, sellerName: string, transactionId: string) => `
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
        background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); 
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
          <span class="emoji">✅</span>
          <h1>¡Compra Completada!</h1>
        </div>
        <div class="content">
          <p style="margin: 0 0 24px 0; color: #4b5563;">
            Hola <strong>${buyerName}</strong>, tu transacción ha sido completada exitosamente. Los fondos han sido liberados al vendedor.
          </p>
          
          <div class="highlight-box">
            <div class="label">Monto pagado</div>
            <div class="amount">${formatCurrency(amount)}</div>
          </div>
          
          <div class="details">
            <h3>📦 Detalles de la compra</h3>
            <div class="detail-row">
              <span class="label">Producto</span>
              <span class="value">${productName}</span>
            </div>
            <div class="detail-row">
              <span class="label">Vendedor</span>
              <span class="value">${sellerName}</span>
            </div>
            <div class="detail-row">
              <span class="label">Total pagado</span>
              <span class="value">${formatCurrency(amount)} CLP</span>
            </div>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 16px;">
            No olvides calificar tu experiencia con el vendedor. Tu opinión ayuda a otros usuarios.
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

const generateSellerEmailHtml = (sellerName: string, productName: string, amount: number, commission: number, buyerName: string, transactionId: string) => `
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
      .detail-row .negative {
        color: #dc2626;
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
      .cta-secondary {
        display: block;
        background: #f3f4f6;
        color: #374151 !important;
        text-decoration: none;
        padding: 14px 32px;
        border-radius: 12px;
        font-weight: 600;
        text-align: center;
        margin: 8px 0 0 0;
        font-size: 14px;
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
          <span class="emoji">💰</span>
          <h1>¡Venta Completada!</h1>
        </div>
        <div class="content">
          <p style="margin: 0 0 24px 0; color: #4b5563;">
            Hola <strong>${sellerName}</strong>, el comprador ha confirmado la recepción y los fondos han sido liberados a tu billetera Trado.
          </p>
          
          <div class="highlight-box">
            <div class="label">Recibiste en tu billetera</div>
            <div class="amount">${formatCurrency(amount - commission)}</div>
          </div>
          
          <div class="details">
            <h3>📦 Detalles de la venta</h3>
            <div class="detail-row">
              <span class="label">Producto</span>
              <span class="value">${productName}</span>
            </div>
            <div class="detail-row">
              <span class="label">Comprador</span>
              <span class="value">${buyerName}</span>
            </div>
            <div class="detail-row">
              <span class="label">Precio de venta</span>
              <span class="value">${formatCurrency(amount)} CLP</span>
            </div>
            <div class="detail-row">
              <span class="label">Comisión Trado</span>
              <span class="value negative">-${formatCurrency(commission)} CLP</span>
            </div>
            <div class="detail-row total">
              <span class="label">Total recibido</span>
              <span class="value">${formatCurrency(amount - commission)} CLP</span>
            </div>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 16px;">
            El saldo ya está disponible en tu billetera. Puedes retirarlo a tu cuenta bancaria cuando quieras.
          </p>
          
          <a href="${baseUrl}/wallet" class="cta-button">Ver Mi Billetera</a>
          <a href="${baseUrl}/create-transaction" class="cta-secondary">Crear Nueva Venta</a>
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

const handler = async (req: Request): Promise<Response> => {
  console.log("notify-transaction-completed function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      buyerEmail, 
      buyerName, 
      sellerEmail, 
      sellerName, 
      productName, 
      amount,
      transactionId 
    }: TransactionCompletedRequest = await req.json();
    
    console.log("Sending transaction completed emails for:", transactionId);

    if (!buyerEmail || !sellerEmail || !productName || !amount) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const commission = amount * 0.03;

    // Send email to buyer
    const buyerEmailHtml = generateBuyerEmailHtml(buyerName, productName, amount, sellerName, transactionId);
    const buyerEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Trado <notificaciones@trado.cl>",
        to: [buyerEmail],
        subject: `✅ Transacción completada - ${productName}`,
        html: buyerEmailHtml,
      }),
    });

    const buyerEmailData = await buyerEmailResponse.json();
    console.log("Buyer email response:", buyerEmailData);

    // Send email to seller
    const sellerEmailHtml = generateSellerEmailHtml(sellerName, productName, amount, commission, buyerName, transactionId);
    const sellerEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Trado <notificaciones@trado.cl>",
        to: [sellerEmail],
        subject: `💰 ¡Venta completada! - ${productName}`,
        html: sellerEmailHtml,
      }),
    });

    const sellerEmailData = await sellerEmailResponse.json();
    console.log("Seller email response:", sellerEmailData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        buyerEmail: buyerEmailData,
        sellerEmail: sellerEmailData
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in notify-transaction-completed function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
