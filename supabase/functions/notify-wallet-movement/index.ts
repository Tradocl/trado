import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  escapeHtml,
  formatCLP,
  renderTransactionalEmail,
  sendEmail,
} from "../_shared/email-templates/notification.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function isValidUuid(v: unknown): boolean {
  return typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(v);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = await req.json();
    if (!isValidUuid(body.movementId)) {
      return new Response(JSON.stringify({ error: "Invalid movement ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: movement, error } = await supabase
      .from("wallet_movements")
      .select(`
        id, type, amount, bank_holder_name, bank_holder_rut, bank_name,
        bank_account_type, bank_account_number,
        wallets!inner ( user_id, profiles!inner ( full_name, email ) )
      `)
      .eq("id", body.movementId)
      .single();
    if (error || !movement) {
      return new Response(JSON.stringify({ error: "Movement not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const wallet = movement.wallets as any;
    if (wallet.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const profile = wallet.profiles as any;
    const isDeposit = movement.type === "deposit";
    const amount = Number(movement.amount) || 0;

    const summary = [
      { label: "Tipo", value: isDeposit ? "Depósito" : "Retiro" },
      { label: "Monto", value: formatCLP(amount), emphasis: true },
      { label: "Usuario", value: escapeHtml(profile?.full_name || "—") },
      { label: "Email", value: escapeHtml(profile?.email || "—") },
      { label: "ID movimiento", value: `<code>${escapeHtml(movement.id)}</code>` },
    ];
    if (!isDeposit) {
      summary.push(
        { label: "Titular", value: escapeHtml(movement.bank_holder_name || "—") },
        { label: "RUT", value: escapeHtml(movement.bank_holder_rut || "—") },
        { label: "Banco", value: escapeHtml(movement.bank_name || "—") },
        { label: "Tipo cuenta", value: escapeHtml(movement.bank_account_type || "—") },
        { label: "N° cuenta", value: escapeHtml(movement.bank_account_number || "—") },
      );
    }

    const html = renderTransactionalEmail({
      recipientName: "equipo Trado",
      headline: isDeposit
        ? "Nueva solicitud de depósito"
        : "Nueva solicitud de retiro",
      statusLine: "Revisión manual requerida",
      summaryTitle: "Datos del movimiento",
      summaryRows: summary,
      nextStep: isDeposit
        ? "Verificá la transferencia bancaria recibida y aprobá o rechazá la solicitud desde el panel admin."
        : "Realizá la transferencia a los datos bancarios indicados y aprobá la solicitud al finalizar.",
      ctaText: "Abrir panel admin",
      ctaUrl: `${Deno.env.get("SITE_URL") || "https://trado.cl"}/admin/wallet-movements`,
    });

    const subject = isDeposit
      ? `[Admin] Nuevo depósito · ${formatCLP(amount)}`
      : `[Admin] Nuevo retiro · ${formatCLP(amount)}`;

    const result = await sendEmail({ to: "admin@trado.cl", subject, html });
    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-wallet-movement]", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
