import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentInstructionsRequest {
  buyerEmail: string;
  buyerName: string;
  referenceCode: string;
  totalAmount: number;
  productName: string;
  sellerName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      buyerEmail,
      buyerName,
      referenceCode,
      totalAmount,
      productName,
      sellerName,
    }: PaymentInstructionsRequest = await req.json();

    console.log("Sending payment instructions to:", buyerEmail);

    // Datos bancarios de prueba
    const bankDetails = {
      bank: "Banco Estado",
      accountType: "Cuenta Corriente",
      accountNumber: "12345678-9",
      rut: "12.345.678-9",
      email: "admin@trado.cl",
    };

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .bank-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
            .bank-details div { margin: 10px 0; }
            .bank-details strong { display: inline-block; width: 140px; color: #667eea; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .amount { font-size: 24px; font-weight: bold; color: #667eea; }
            .reference { background: #667eea; color: white; padding: 10px 20px; border-radius: 6px; font-size: 18px; font-weight: bold; display: inline-block; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💰 Instrucciones de Pago</h1>
              <p>Orden #${referenceCode}</p>
            </div>
            <div class="content">
              <p>Hola <strong>${buyerName}</strong>,</p>
              
              <p>Para asegurar tu compra de <strong>${productName}</strong> del vendedor <strong>${sellerName}</strong>, por favor transfiere a la siguiente cuenta de custodia:</p>
              
              <div class="amount">Monto Total: $${totalAmount.toLocaleString('es-CL')} CLP</div>
              
              <div class="bank-details">
                <div><strong>Banco:</strong> ${bankDetails.bank}</div>
                <div><strong>Tipo de Cuenta:</strong> ${bankDetails.accountType}</div>
                <div><strong>N° Cuenta:</strong> ${bankDetails.accountNumber}</div>
                <div><strong>RUT:</strong> ${bankDetails.rut}</div>
                <div><strong>Correo:</strong> ${bankDetails.email}</div>
              </div>
              
              <div class="warning">
                <strong>⚠️ IMPORTANTE:</strong> En el asunto/comentario de la transferencia debes poner este código:
                <div class="reference">${referenceCode}</div>
              </div>
              
              <p><strong>Una vez transferido, responde a este correo con el comprobante.</strong></p>
              
              <p>El vendedor recibirá el producto solo cuando confirmemos tu pago. Tu dinero está protegido en nuestra custodia hasta que confirmes la recepción del producto.</p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
              
              <p style="color: #666; font-size: 12px;">
                Si tienes alguna duda, responde a este correo o contacta a admin@trado.cl
              </p>
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
        from: "Trado Notificaciones <notificaciones@send.trado.cl>",
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
