import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  escapeHtml,
  renderTransactionalEmail,
  sendEmail,
} from "../_shared/email-templates/notification.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "full_name, email, rut, phone, verification_document_url, verification_selfie_url",
      )
      .eq("id", user.id)
      .single();
    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userName = escapeHtml(profile.full_name || "Usuario");
    const docUrl = profile.verification_document_url || "#";
    const selfieUrl = profile.verification_selfie_url || "#";

    const html = renderTransactionalEmail({
      recipientName: "equipo Trado",
      headline: "Nueva verificación de identidad",
      statusLine: "Pendiente de revisión",
      summaryTitle: "Datos del usuario",
      summaryRows: [
        { label: "Nombre", value: userName },
        { label: "Email", value: escapeHtml(profile.email || "—") },
        { label: "RUT", value: escapeHtml(profile.rut || "—") },
        { label: "Teléfono", value: escapeHtml(profile.phone || "—") },
        { label: "ID", value: `<code>${escapeHtml(user.id)}</code>` },
        { label: "Carnet", value: `<a href="${escapeHtml(docUrl)}">Ver documento</a>` },
        { label: "Selfie", value: `<a href="${escapeHtml(selfieUrl)}">Ver selfie</a>` },
      ],
      nextStep:
        "Revisa los archivos en el panel admin y aprueba o rechaza la verificación con un motivo claro.",
      ctaText: "Abrir panel admin",
      ctaUrl: `${Deno.env.get("SITE_URL") || "https://trado.cl"}/admin/verifications`,
    });

    const result = await sendEmail({
      to: "admin@trado.cl",
      subject: `[Admin] Verificación pendiente · ${userName}`,
      html,
    });
    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-verification-submitted]", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
