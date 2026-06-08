import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  escapeHtml,
  renderTransactionalEmail,
  sendEmail,
  SITE_URL,
} from "../_shared/email-templates/notification.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const authHeader = req.headers.get("Authorization") ||
    req.headers.get("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const authClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData?.user?.id) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const user = {
    id: userData.user.id,
    email: userData.user.email as string | undefined,
  };

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: profile } = await admin
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .maybeSingle();
    const email = profile?.email || user.email;
    const userName = escapeHtml(profile?.full_name || "Usuario");
    if (!email) {
      return new Response(JSON.stringify({ error: "No email available" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Atomic lock to avoid duplicate welcome emails
    const { data: claimed, error: claimError } = await admin
      .from("profiles")
      .update({ welcome_email_sent: true })
      .eq("id", user.id)
      .eq("welcome_email_sent", false)
      .select("id")
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) {
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = renderTransactionalEmail({
      recipientName: userName,
      headline: "Bienvenido a Trado",
      statusLine: "Tu cuenta está lista",
      intro:
        "te damos la bienvenida a la plataforma de transacciones seguras entre personas en Chile. Ya puedes crear o unirte a salas para comprar y vender con custodia de fondos.",
      summaryTitle: "Cómo funciona en 3 pasos",
      summaryRows: [
        { label: "1.", value: "Creá o unite a una sala con un comprador/vendedor" },
        { label: "2.", value: "El comprador deposita en su billetera Trado" },
        { label: "3.", value: "Liberamos el pago al confirmar la recepción" },
      ],
      nextStep:
        "Completa tu perfil y verifica tu identidad para operar sin límites.",
      ctaText: "Ir al dashboard",
      ctaUrl: `${SITE_URL()}/dashboard`,
      secondaryCtaText: "Cargar saldo en Mi Billetera",
      secondaryCtaUrl: `${SITE_URL()}/wallet`,
      footerNote:
        "¿Necesitás ayuda? Escribinos en cualquier momento a soporte@trado.cl.",
    });

    try {
      await sendEmail({
        from: "Trado <bienvenida@trado.cl>",
        to: email,
        subject: "Bienvenido a Trado · tu cuenta está lista",
        html,
      });
    } catch (sendErr) {
      // Roll back lock so a retry can resend
      await admin.from("profiles").update({ welcome_email_sent: false }).eq("id", user.id);
      throw sendErr;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-welcome-email]", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
