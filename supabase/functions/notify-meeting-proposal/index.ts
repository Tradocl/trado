import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendPushToUsers } from "../_shared/push.ts";
import {
  buildThreadHeaders,
  buildThreadSubject,
  escapeHtml,
  persistThreadAnchor,
  renderTransactionalEmail,
  sendEmail,
  SITE_URL,
  txUrl,
} from "../_shared/email-templates/notification.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReqBody {
  transactionId: string;
  proposerName?: string;
  recipientEmail?: string;
  recipientName?: string;
  productName: string;
  location: string;
  datetime: string;
  message?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: authData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !authData?.user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = authData.user.id;

    const { transactionId, productName, location, datetime, message }: ReqBody = await req.json();
    if (!transactionId || !productName || !location || !datetime) {
      return new Response(JSON.stringify({ error: "Datos incompletos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tx } = await supabase
      .from("transactions")
      .select("id, seller_id, buyer_id, product_name")
      .eq("id", transactionId)
      .maybeSingle();
    if (!tx) {
      return new Response(JSON.stringify({ error: "Transacción no encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (tx.seller_id !== callerId && tx.buyer_id !== callerId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const counterpartyId = tx.seller_id === callerId ? tx.buyer_id : tx.seller_id;
    if (!counterpartyId) {
      return new Response(JSON.stringify({ error: "Sin contraparte" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, nickname, email")
      .in("id", [callerId, counterpartyId]);
    const proposer = profiles?.find((p: any) => p.id === callerId);
    const recipient = profiles?.find((p: any) => p.id === counterpartyId);
    if (!recipient?.email) {
      return new Response(JSON.stringify({ error: "Sin email de contraparte" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const proposerName = escapeHtml(
      proposer?.nickname || proposer?.full_name || "La contraparte",
    );
    const recipientName = escapeHtml(
      recipient.nickname || recipient.full_name || "Usuario",
    );
    const safeProduct = escapeHtml(productName);
    const safeLocation = escapeHtml(location);
    const safeMessage = message ? escapeHtml(message) : "";

    const formattedDate = new Date(datetime).toLocaleDateString("es-CL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const refCode = transactionId.substring(0, 8).toUpperCase();
    const thread = await buildThreadHeaders(supabase, transactionId, refCode);

    const summaryRows = [
      { label: "Producto / servicio", value: safeProduct },
      { label: "Lugar propuesto", value: safeLocation },
      { label: "Fecha y hora", value: formattedDate, emphasis: true },
    ];
    if (safeMessage) {
      summaryRows.push({ label: "Mensaje", value: `<em>"${safeMessage}"</em>` });
    }

    const html = renderTransactionalEmail({
      recipientName,
      headline: "Nueva propuesta de encuentro",
      statusLine: `${proposerName} te propone un encuentro`,
      intro: `coordinaron una entrega en persona para <strong>${safeProduct}</strong>. Revisá la propuesta y aceptala o sugerí una alternativa.`,
      summaryTitle: "Detalles del encuentro",
      summaryRows,
      nextStep:
        "Si te acomoda, aceptá desde la sala. Si no, podés proponer otra fecha o lugar. La transacción avanza a “En entrega” al aceptar.",
      ctaText: "Ver propuesta y responder",
      ctaUrl: txUrl(transactionId),
      timelineActive: "in_delivery",
      referenceCode: refCode,
    });

    const subject = buildThreadSubject(thread, productName);

    await Promise.all([
      sendEmail({
        to: recipient.email,
        subject,
        html,
        headers: thread.headers,
      }),
      recipient.id
        ? sendPushToUsers([recipient.id], {
            title: "Trado · Propuesta de encuentro",
            body: `${proposerName} te propone un encuentro para ${safeProduct}`,
            url: `${SITE_URL()}/transaction/${transactionId}`,
            tag: `meeting-${transactionId}`,
          }).catch((e) => console.error("Push failed", e))
        : Promise.resolve(),
    ]);

    if (thread.isNewThread && thread.anchorId) {
      await persistThreadAnchor(supabase, transactionId, thread.anchorId);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-meeting-proposal]", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
