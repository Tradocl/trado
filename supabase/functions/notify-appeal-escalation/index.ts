import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface AppealEscalationRequest {
  appealId: string;
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

    // Initialize Supabase client
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

    const { appealId }: AppealEscalationRequest = await req.json();

    if (!appealId) {
      return new Response(
        JSON.stringify({ error: "Appeal ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch appeal with transaction and user profiles - server-side lookup
    const { data: appeal, error: appealError } = await supabase
      .from("appeals")
      .select(`
        id,
        initiator_id,
        transaction:transactions!appeals_transaction_id_fkey(
          id,
          amount,
          product_name,
          buyer_id,
          seller_id,
          buyer:profiles!transactions_buyer_id_fkey(email, full_name),
          seller:profiles!transactions_seller_id_fkey(email, full_name)
        )
      `)
      .eq("id", appealId)
      .single();

    if (appealError || !appeal) {
      console.error("Appeal fetch error:", appealError);
      return new Response(
        JSON.stringify({ error: "Appeal not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle case where transaction might be returned as array
    const txData = Array.isArray(appeal.transaction) ? appeal.transaction[0] : appeal.transaction;
    if (!txData) {
      console.error("Transaction not found for appeal:", appealId);
      return new Response(
        JSON.stringify({ error: "Transaction not found for appeal" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the authenticated user is a participant in this appeal/transaction
    const isParticipant = user.id === txData.buyer_id || 
                          user.id === txData.seller_id || 
                          user.id === appeal.initiator_id;
    
    if (!isParticipant) {
      console.error("User is not a participant in this appeal");
      return new Response(
        JSON.stringify({ error: "Not authorized for this appeal" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract data from server-side lookup (not from client request)
    const buyerProfile = Array.isArray(txData.buyer) ? txData.buyer[0] : txData.buyer;
    const sellerProfile = Array.isArray(txData.seller) ? txData.seller[0] : txData.seller;
    const buyerEmail = buyerProfile?.email;
    const sellerEmail = sellerProfile?.email;
    const buyerName = esc(buyerProfile?.full_name) || "Comprador";
    const sellerName = esc(sellerProfile?.full_name) || "Vendedor";
    const productName = esc(txData.product_name);
    const amount = txData.amount;
    
    // Determine who requested the escalation
    const requestedByName = user.id === txData.buyer_id ? buyerName : sellerName;

    console.log("Sending appeal escalation notifications:", {
      appealId,
      productName,
    });

    const appealUrl = `https://uohlyccjugbqsxiwerrv.lovableproject.com/appeal/${appealId}`;

    const createEmailHtml = (recipientName: string, isRequester: boolean) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .alert-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
            .info-box { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .amount { font-size: 20px; font-weight: bold; color: #f59e0b; }
            .button { background: #f59e0b; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 15px 0; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            ul { padding-left: 20px; }
            li { margin: 8px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🛡️ Intervención de Administrador Solicitada</h1>
            </div>
            <div class="content">
              <p>Hola ${recipientName},</p>
              
              <div class="alert-box">
                <p><strong>${isRequester ? "Has solicitado" : `${requestedByName} ha solicitado`}</strong> la intervención de un administrador para resolver el caso relacionado con:</p>
                <p><strong>Producto:</strong> ${productName}</p>
                <p><strong>Monto en disputa:</strong> <span class="amount">$${amount.toLocaleString('es-CL')} CLP</span></p>
              </div>
              
              <div class="info-box">
                <h3 style="margin-top: 0;">📋 ¿Qué sucederá ahora?</h3>
                <ul>
                  <li>Un administrador revisará toda la evidencia presentada por ambas partes</li>
                  <li>También leerá el historial del chat para verificar cualquier acuerdo previo</li>
                  <li>La decisión será tomada de forma imparcial basándose en las pruebas disponibles</li>
                </ul>
              </div>
              
              <h3>📎 Importante:</h3>
              <p>Te recomendamos subir toda la evidencia posible (fotos, capturas de pantalla, videos, documentos) para que el administrador pueda tomar una decisión informada.</p>
              
              <p style="text-align: center;">
                <a href="${appealUrl}" class="button">Ver Caso y Subir Evidencia</a>
              </p>
              
              <p style="color: #666; font-size: 14px;">
                ⏱️ El proceso de revisión puede tomar hasta 48 horas.
              </p>
              
              <p style="color: #666; font-size: 14px;">
                <strong>Nota:</strong> La comisión de la transacción se cobrará independientemente del resultado de la resolución.
              </p>
            </div>
            <div class="footer">
              <p>Este es un mensaje automático de Trado. Por favor no respondas a este correo.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email to buyer
    const buyerEmailResponse = buyerEmail ? await resend.emails.send({
      from: "Trado Notificaciones <notificaciones@trado.cl>",
      to: [buyerEmail],
      subject: `🛡️ Intervención de administrador solicitada - ${productName}`,
      html: createEmailHtml(buyerName, requestedByName === buyerName),
    }) : null;

    if (buyerEmailResponse) {
      console.log("Buyer email sent:", buyerEmailResponse);
    }

    // Send email to seller
    const sellerEmailResponse = sellerEmail ? await resend.emails.send({
      from: "Trado Notificaciones <notificaciones@trado.cl>",
      to: [sellerEmail],
      subject: `🛡️ Intervención de administrador solicitada - ${productName}`,
      html: createEmailHtml(sellerName, requestedByName === sellerName),
    }) : null;

    if (sellerEmailResponse) {
      console.log("Seller email sent:", sellerEmailResponse);
    }

    // Also notify admin
    const adminEmailResponse = await resend.emails.send({
      from: "Trado Notificaciones <notificaciones@trado.cl>",
      to: ["contacto@trado.cl"],
      subject: `🔔 Nueva apelación requiere intervención - ${productName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .alert-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
              .button { background: #dc2626; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 15px 0; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔔 Nueva Apelación Pendiente</h1>
              </div>
              <div class="content">
                <div class="alert-box">
                  <p><strong>Una nueva apelación requiere tu intervención:</strong></p>
                  <ul>
                    <li><strong>Producto:</strong> ${productName}</li>
                    <li><strong>Monto:</strong> $${amount.toLocaleString('es-CL')} CLP</li>
                    <li><strong>Comprador:</strong> ${buyerName} (${buyerEmail || 'N/A'})</li>
                    <li><strong>Vendedor:</strong> ${sellerName} (${sellerEmail || 'N/A'})</li>
                    <li><strong>Solicitado por:</strong> ${requestedByName}</li>
                  </ul>
                </div>
                
                <p style="text-align: center;">
                  <a href="${appealUrl}" class="button">Revisar Caso</a>
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Admin email sent:", adminEmailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      buyerEmailResponse,
      sellerEmailResponse,
      adminEmailResponse
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in notify-appeal-escalation function:", error);
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
