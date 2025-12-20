import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyAppealResolvedRequest {
  appealId: string;
  resolution: string;
  resolutionNotes: string;
  buyerRefundAmount: number | null;
  sellerPaymentAmount: number | null;
  isMutualAgreement: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: NotifyAppealResolvedRequest = await req.json();
    const { 
      appealId, 
      resolution, 
      resolutionNotes, 
      buyerRefundAmount, 
      sellerPaymentAmount,
      isMutualAgreement
    } = body;

    console.log("[notify-appeal-resolved] Processing notification for appeal:", appealId);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get appeal with transaction and participant info
    const { data: appeal, error: appealError } = await supabaseAdmin
      .from("appeals")
      .select("*, transactions!inner(id, product_name, amount, seller_id, buyer_id, invite_code, email_thread_id)")
      .eq("id", appealId)
      .single();

    if (appealError || !appeal) {
      console.error("[notify-appeal-resolved] Appeal not found:", appealError);
      return new Response(
        JSON.stringify({ error: "Appeal not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transaction = appeal.transactions;
    const inviteCode = transaction.invite_code || transaction.id.substring(0, 8).toUpperCase();
    const emailThreadId = transaction.email_thread_id;

    // Get buyer and seller profiles
    const { data: buyerProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", transaction.buyer_id)
      .single();

    const { data: sellerProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", transaction.seller_id)
      .single();

    if (!buyerProfile || !sellerProfile) {
      console.error("[notify-appeal-resolved] Profiles not found");
      return new Response(
        JSON.stringify({ error: "Profiles not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine resolution label
    let resolutionLabel = "Caso Cerrado";
    if (resolution === "reembolso_total") resolutionLabel = "Reembolso Total al Comprador";
    else if (resolution === "liberar_fondos_vendedor") resolutionLabel = "Fondos Liberados al Vendedor";
    else if (resolution === "reembolso_parcial") resolutionLabel = "Resolución Parcial";

    const formatCLP = (amount: number) => {
      return new Intl.NumberFormat("es-CL").format(Math.round(amount));
    };

    // Build distribution info
    let distributionHtml = "";
    if (buyerRefundAmount && buyerRefundAmount > 0) {
      distributionHtml += `<p style="margin: 0 0 8px 0;"><strong>Reembolso al Comprador:</strong> $${formatCLP(buyerRefundAmount)} CLP</p>`;
    }
    if (sellerPaymentAmount && sellerPaymentAmount > 0) {
      distributionHtml += `<p style="margin: 0 0 8px 0;"><strong>Pago al Vendedor:</strong> $${formatCLP(sellerPaymentAmount)} CLP</p>`;
    }

    // Email template
    const createEmailHtml = (recipientName: string, role: "buyer" | "seller") => {
      const roleLabel = role === "buyer" ? "comprador" : "vendedor";
      const yourAmount = role === "buyer" ? buyerRefundAmount : sellerPaymentAmount;
      const yourLabel = role === "buyer" ? "reembolsado" : "recibido";
      
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">✅ Apelación Resuelta</h1>
            </div>
            
            <div style="padding: 32px;">
              <p style="color: #374151; font-size: 16px; margin: 0 0 20px 0;">
                Hola <strong>${recipientName}</strong>,
              </p>
              
              <p style="color: #374151; font-size: 16px; margin: 0 0 20px 0;">
                ${isMutualAgreement 
                  ? "¡Las partes han llegado a un acuerdo mutuo!" 
                  : "La apelación de tu transacción ha sido resuelta por un administrador."
                }
              </p>
              
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #166534; margin: 0 0 12px 0; font-size: 16px;">Detalles de la Resolución</h3>
                <p style="margin: 0 0 8px 0;"><strong>Transacción:</strong> ${transaction.product_name}</p>
                <p style="margin: 0 0 8px 0;"><strong>Monto original:</strong> $${formatCLP(transaction.amount)} CLP</p>
                <p style="margin: 0 0 12px 0;"><strong>Decisión:</strong> ${resolutionLabel}</p>
                ${distributionHtml}
                ${yourAmount && yourAmount > 0 
                  ? `<p style="margin: 16px 0 0 0; padding-top: 12px; border-top: 1px solid #bbf7d0;"><strong>Monto ${yourLabel} a tu billetera:</strong> <span style="color: #059669; font-size: 18px; font-weight: bold;">$${formatCLP(yourAmount)} CLP</span></p>` 
                  : ""
                }
              </div>
              
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">
                  ${isMutualAgreement ? "Detalle del acuerdo:" : "Notas del administrador:"}
                </p>
                <p style="color: #374151; font-size: 14px; margin: 0; font-style: italic;">
                  "${resolutionNotes}"
                </p>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
                Los fondos ya han sido distribuidos según la resolución. Puedes ver el detalle completo en tu panel de transacciones.
              </p>
            </div>
            
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Trado - Transacciones Seguras entre Personas
              </p>
            </div>
          </div>
        </body>
        </html>
      `;
    };

    // Build thread subject
    const threadSubject = `Re: [Orden #${inviteCode}] ${transaction.product_name}`;

    // Prepare email options for buyer
    const buyerEmailOptions: any = {
      from: "Trado <notificaciones@trado.cl>",
      to: [buyerProfile.email],
      subject: threadSubject,
      html: createEmailHtml(buyerProfile.full_name, "buyer"),
    };

    // Add threading headers if we have an email_thread_id
    if (emailThreadId) {
      buyerEmailOptions.headers = {
        'In-Reply-To': emailThreadId,
        'References': emailThreadId,
      };
      console.log("[notify-appeal-resolved] Adding threading headers for buyer:", emailThreadId);
    }

    // Send email to buyer
    const buyerEmailResponse = await resend.emails.send(buyerEmailOptions);
    console.log("[notify-appeal-resolved] Buyer email sent:", buyerEmailResponse);

    // Prepare email options for seller
    const sellerEmailOptions: any = {
      from: "Trado <notificaciones@trado.cl>",
      to: [sellerProfile.email],
      subject: threadSubject,
      html: createEmailHtml(sellerProfile.full_name, "seller"),
    };

    // Add threading headers if we have an email_thread_id
    if (emailThreadId) {
      sellerEmailOptions.headers = {
        'In-Reply-To': emailThreadId,
        'References': emailThreadId,
      };
      console.log("[notify-appeal-resolved] Adding threading headers for seller:", emailThreadId);
    }

    // Send email to seller
    const sellerEmailResponse = await resend.emails.send(sellerEmailOptions);
    console.log("[notify-appeal-resolved] Seller email sent:", sellerEmailResponse);

    // Send internal notification to transactions team
    const internalEmailResponse = await resend.emails.send({
      from: "Trado Notificaciones <notificaciones@trado.cl>",
      to: ["transacciones@trado.cl"],
      subject: `✅ Apelación Resuelta - ${transaction.product_name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">✅ Apelación Resuelta</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px;">
            <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
              <p style="margin: 5px 0;"><strong>Producto:</strong> ${transaction.product_name}</p>
              <p style="margin: 5px 0;"><strong>Monto original:</strong> $${formatCLP(transaction.amount)} CLP</p>
              <p style="margin: 5px 0;"><strong>Decisión:</strong> ${resolutionLabel}</p>
              ${buyerRefundAmount && buyerRefundAmount > 0 ? `<p style="margin: 5px 0;"><strong>Reembolso comprador:</strong> $${formatCLP(buyerRefundAmount)} CLP</p>` : ''}
              ${sellerPaymentAmount && sellerPaymentAmount > 0 ? `<p style="margin: 5px 0;"><strong>Pago vendedor:</strong> $${formatCLP(sellerPaymentAmount)} CLP</p>` : ''}
              <p style="margin: 5px 0;"><strong>Comprador:</strong> ${buyerProfile.full_name} (${buyerProfile.email})</p>
              <p style="margin: 5px 0;"><strong>Vendedor:</strong> ${sellerProfile.full_name} (${sellerProfile.email})</p>
              <p style="margin: 5px 0;"><strong>Acuerdo mutuo:</strong> ${isMutualAgreement ? 'Sí' : 'No'}</p>
            </div>
            <div style="margin-top: 15px; padding: 10px; background: #f0fdf4; border-radius: 6px;">
              <p style="margin: 0; font-size: 14px; color: #166534;"><strong>Notas:</strong> ${resolutionNotes}</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
    console.log("[notify-appeal-resolved] Internal email sent:", internalEmailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notification emails sent successfully",
        buyerEmail: buyerEmailResponse,
        sellerEmail: sellerEmailResponse,
        internalEmail: internalEmailResponse
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[notify-appeal-resolved] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
