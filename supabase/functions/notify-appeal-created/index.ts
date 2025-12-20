import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const reasonLabels: Record<string, string> = {
  producto_no_llego: "Producto no llegó",
  producto_diferente: "Producto diferente al acordado",
  danos_o_fallas: "Daños o fallas en el producto",
  incumplimiento_acuerdo: "Incumplimiento del acuerdo",
  otro: "Otro motivo",
};

const formatCLP = (amount: number) => {
  return new Intl.NumberFormat("es-CL").format(Math.round(amount));
};

interface AppealCreatedRequest {
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

    const { appealId }: AppealCreatedRequest = await req.json();

    if (!appealId) {
      return new Response(
        JSON.stringify({ error: "Appeal ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch appeal with transaction and user profiles - include commission
    const { data: appeal, error: appealError } = await supabase
      .from("appeals")
      .select(`
        id,
        reason,
        reason_description,
        initiator_id,
        created_at,
        transaction:transactions!appeals_transaction_id_fkey(
          id,
          amount,
          commission,
          product_name,
          buyer_id,
          seller_id,
          invite_code,
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

    // Verify the authenticated user is the initiator
    if (user.id !== appeal.initiator_id) {
      console.error("User is not the appeal initiator");
      return new Response(
        JSON.stringify({ error: "Not authorized for this appeal" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract data
    const buyerProfile = Array.isArray(txData.buyer) ? txData.buyer[0] : txData.buyer;
    const sellerProfile = Array.isArray(txData.seller) ? txData.seller[0] : txData.seller;
    const buyerEmail = buyerProfile?.email;
    const sellerEmail = sellerProfile?.email;
    const buyerName = buyerProfile?.full_name || "Comprador";
    const sellerName = sellerProfile?.full_name || "Vendedor";
    const productName = txData.product_name;
    const amount = Number(txData.amount);
    const commission = Number(txData.commission) || 0;
    const distributableAmount = amount - commission;
    const inviteCode = txData.invite_code || txData.id.substring(0, 8).toUpperCase();
    const reasonLabel = reasonLabels[appeal.reason] || appeal.reason;
    const initiatorName = user.id === txData.buyer_id ? buyerName : sellerName;
    const initiatorRole = user.id === txData.buyer_id ? "Comprador" : "Vendedor";

    console.log("Sending appeal created notification:", {
      appealId,
      productName,
      initiatorName,
    });

    const baseUrl = Deno.env.get("SITE_URL") || "https://trado.cl";
    const appealUrl = `${baseUrl}/admin/appeal/${appealId}`;

    // Send internal notification to transactions team with green colors
    const internalEmailResponse = await resend.emails.send({
      from: "Trado Notificaciones <notificaciones@trado.cl>",
      to: ["transacciones@trado.cl"],
      subject: `🆕 Nueva Apelación Creada - ${productName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
              .warning-box { background: #fef3c7; padding: 12px; border-radius: 6px; margin-top: 15px; }
              .button { background: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 15px 0; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🆕 Nueva Apelación Creada</h1>
              </div>
              <div class="content">
                <div class="info-box">
                  <p><strong>Se ha creado una nueva apelación:</strong></p>
                  <ul style="list-style: none; padding: 0; margin: 15px 0;">
                    <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Producto:</strong> ${productName}</li>
                    <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Orden:</strong> #${inviteCode}</li>
                    <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Monto transacción:</strong> $${formatCLP(amount)} CLP</li>
                    <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Comisión Trado:</strong> $${formatCLP(commission)} CLP</li>
                    <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Monto distribuible:</strong> $${formatCLP(distributableAmount)} CLP</li>
                    <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Iniciada por:</strong> ${initiatorName} (${initiatorRole})</li>
                    <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Motivo:</strong> ${reasonLabel}</li>
                    ${appeal.reason_description ? `<li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Descripción:</strong> ${appeal.reason_description}</li>` : ''}
                    <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Comprador:</strong> ${buyerName} (${buyerEmail || 'N/A'})</li>
                    <li style="padding: 8px 0;"><strong>Vendedor:</strong> ${sellerName} (${sellerEmail || 'N/A'})</li>
                  </ul>
                  
                  <div class="warning-box">
                    <p style="margin: 0; font-size: 13px; color: #92400e;">
                      <strong>Nota:</strong> La comisión de $${formatCLP(commission)} CLP se cobrará independientemente de la resolución.
                    </p>
                  </div>
                </div>
                
                <p style="color: #6b7280; font-size: 14px;">
                  ⏱️ Las partes tienen 48 horas para negociar antes de que pueda escalarse a intervención de administrador.
                </p>
                
                <p style="text-align: center;">
                  <a href="${appealUrl}" class="button">Ver Apelación</a>
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Internal email sent:", internalEmailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      internalEmailResponse
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in notify-appeal-created function:", error);
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