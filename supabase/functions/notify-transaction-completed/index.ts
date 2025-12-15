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
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
};

const generateBuyerEmailHtml = (buyerName: string, productName: string, amount: number, sellerName: string) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transacción Completada - Trado</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <div style="background-color: rgba(255, 255, 255, 0.2); width: 80px; height: 80px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <polyline points="22,4 12,14.01 9,11.01" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">¡Transacción Completada!</h1>
              <p style="color: rgba(255, 255, 255, 0.9); font-size: 14px; margin: 8px 0 0 0;">Tu compra se ha realizado exitosamente</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Hola <strong style="color: #18181b;">${buyerName}</strong>,
              </p>
              
              <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                ¡Excelente noticia! Tu transacción ha sido completada con éxito. Los fondos han sido liberados al vendedor.
              </p>
              
              <!-- Transaction Details -->
              <div style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%); border-radius: 12px; padding: 24px; border: 1px solid rgba(34, 197, 94, 0.2);">
                <p style="color: #18181b; font-size: 14px; font-weight: 600; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px;">Detalles de la compra</p>
                
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid rgba(34, 197, 94, 0.2);">
                      <span style="color: #71717a; font-size: 14px;">Producto</span>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid rgba(34, 197, 94, 0.2); text-align: right;">
                      <span style="color: #18181b; font-size: 14px; font-weight: 500;">${productName}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid rgba(34, 197, 94, 0.2);">
                      <span style="color: #71717a; font-size: 14px;">Vendedor</span>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid rgba(34, 197, 94, 0.2); text-align: right;">
                      <span style="color: #18181b; font-size: 14px; font-weight: 500;">${sellerName}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0;">
                      <span style="color: #71717a; font-size: 14px;">Monto pagado</span>
                    </td>
                    <td style="padding: 12px 0; text-align: right;">
                      <span style="color: #22c55e; font-size: 20px; font-weight: 700;">${formatCurrency(amount)}</span>
                    </td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
                No olvides calificar tu experiencia con el vendedor. Tu opinión ayuda a otros usuarios a comprar con confianza.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="https://trado.cl/transaction-history" style="display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 14px; font-weight: 600;">
                      Ver mis transacciones
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 20px 30px; border-radius: 0 0 16px 16px; border-top: 1px solid #e4e4e7; text-align: center;">
              <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                © 2024 Trado. Compra y vende con total seguridad.
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

const generateSellerEmailHtml = (sellerName: string, productName: string, amount: number, commission: number, buyerName: string) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>¡Venta Completada! - Trado</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #06b6d4 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <div style="background-color: rgba(255, 255, 255, 0.2); width: 80px; height: 80px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <line x1="12" y1="1" x2="12" y2="23" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">¡Venta Completada!</h1>
              <p style="color: rgba(255, 255, 255, 0.9); font-size: 14px; margin: 8px 0 0 0;">Los fondos han sido liberados a tu billetera</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Hola <strong style="color: #18181b;">${sellerName}</strong>,
              </p>
              
              <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                ¡Felicitaciones! El comprador ha confirmado la recepción del producto y los fondos han sido liberados a tu billetera Trado.
              </p>
              
              <!-- Transaction Details -->
              <div style="background: linear-gradient(135deg, rgba(13, 148, 136, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%); border-radius: 12px; padding: 24px; border: 1px solid rgba(13, 148, 136, 0.2);">
                <p style="color: #18181b; font-size: 14px; font-weight: 600; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px;">Detalles de la venta</p>
                
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid rgba(13, 148, 136, 0.2);">
                      <span style="color: #71717a; font-size: 14px;">Producto vendido</span>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid rgba(13, 148, 136, 0.2); text-align: right;">
                      <span style="color: #18181b; font-size: 14px; font-weight: 500;">${productName}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid rgba(13, 148, 136, 0.2);">
                      <span style="color: #71717a; font-size: 14px;">Comprador</span>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid rgba(13, 148, 136, 0.2); text-align: right;">
                      <span style="color: #18181b; font-size: 14px; font-weight: 500;">${buyerName}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid rgba(13, 148, 136, 0.2);">
                      <span style="color: #71717a; font-size: 14px;">Precio de venta</span>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid rgba(13, 148, 136, 0.2); text-align: right;">
                      <span style="color: #18181b; font-size: 14px; font-weight: 500;">${formatCurrency(amount)}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid rgba(13, 148, 136, 0.2);">
                      <span style="color: #71717a; font-size: 14px;">Comisión Trado (3%)</span>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid rgba(13, 148, 136, 0.2); text-align: right;">
                      <span style="color: #ef4444; font-size: 14px;">-${formatCurrency(commission)}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0;">
                      <span style="color: #18181b; font-size: 16px; font-weight: 600;">Total recibido</span>
                    </td>
                    <td style="padding: 12px 0; text-align: right;">
                      <span style="color: #0d9488; font-size: 24px; font-weight: 700;">${formatCurrency(amount - commission)}</span>
                    </td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
                El saldo ya está disponible en tu billetera. Puedes retirarlo a tu cuenta bancaria cuando quieras.
              </p>
              
              <!-- CTA Buttons -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="https://trado.cl/wallet" style="display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 14px; font-weight: 600; margin-right: 12px;">
                      Ver mi billetera
                    </a>
                    <a href="https://trado.cl/create-sale" style="display: inline-block; background-color: #f4f4f5; color: #18181b; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 14px; font-weight: 600;">
                      Nueva venta
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 20px 30px; border-radius: 0 0 16px 16px; border-top: 1px solid #e4e4e7; text-align: center;">
              <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                © 2024 Trado. Compra y vende con total seguridad.
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
    const buyerEmailHtml = generateBuyerEmailHtml(buyerName, productName, amount, sellerName);
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
    const sellerEmailHtml = generateSellerEmailHtml(sellerName, productName, amount, commission, buyerName);
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
