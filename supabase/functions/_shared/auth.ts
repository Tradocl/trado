// Shared auth helpers for edge functions.
// Use requireServiceRole() for functions that are only meant to be called
// server-to-server (from other edge functions / cron / admin code).
// Use requireUser() for functions called from authenticated browser clients.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Supabase inyecta SUPABASE_SERVICE_ROLE_KEY en el formato nuevo (sb_secret_...),
// pero el gateway de Edge Functions sólo acepta el JWT legacy en el header
// Authorization: manda "Invalid API key" para el otro formato. Resultado: en una
// llamada servidor-a-servidor el token que llega NUNCA puede ser igual al de la
// variable de entorno, y requireServiceRole rechazaba a sus propios cron jobs.
// SERVICE_ROLE_JWT guarda el JWT legacy para poder reconocerlos.
const SERVICE_ROLE_JWT = Deno.env.get("SERVICE_ROLE_JWT");

function bearerToken(req: Request): string | null {
  const h = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!h) return null;
  const t = h.replace(/^Bearer\s+/i, "").trim();
  return t.length > 0 ? t : null;
}

/**
 * Allow only callers presenting the service-role key (or a valid admin JWT).
 * Returns Response on failure (caller should return it), or null on success.
 */
export async function requireServiceRole(req: Request): Promise<Response | null> {
  const token = bearerToken(req);
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (token === SERVICE_ROLE_KEY) return null;
  if (SERVICE_ROLE_JWT && token === SERVICE_ROLE_JWT) return null;

  // Allow admin JWT as well
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data?.user) {
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: data.user.id,
        _role: "admin",
      });
      if (isAdmin === true) return null;
    }
  } catch (_) { /* fall-through */ }

  return new Response(JSON.stringify({ error: "Forbidden" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Require a valid end-user JWT. Returns { user } on success or a Response on failure.
 */
export async function requireUser(
  req: Request,
): Promise<{ user: { id: string; email?: string } } | Response> {
  const token = bearerToken(req);
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return { user: { id: data.user.id, email: data.user.email ?? undefined } };
}

export function sanitizeHtml(s: string | undefined | null): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
