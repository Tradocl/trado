import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireServiceRole } from "../_shared/auth.ts";
import {
  escapeHtml,
  formatCLP,
  renderTransactionalEmail,
  sendEmail,
  walletUrl,
} from "../_shared/email-templates/notification.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function isValidEmail(email: unknown): boolean {
  return typeof email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const authFail = await requireServiceRole(req);
  if (authFail) {
    return new Response(authFail.body, {
      status: authFail.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const body = await req.json();
    if (!isValidEmail(body.userEmail)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userName = escapeHtml(body.userName || "Usuario");
    const type = body.movementType === "withdrawal" ? "withdrawal" : "deposit";
    const isDeposit = type === "deposit";
    const amount = Number(body.amount) || 0;
    const status = body.status === "approved" ? "approved" : "rejected";
    const approved = status === "approved";
    const description = body.description
      ? escapeHtml(String(body.description).slice(0, 500))
      : "";

    const headline = approved
      ? isDeposit
        ? "Depósito acreditado"
        : "Retiro aprobado"
      : isDeposit
        ? "Depósito rechazado"
        : "Retiro rechazado";

    const intro = approved
      ? isDeposit
        ? `tu depósito por <strong>${formatCLP(amount)}</strong> fue acreditado en tu billetera Trado.`
        : `tu retiro por <strong>${formatCLP(amount)}</strong> fue aprobado. Ya se procesó la transferencia a tu cuenta bancaria.`
      : isDeposit
        ? `no pudimos validar tu depósito por <strong>${formatCLP(amount)}</strong>.`
        : `tu solicitud de retiro por <strong>${formatCLP(amount)}</strong> fue rechazada.`;

    const summary = [
      { label: "Tipo", value: isDeposit ? "Depósito" : "Retiro" },
      { label: "Monto", value: formatCLP(amount), emphasis: true },
      { label: "Estado", value: approved ? "Aprobado" : "Rechazado" },
    ];
    if (description) {
      summary.push({ label: "Detalle", value: description });
    }

    const html = renderTransactionalEmail({
      recipientName: userName,
      headline,
      statusLine: approved ? "Operación confirmada" : "Operación rechazada",
      intro,
      summaryTitle: "Resumen del movimiento",
      summaryRows: summary,
      nextStep: approved
        ? isDeposit
          ? "Ya puedes usar tu saldo para pagar en cualquier sala Trado."
          : "Recordá que la acreditación bancaria puede tardar hasta 24 h hábiles según tu banco."
        : "Si crees que es un error, responde este correo y revisamos tu caso.",
      ctaText: "Ir a Mi Billetera",
      ctaUrl: walletUrl(),
    });

    const subject = `${approved ? "Operación aprobada" : "Operación rechazada"} · ${
      isDeposit ? "Depósito" : "Retiro"
    } ${formatCLP(amount)}`;

    const result = await sendEmail({
      to: body.userEmail,
      subject,
      html,
    });
    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-movement-notification]", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
