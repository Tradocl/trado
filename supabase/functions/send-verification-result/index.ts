import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireServiceRole } from "../_shared/auth.ts";
import {
  escapeHtml,
  renderTransactionalEmail,
  sendEmail,
  SITE_URL,
} from "../_shared/email-templates/notification.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReqBody {
  profileId: string;
  userEmail: string;
  userName: string;
  status: "approved" | "rejected";
  rejectionReason?: string;
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
    const { profileId, userEmail, userName, status, rejectionReason }: ReqBody =
      await req.json();
    if (!profileId || !userEmail || !userName || !["approved", "rejected"].includes(status)) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: profile, error: pErr } = await admin
      .from("profiles")
      .select(
        "verification_status, verification_submitted_at, verification_result_email_key",
      )
      .eq("id", profileId)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (profile.verification_status !== status) {
      return new Response(JSON.stringify({ error: "Status mismatch" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const submissionKey = profile.verification_submitted_at || "no-submission-date";
    const emailKey = `${status}:${submissionKey}`;
    const { data: claimed, error: claimError } = await admin
      .from("profiles")
      .update({
        verification_result_email_key: emailKey,
        verification_result_email_status: status,
        verification_result_email_sent_at: new Date().toISOString(),
      })
      .eq("id", profileId)
      .neq("verification_result_email_key", emailKey)
      .select("id")
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) {
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const approved = status === "approved";
    const safeName = escapeHtml(userName);
    const html = approved
      ? renderTransactionalEmail({
          recipientName: safeName,
          headline: "¡Verificación aprobada!",
          statusLine: "Tu identidad fue confirmada",
          intro:
            "tu identidad fue verificada con éxito. Tu cuenta ahora muestra el sello de verificada, lo que aumenta la confianza en cada transacción.",
          nextStep:
            "Ya podés operar sin los límites de cuenta no verificada. ¡Bienvenido al ecosistema Trado!",
          ctaText: "Ir al dashboard",
          ctaUrl: `${SITE_URL()}/dashboard`,
        })
      : renderTransactionalEmail({
          recipientName: safeName,
          headline: "Verificación no aprobada",
          statusLine: "Necesitamos que reintentes el envío",
          intro:
            "no pudimos verificar tu identidad con los documentos enviados.",
          summaryTitle: rejectionReason ? "Motivo del rechazo" : "Posibles motivos",
          summaryRows: rejectionReason
            ? [{ label: "Detalle", value: escapeHtml(rejectionReason) }]
            : [
                { label: "•", value: "Documento poco legible o cortado" },
                { label: "•", value: "Selfie no muestra tu rostro y el carnet" },
                { label: "•", value: "Datos del carnet no coinciden con tu perfil" },
                { label: "•", value: "Documento vencido o inválido" },
              ],
          nextStep:
            "Reintenta el envío con fotos claras, bien iluminadas y donde se vea el documento completo y tu rostro.",
          ctaText: "Intentar nuevamente",
          ctaUrl: `${SITE_URL()}/verification`,
          footerNote:
            "Si tenés dudas, respondé este correo y te ayudamos.",
        });

    try {
      await sendEmail({
        to: userEmail,
        subject: approved
          ? "Tu verificación fue aprobada"
          : "Tu verificación no fue aprobada",
        html,
      });
    } catch (sendErr) {
      // Roll back the claim
      await admin
        .from("profiles")
        .update({
          verification_result_email_key: profile.verification_result_email_key,
          verification_result_email_status: null,
          verification_result_email_sent_at: null,
        })
        .eq("id", profileId)
        .eq("verification_result_email_key", emailKey);
      throw sendErr;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-verification-result]", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
