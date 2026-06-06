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

import { requireServiceRole, sanitizeHtml } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authFail = await requireServiceRole(req);
  if (authFail) return new Response(authFail.body, { status: authFail.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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
      .select("*, transactions!inner(id, product_name, amount, seller_id, buyer_id)")
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

    // Send email to buyer
    const buyerEmailResponse = await resend.emails.send({
      from: "Trado <notificaciones@trado.cl>",
      to: [buyerProfile.email],
      subject: `✅ Apelación resuelta: ${transaction.product_name}`,
      html: createEmailHtml(buyerProfile.full_name, "buyer"),
    });

    console.log("[notify-appeal-resolved] Buyer email sent:", buyerEmailResponse);

    // Send email to seller
    const sellerEmailResponse = await resend.emails.send({
      from: "Trado <notificaciones@trado.cl>",
      to: [sellerProfile.email],
      subject: `✅ Apelación resuelta: ${transaction.product_name}`,
      html: createEmailHtml(sellerProfile.full_name, "seller"),
    });

    console.log("[notify-appeal-resolved] Seller email sent:", sellerEmailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notification emails sent successfully",
        buyerEmail: buyerEmailResponse,
        sellerEmail: sellerEmailResponse
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
