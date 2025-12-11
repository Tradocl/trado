import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Validation helpers
function sanitizeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function validateString(value: unknown, maxLength: number = 500): string {
  if (typeof value !== 'string') return '';
  return sanitizeHtml(value.substring(0, maxLength));
}

function isValidUuid(uuid: unknown): boolean {
  if (typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function validateAmount(value: unknown): number {
  const num = Number(value);
  if (isNaN(num) || num < 0) return 0;
  return Math.min(num, 999999999);
}

interface TransactionCreatedRequest {
  transactionId: string;
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

    // Verify JWT and get user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Invalid token:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid authorization token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { transactionId }: TransactionCreatedRequest = await req.json();

    // Validate transaction ID
    if (!isValidUuid(transactionId)) {
      console.error("Invalid transaction ID format");
      return new Response(
        JSON.stringify({ error: "Invalid transaction ID format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch transaction data from database with seller profile
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select(`
        id,
        product_name,
        product_description,
        amount,
        commission,
        invite_code,
        seller_id,
        profiles!transactions_seller_id_fkey (
          full_name,
          email
        )
      `)
      .eq("id", transactionId)
      .single();

    if (txError || !transaction) {
      console.error("Transaction not found:", txError);
      return new Response(
        JSON.stringify({ error: "Transaction not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify the user is the seller of this transaction
    if (transaction.seller_id !== user.id) {
      console.error("User is not authorized for this transaction");
      return new Response(
        JSON.stringify({ error: "Not authorized to send notification for this transaction" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const sellerProfile = transaction.profiles as any;
    const sellerEmail = validateString(sellerProfile?.email, 254);
    const sellerName = validateString(sellerProfile?.full_name, 200) || 'Vendedor';
    const productName = validateString(transaction.product_name, 200);
    const amount = validateAmount(transaction.amount);
    const commission = validateAmount(transaction.commission);
    const inviteCode = validateString(transaction.invite_code, 20);
    const sellerReceives = amount;
    const totalAmount = amount + commission;

    console.log("Sending transaction created notification:", {
      transactionId,
      sellerEmail,
      productName,
      amount,
    });

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
            .alert-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
            .amount { font-size: 24px; font-weight: bold; color: #f59e0b; }
            .reference { background: #667eea; color: white; padding: 10px 20px; border-radius: 6px; font-size: 18px; font-weight: bold; display: inline-block; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 Nueva Orden Creada</h1>
            </div>
            <div class="content">
              <div class="alert-box">
                <h2>Nueva orden #${inviteCode}</h2>
                <p><strong>Espera una transferencia de:</strong></p>
                <div class="amount">$${totalAmount.toLocaleString('es-CL')} CLP</div>
                <div class="reference">${inviteCode}</div>
              </div>
              
              <h3>Detalles de la Transacción:</h3>
              <ul>
                <li><strong>Producto:</strong> ${productName}</li>
                <li><strong>Vendedor:</strong> ${sellerName} (${sellerEmail})</li>
                <li><strong>Monto Base:</strong> $${amount.toLocaleString('es-CL')} CLP</li>
                <li><strong>Comisión:</strong> $${commission.toLocaleString('es-CL')} CLP</li>
                <li><strong>Total a Recibir:</strong> $${totalAmount.toLocaleString('es-CL')} CLP</li>
              </ul>
              
              <p style="color: #666; margin-top: 30px;">
                Revisa tu cuenta bancaria y confirma cuando recibas la transferencia con el código de referencia.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Trado Notificaciones <notificaciones@trado.cl>",
      to: ["josepabloacevedoolivares@gmail.com"],
      subject: `🔔 Nueva orden creada #${inviteCode}`,
      html: emailHtml,
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
