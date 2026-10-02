import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { acreditarPagoMP } from "../_shared/mp-deposit.ts";
import { alertarCritico } from "../_shared/alertas.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")!;
const MP_WEBHOOK_SECRET = Deno.env.get("MP_WEBHOOK_SECRET")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Verify Mercado Pago webhook signature per
// https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks#signature-validation
async function verifyMPSignature(req: Request, dataId: string): Promise<boolean> {
  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");
  if (!xSignature || !xRequestId) return false;

  const parts = Object.fromEntries(
    xSignature.split(",").map((p) => p.split("=").map((s) => s.trim()))
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(MP_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return computed === v1;
}

serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const event = await req.json();
    console.log("[mercadopago-webhook] Event:", event.type, JSON.stringify(event).slice(0, 400));

    // MP fires type="payment" for payment events; ignore non-payment topics
    const isPayment = event.type === "payment" || (event.action ?? "").startsWith("payment.");
    if (!isPayment) {
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    const paymentId = event.data?.id ?? event.id;
    if (!paymentId) {
      return new Response("Missing payment id", { status: 400 });
    }

    // Verify HMAC signature before doing any work
    const signatureValid = await verifyMPSignature(req, String(paymentId));
    if (!signatureValid) {
      console.error("[mercadopago-webhook] Invalid signature");
      return new Response("Invalid signature", { status: 401 });
    }

    // Re-fetch the payment from MP to verify authenticity and current status
    const payResp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { "Authorization": `Bearer ${MP_ACCESS_TOKEN}` },
    });

    if (!payResp.ok) {
      console.error("[mercadopago-webhook] Could not fetch payment:", paymentId, payResp.status);
      return new Response("Unauthorized", { status: 401 });
    }

    const pay = await payResp.json();
    const r = await acreditarPagoMP(supabase, pay, "mercadopago-webhook");
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

    switch (r.estado) {
      case "acreditado":
      case "ya_estaba":
      case "no_aprobado":
        return json({ received: true, estado: r.estado });
      case "no_es_de_trado":
        // Pagos que no salieron de create-mercadopago-payment (link de pago,
        // QR, etc.): no se acreditan a nadie. 200 para que MP no reintente.
        console.log(`[mercadopago-webhook] Pago ${paymentId} sin referencia de Trado, se ignora`);
        return json({ received: true, estado: r.estado });
      case "error":
        // 500 para que MP reintente; la cuadratura (reconcile-mercadopago)
        // también lo va a recoger. Pero que alguien se entere hoy.
        await alertarCritico({
          resumen: `Pago MP ${paymentId} cobrado y no acreditado`,
          accion: "La plata está en Mercado Pago y no en la billetera. La cuadratura lo reintenta cada 30 min; si el error sigue, revisar el detalle.",
          contexto: { pago: paymentId, monto: pay.transaction_amount, motivo: r.motivo },
          error: r.detalle instanceof Error ? r.detalle : JSON.stringify(r.detalle),
        });
        return json({ error: r.motivo }, 500);
    }
  } catch (error: any) {
    console.error("[mercadopago-webhook] Unexpected error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
