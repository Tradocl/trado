import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TransactionCreatedRequest {
  transactionId: string;
  sellerEmail: string;
  sellerName: string;
  productName: string;
  productDescription?: string;
  amount: number;
  commission: number;
  sellerReceives: number;
  inviteCode: string;
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

    const {
      transactionId,
      sellerEmail,
      sellerName,
      productName,
      productDescription,
      amount,
      commission,
      sellerReceives,
      inviteCode,
    }: TransactionCreatedRequest = await req.json();

    console.log("Sending transaction created notification:", {
      transactionId,
      sellerEmail,
      productName,
      amount,
    });

    const commissionPercentage = ((commission / amount) * 100).toFixed(2);
    const transactionUrl = `${supabaseUrl.replace("https://", "https://lovable.app/")}transaction/${transactionId}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🏪 Trado</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
              Nueva Sala de Venta Creada
            </p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <div style="background-color: #d1f4e0; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #28a745;">
              <h2 style="color: #155724; margin-top: 0; font-size: 20px;">
                ✅ Sala de Venta Creada Exitosamente
              </h2>
              <p style="color: #155724; margin: 10px 0 0 0; font-size: 14px;">
                Se ha creado una nueva transacción en el sistema
              </p>
            </div>

            <div style="margin-bottom: 25px;">
              <h3 style="color: #495057; border-bottom: 2px solid #e9ecef; padding-bottom: 10px; margin-bottom: 15px;">
                👤 Información del Vendedor
              </h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #6c757d; width: 40%;">Nombre:</td>
                  <td style="padding: 10px 0;">${sellerName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #6c757d;">Email:</td>
                  <td style="padding: 10px 0;">${sellerEmail}</td>
                </tr>
              </table>
            </div>

            <div style="margin-bottom: 25px;">
              <h3 style="color: #495057; border-bottom: 2px solid #e9ecef; padding-bottom: 10px; margin-bottom: 15px;">
                📦 Detalles del Producto
              </h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #6c757d; width: 40%;">Producto:</td>
                  <td style="padding: 10px 0;"><strong>${productName}</strong></td>
                </tr>
                ${productDescription ? `
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #6c757d; vertical-align: top;">Descripción:</td>
                  <td style="padding: 10px 0;">${productDescription}</td>
                </tr>
                ` : ""}
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #6c757d;">Código de Invitación:</td>
                  <td style="padding: 10px 0;">
                    <span style="background-color: #f8f9fa; padding: 8px 12px; border-radius: 4px; font-family: monospace; font-weight: bold; font-size: 16px; border: 2px dashed #6c757d;">
                      ${inviteCode}
                    </span>
                  </td>
                </tr>
              </table>
            </div>

            <div style="margin-bottom: 25px; padding: 20px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 8px; border: 1px solid #dee2e6;">
              <h3 style="color: #495057; margin-top: 0; margin-bottom: 15px;">💰 Resumen Financiero</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6c757d;">Precio del producto:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 16px;">
                    $${amount.toLocaleString("es-CL")} CLP
                  </td>
                </tr>
                <tr style="background-color: #fff3cd;">
                  <td style="padding: 8px 12px; color: #856404;">
                    <div>Comisión Trado:</div>
                    <div style="font-size: 12px; color: #6c757d;">${commissionPercentage}% del total</div>
                  </td>
                  <td style="padding: 8px 12px; text-align: right; font-weight: bold; color: #856404;">
                    -$${commission.toLocaleString("es-CL")} CLP
                  </td>
                </tr>
                <tr style="border-top: 2px solid #28a745;">
                  <td style="padding: 12px 0; font-weight: bold; color: #155724; font-size: 16px;">
                    El vendedor recibirá:
                  </td>
                  <td style="padding: 12px 0; text-align: right; font-weight: bold; color: #28a745; font-size: 20px;">
                    $${sellerReceives.toLocaleString("es-CL")} CLP
                  </td>
                </tr>
              </table>
            </div>

            <div style="margin-bottom: 25px;">
              <h3 style="color: #495057; border-bottom: 2px solid #e9ecef; padding-bottom: 10px; margin-bottom: 15px;">
                🔍 Información de la Transacción
              </h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #6c757d; width: 40%;">ID Transacción:</td>
                  <td style="padding: 10px 0; font-family: monospace; font-size: 12px; color: #6c757d;">
                    ${transactionId}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #6c757d;">Estado:</td>
                  <td style="padding: 10px 0;">
                    <span style="background-color: #cce5ff; color: #004085; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                      Creada
                    </span>
                  </td>
                </tr>
              </table>
            </div>

            <div style="background-color: #e7f3ff; padding: 15px; border-left: 4px solid #0066cc; border-radius: 4px; margin-bottom: 25px;">
              <p style="margin: 0; color: #004085; font-size: 14px;">
                <strong>📋 Próximos pasos:</strong>
              </p>
              <ol style="margin: 10px 0 0 0; padding-left: 20px; color: #004085; font-size: 14px;">
                <li>El vendedor compartirá el código <strong>${inviteCode}</strong> con el comprador</li>
                <li>El comprador se unirá a la sala y depositará los fondos</li>
                <li>El vendedor entregará el producto</li>
                <li>El comprador confirmará la recepción</li>
                <li>Trado liberará los fondos al vendedor</li>
              </ol>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
              <a href="${transactionUrl}" 
                 style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                🔍 Ver Transacción Completa
              </a>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; text-align: center; color: #6c757d; font-size: 12px;">
              <p style="margin: 5px 0;">Esta es una notificación automática del sistema Trado</p>
              <p style="margin: 5px 0;">Puedes monitorear el progreso de esta transacción desde tu panel de administración</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Trado <onboarding@resend.dev>",
      to: ["admin@trado.cl"], // Cambiar por el email real del administrador
      subject: `🏪 Nueva Sala de Venta - ${productName} - $${amount.toLocaleString("es-CL")} CLP`,
      html: html,
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
