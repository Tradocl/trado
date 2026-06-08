import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentInstructionsRequest {
  transactionId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { transactionId }: PaymentInstructionsRequest = await req.json();

    if (!transactionId) {
      return new Response(
        JSON.stringify({ error: "Transaction ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select(`
        id,
        amount,
        commission,
        product_name,
        invite_code,
        sale_type,
        buyer_id,
        seller_id,
        buyer:profiles!transactions_buyer_id_fkey(email, full_name),
        seller:profiles!transactions_seller_id_fkey(email, full_name)
      `)
      .eq("id", transactionId)
      .single();

    if (txError || !transaction) {
      return new Response(
        JSON.stringify({ error: "Transaction not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (user.id !== transaction.buyer_id && user.id !== transaction.seller_id) {
      return new Response(
        JSON.stringify({ error: "Not authorized for this transaction" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const buyerProfile = Array.isArray(transaction.buyer) ? transaction.buyer[0] : transaction.buyer;
    const sellerProfile = Array.isArray(transaction.seller) ? transaction.seller[0] : transaction.seller;
    const buyerEmail = buyerProfile?.email;
    const buyerName = buyerProfile?.full_name || "Comprador";
    const sellerName = sellerProfile?.full_name || "la otra parte";
    const referenceCode = transaction.invite_code || transaction.id.substring(0, 8).toUpperCase();
    const totalAmount = transaction.amount;
    const commission = transaction.commission || 0;
    const productName = transaction.product_name;
    const saleType = transaction.sale_type;

    if (!buyerEmail) {
      return new Response(
        JSON.stringify({ error: "Buyer email not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = Deno.env.get("SITE_URL") || "https://trado.cl";
    const transactionUrl = `${baseUrl}/transaction/${transactionId}`;

    const fmt = (n: number) => `$${n.toLocaleString("es-CL")}`;

    const saleTypeLabel =
      saleType === "service"
        ? "el servicio"
        : saleType === "in_person_product"
        ? "el producto (entrega presencial)"
        : saleType === "shipped_product"
        ? "el producto (envío)"
        : "la transacción";

    const emailHtml = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Te uniste a la sala de Trado</title>
</head>
<body style="margin:0;padding:0;background:#f5f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0F1424;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border:1px solid #E5E7F0;border-radius:16px;overflow:hidden;">
    <div style="padding:28px 32px 0;">
      <div style="font-size:20px;font-weight:700;color:#2230C2;letter-spacing:-0.02em;">Trado</div>
    </div>
    <div style="padding:20px 32px 8px;">
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0F1424;letter-spacing:-0.01em;">Te uniste a la sala #${referenceCode}</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#5B6378;">
        Hola <strong style="color:#0F1424;">${buyerName}</strong>, ya estás dentro de la sala de escrow con <strong style="color:#0F1424;">${sellerName}</strong> por ${saleTypeLabel}: <strong style="color:#0F1424;">${productName}</strong>.
      </p>

      <div style="background:#F5F6FB;border:1px solid #E5E7F0;border-radius:12px;padding:18px 20px;margin:0 0 20px;">
        <div style="font-size:13px;color:#5B6378;margin-bottom:4px;">Monto total a pagar</div>
        <div style="font-size:28px;font-weight:700;color:#0F1424;letter-spacing:-0.01em;">${fmt(totalAmount)}</div>
        ${commission > 0 ? `<div style="font-size:12px;color:#5B6378;margin-top:6px;">Incluye comisión Trado de ${fmt(commission)}</div>` : ""}
      </div>

      <h2 style="margin:24px 0 10px;font-size:16px;font-weight:700;color:#0F1424;">¿Cómo sigue el proceso?</h2>
      <ol style="margin:0 0 20px;padding-left:20px;font-size:14px;line-height:1.7;color:#0F1424;">
        <li><strong>Revisa tu saldo en Mi Billetera.</strong> Si ya tienes saldo suficiente, puedes pagar directo desde la sala sin recargar.</li>
        <li><strong>Si te falta saldo, recárgalo desde Mi Billetera</strong> con nuestra pasarela de pagos segura (tarjeta, débito y otros medios). El dinero queda disponible en tu cuenta Trado.</li>
        <li><strong>Vuelve a la sala y confirma el pago.</strong> Ese monto se bloquea en custodia de Trado: ${sellerName} no recibe nada hasta que tú confirmes.</li>
        <li><strong>Recibes ${saleType === "service" ? "el servicio" : "el producto"}</strong> y revisas que esté todo bien.</li>
        <li><strong>Confirmas la entrega</strong> desde la sala y recién ahí se libera el pago al vendedor.</li>
      </ol>

      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#5B6378;">
        Si algo no llega como acordaron, puedes abrir una disputa desde la misma sala y nuestro equipo media para resolverlo.
      </p>

      <div style="text-align:center;margin:28px 0 8px;">
        <a href="${transactionUrl}" style="display:inline-block;background:#2230C2;color:#ffffff;font-size:15px;font-weight:600;border-radius:10px;padding:14px 28px;text-decoration:none;">Ir a la sala</a>
        <div style="margin-top:12px;">
          <a href="${baseUrl}/wallet" style="display:inline-block;color:#2230C2;font-size:14px;font-weight:600;text-decoration:none;">Recargar saldo en Mi Billetera →</a>
        </div>
      </div>

      <p style="margin:20px 0 0;font-size:13px;color:#5B6378;text-align:center;">
        O abre la sala aquí: <a href="${transactionUrl}" style="color:#2230C2;word-break:break-all;">${transactionUrl}</a>
      </p>

      <div style="border-top:1px solid #E5E7F0;margin:28px 0 18px;"></div>
      <p style="margin:0;font-size:12px;color:#5B6378;line-height:1.5;text-align:center;">
        Este es un correo automático de Trado. Si no reconoces esta sala, ignora este mensaje o contáctanos en <a href="mailto:contacto@trado.cl" style="color:#2230C2;">contacto@trado.cl</a>.
      </p>
    </div>
    <div style="padding:0 32px 28px;"></div>
  </div>
</body>
</html>`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Trado <notificaciones@trado.cl>",
        to: [buyerEmail],
        subject: `Te uniste a la sala #${referenceCode} — paga seguro con escrow`,
        html: emailHtml,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error from Resend API:", data);
      throw new Error(data.message || "Failed to send email");
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-payment-instructions function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
