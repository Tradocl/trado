// Recibe un mensaje del formulario de soporte, abre el ticket por email a
// contacto@trado.cl y le confirma la recepción al usuario.
// Reemplaza a la herramienta escalateToHuman del antiguo chat con IA.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireUser, sanitizeHtml } from "../_shared/auth.ts";
import {
  renderTransactionalEmail,
  sendEmail,
} from "../_shared/email-templates/notification.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE = Deno.env.get("SITE_URL") || "https://trado.cl";
const SUPPORT_INBOX = "contacto@trado.cl";

const MAX_SUBJECT = 120;
const MAX_MESSAGE = 4000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  let subject: string;
  let message: string;
  try {
    const body = await req.json() as { subject?: string; message?: string };
    subject = (body.subject ?? "").trim();
    message = (body.message ?? "").trim();
  } catch {
    return json({ error: "Cuerpo inválido" }, 400);
  }

  if (!subject || !message) {
    return json({ error: "Asunto y mensaje son obligatorios" }, 400);
  }
  if (subject.length > MAX_SUBJECT) {
    return json({ error: `El asunto no puede superar ${MAX_SUBJECT} caracteres` }, 400);
  }
  if (message.length > MAX_MESSAGE) {
    return json({ error: `El mensaje no puede superar ${MAX_MESSAGE} caracteres` }, 400);
  }

  const userEmail = user.email ?? "(sin email)";

  // Nombre para personalizar la confirmación; si no hay perfil, cae al email.
  let recipientName = user.email?.split("@")[0] ?? "usuario";
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    const fullName = (profile?.full_name ?? "").trim();
    if (fullName) recipientName = fullName.split(/\s+/)[0];
  } catch (e) {
    console.error("[send-support-message] no se pudo leer el perfil", e);
  }

  try {
    // 1. Ticket al equipo
    await sendEmail({
      from: "Trado Soporte <contacto@trado.cl>",
      to: SUPPORT_INBOX,
      replyTo: user.email,
      subject: `[Soporte] ${subject.slice(0, 80)}`,
      html: `<h2>Nuevo mensaje de soporte</h2>
        <p><b>Usuario:</b> ${sanitizeHtml(userEmail)}</p>
        <p><b>User ID:</b> ${sanitizeHtml(user.id)}</p>
        <p><b>Asunto:</b> ${sanitizeHtml(subject)}</p>
        <p><b>Mensaje:</b></p>
        <pre style="white-space:pre-wrap;font-family:inherit">${sanitizeHtml(message)}</pre>
        <hr/>
        <p style="color:#888;font-size:12px">Enviado desde el centro de ayuda de Trado</p>`,
    });

    // 2. Confirmación al usuario. Si falla, el ticket ya entró: no es motivo de error.
    if (user.email) {
      try {
        await sendEmail({
          to: user.email,
          subject: "Recibimos tu mensaje de soporte · Trado",
          html: renderTransactionalEmail({
            recipientName,
            headline: "Recibimos tu mensaje",
            statusLine: "Te respondemos en 24h hábiles",
            tone: "info",
            intro:
              "gracias por escribirnos. Un miembro del equipo Trado revisará tu caso y te responderá a este correo lo antes posible.",
            summaryTitle: "Tu mensaje",
            summaryRows: [
              { label: "Asunto", value: sanitizeHtml(subject) },
              { label: "Mensaje", value: sanitizeHtml(message) },
            ],
            ctaText: "Volver al centro de ayuda",
            ctaUrl: `${SITE}/support`,
          }),
        });
      } catch (e) {
        console.error("[send-support-message] confirmación al usuario falló", e);
      }
    }

    return json({ ok: true });
  } catch (e) {
    console.error("[send-support-message] error", e);
    return json({ error: "No se pudo enviar el mensaje. Intenta nuevamente." }, 500);
  }
});
