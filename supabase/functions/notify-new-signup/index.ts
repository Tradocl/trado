import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireServiceRole } from "../_shared/auth.ts";
import { escapeHtml, OPS_ALERT_EMAIL, renderTransactionalEmail, sendEmail } from "../_shared/email-templates/notification.ts";

// Avisa a transacciones@trado.cl (OPS_ALERT_EMAIL: seguimiento, no exige acción) cada vez que se crea una cuenta. La llama el trigger notify_new_signup_trg al
// insertarse el perfil (migración 20261104000000), así que llega también con las cuentas de
// email que nunca confirman. Espera unos segundos porque signup_attribution (de qué anuncio
// llegó) lo escribe el navegador justo después de crearse la cuenta.
//
// Body: { user_id: string }

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function origen(a: { utm_source?: string | null; utm_medium?: string | null; utm_content?: string | null } | null): string {
  if (!a || (!a.utm_source && !a.utm_content)) return "Sin origen (directo, búsqueda o se perdió al cambiar de navegador)";
  if (a.utm_content === "link_in_bio") return "Link de la bio de Instagram";
  if (a.utm_medium === "paid") return `Anuncio de Meta (anuncio ${a.utm_content ?? "?"})`;
  return [a.utm_source, a.utm_medium, a.utm_content].filter(Boolean).join(" / ");
}

serve(async (req) => {
  const authFail = await requireServiceRole(req);
  if (authFail) return authFail;

  let userId: string;
  try {
    userId = String(((await req.json()) as { user_id?: unknown }).user_id ?? "");
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 });
  }
  if (!/^[0-9a-f-]{36}$/.test(userId)) {
    return new Response(JSON.stringify({ error: "user_id inválido" }), { status: 400 });
  }

  // Tiempo para que el navegador alcance a guardar el origen
  await new Promise((r) => setTimeout(r, 20_000));

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const [{ data: perfil }, { data: usuario }, { data: atrib }, { count: total }] = await Promise.all([
    admin.from("profiles").select("full_name, email, created_at").eq("id", userId).maybeSingle(),
    admin.auth.admin.getUserById(userId),
    admin.from("signup_attribution").select("utm_source, utm_medium, utm_content").eq("user_id", userId).maybeSingle(),
    admin.from("profiles").select("id", { count: "exact", head: true }),
  ]);

  const email = perfil?.email ?? usuario?.user?.email ?? "(sin email)";
  const via = usuario?.user?.app_metadata?.provider === "google" ? "Google" : "Email";
  const confirmado = usuario?.user?.email_confirmed_at ? "Sí" : "Todavía no";
  const hora = new Date(perfil?.created_at ?? Date.now()).toLocaleString("es-CL", { timeZone: "America/Santiago" });

  const html = renderTransactionalEmail({
    recipientName: "equipo",
    eyebrow: "Nueva cuenta",
    headline: `${escapeHtml(perfil?.full_name || "Alguien")} se creó una cuenta`,
    tone: "celebrate",
    intro: `ya van <b>${total ?? "?"}</b> cuentas en Trado.`,
    summaryTitle: "Datos de la cuenta",
    summaryRows: [
      { label: "Nombre", value: escapeHtml(perfil?.full_name || "-") },
      { label: "Email", value: escapeHtml(email) },
      { label: "Se registró con", value: via },
      { label: "Email confirmado", value: confirmado },
      { label: "De dónde llegó", value: escapeHtml(origen(atrib)) },
      { label: "Cuándo", value: hora },
    ],
    footerBand: "Aviso interno de Trado",
  });

  await sendEmail({
    from: "Trado <notificaciones@trado.cl>",
    to: OPS_ALERT_EMAIL(),
    subject: `Nueva cuenta: ${perfil?.full_name || email}`,
    html,
  });

  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
