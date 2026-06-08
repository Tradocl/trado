import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  buildThreadHeaders,
  buildThreadSubject,
  escapeHtml,
  formatCLP,
  persistThreadAnchor,
  renderTransactionalEmail,
  sendEmail,
  txUrl,
} from "../_shared/email-templates/notification.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { transactionId, email: buyerEmail } = await req.json();

    if (!transactionId || !buyerEmail) {
      return new Response(JSON.stringify({ error: "transactionId and email required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: tx, error: txError } = await supabase
      .from("transactions")
      .select("id, product_name, amount, commission, invite_code, sale_type, seller_id, profiles!transactions_seller_id_fkey(full_name)")
      .eq("id", transactionId)
      .single();

    if (txError || !tx) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (tx.seller_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // deno-lint-ignore no-explicit-any
    const seller = tx.profiles as any;
    const sellerName = escapeHtml(seller?.full_name || "El vendedor");
    const productName = escapeHtml(tx.product_name);
    const referenceCode = tx.id.substring(0, 8).toUpperCase();
    const inviteLink = `${Deno.env.get("SITE_URL") || "https://trado.cl"}/invite/${tx.id}`;

    // Try to get buyer's name from profiles for personalization
    const { data: buyerProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("email", buyerEmail)
      .maybeSingle();

    const buyerName = escapeHtml(buyerProfile?.full_name || "");

    const thread = await buildThreadHeaders(supabase, transactionId, referenceCode);

    const html = renderTransactionalEmail({
      recipientName: buyerName || "Hola",
      referenceCode,
      headline: `${sellerName} te invitó a una sala de venta`,
      statusLine: "Invitación directa",
      intro: `<strong>${sellerName}</strong> te invitó a una sala de compra segura en Trado para: <strong>${productName}</strong>. Únete para coordinar el pago protegido con escrow.`,
      summaryTitle: "Detalles de la operación",
      summaryRows: [
        { label: "Producto", value: productName },
        { label: "Monto total", value: formatCLP(Number(tx.amount)), emphasis: true },
        { label: "Vendedor", value: sellerName },
      ],
      nextStep: "Haz clic en el botón para unirte a la sala. El pago quedará protegido en custodia hasta que confirmes que recibiste todo correctamente.",
      timelineActive: "invited",
      ctaText: "Unirme a la sala",
      ctaUrl: inviteLink,
      footerNote: "Si no esperabas esta invitación, simplemente ignora este correo.",
      tone: "info",
    });

    await sendEmail({
      to: buyerEmail,
      subject: buildThreadSubject(thread, tx.product_name),
      html,
      headers: thread.headers,
    });

    if (thread.isNewThread && thread.anchorId) {
      await persistThreadAnchor(supabase, transactionId, thread.anchorId);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("invite-buyer error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
