import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireServiceRole } from "../_shared/auth.ts";
import { escapeHtml, renderTransactionalEmail, sendEmail, SITE_URL } from "../_shared/email-templates/notification.ts";
import { PRIMERA_SALA_GRATIS_HASTA } from "../_shared/pricing.ts";

// Le pregunta a cuentas nuevas cómo les fue al registrarse y qué las frenó para crear su
// primera sala. Sólo la llama un admin o el servidor, y el mensaje va fijo acá: no sirve
// para mandar cualquier correo. Las respuestas llegan a contacto@trado.cl.
//
// Body: { user_ids: string[], dry_run?: boolean }. Con dry_run devuelve a quiénes iría.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAX_POR_ENVIO = 50;

const clp = (n: number) => "$" + n.toLocaleString("es-CL");

function correo(nombre: string): string {
  return renderTransactionalEmail({
    recipientName: nombre,
    eyebrow: "Tu opinión",
    headline: "¿Cómo te fue con Trado?",
    tone: "info",
    intro:
      "te escribimos del equipo de Trado. Vimos que hace poco te creaste una cuenta y queríamos preguntarte:" +
      "<ul style=\"margin:12px 0 0;padding-left:20px;\">" +
      "<li>¿Cómo te fue creándote la cuenta? ¿Algo te costó o no se entendía?</li>" +
      "<li>¿Qué tenías pensado comprar, vender o cobrar con Trado?</li>" +
      "<li>Si todavía no creas una sala, ¿qué te frenó?</li>" +
      "</ul>",
    nextStep:
      "Basta con que respondas este correo, aunque sea con una línea. Nos sirve muchísimo para mejorar. " +
      `Y por ser de los primeros, <b>tu primera sala va sin comisión</b> (hasta ${clp(PRIMERA_SALA_GRATIS_HASTA)}).`,
    ctaText: "Crear mi primera sala",
    ctaUrl: `${SITE_URL()}/create-transaction`,
    footerNote: "Gracias por probar Trado. — El equipo de Trado",
    footerBand: "Responde este correo y lo lee una persona del equipo de Trado",
  });
}

serve(async (req) => {
  const authFail = await requireServiceRole(req);
  if (authFail) return authFail;

  let ids: string[];
  let dryRun = false;
  try {
    const body = await req.json() as { user_ids?: unknown; dry_run?: unknown };
    ids = Array.isArray(body.user_ids) ? body.user_ids.filter((x): x is string => typeof x === "string") : [];
    dryRun = body.dry_run === true;
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 });
  }
  if (ids.length === 0 || ids.length > MAX_POR_ENVIO) {
    return new Response(JSON.stringify({ error: `Entre 1 y ${MAX_POR_ENVIO} user_ids` }), { status: 400 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: perfiles, error } = await admin
    .from("profiles")
    .select("id, email, full_name, nickname")
    .in("id", ids);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const resultado: { id: string; email: string; ok: boolean; error?: string }[] = [];
  for (const p of perfiles ?? []) {
    if (!p.email) continue;
    const nombre = escapeHtml((p.nickname || p.full_name || "").split(" ")[0] || "hola");
    if (dryRun) {
      resultado.push({ id: p.id, email: p.email, ok: true });
      continue;
    }
    try {
      await sendEmail({
        from: "Trado <contacto@trado.cl>",
        to: p.email,
        replyTo: "contacto@trado.cl",
        subject: "¿Cómo te fue con Trado?",
        html: correo(nombre),
      });
      resultado.push({ id: p.id, email: p.email, ok: true });
    } catch (e) {
      resultado.push({ id: p.id, email: p.email, ok: false, error: String((e as Error).message ?? e) });
    }
    // Resend acepta pocas por segundo
    await new Promise((r) => setTimeout(r, 600));
  }

  return new Response(JSON.stringify({ dry_run: dryRun, enviados: resultado }), {
    headers: { "Content-Type": "application/json" },
  });
});
