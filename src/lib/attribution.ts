import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/**
 * De qué anuncio vino cada cuenta nueva.
 *
 * Los links de los anuncios llevan utm_source/medium/campaign/content (cada reel
 * su propio utm_content). Al llegar se guarda el último que trajo utm (vale 30
 * días) y, cuando esa persona crea su cuenta, queda en signup_attribution.
 * Sin esto la campaña de octubre 2026 sólo sabía "2 cuentas en total", no de
 * qué video. No depende del consentimiento de cookies del píxel: es medición
 * propia, sin terceros, y no guarda nada más que el link por el que llegó.
 */
const KEY = "trado_attribution";
const DIAS = 30;
const CAMPOS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;

type Atribucion = Partial<Record<(typeof CAMPOS)[number], string>> & { landing: string; at: number };

export function capturarAtribucion() {
  try {
    const q = new URLSearchParams(window.location.search);
    if (!CAMPOS.some((c) => q.get(c))) return;
    const a: Atribucion = { landing: window.location.pathname, at: Date.now() };
    for (const c of CAMPOS) {
      const v = q.get(c);
      if (v) a[c] = v.slice(0, 120);
    }
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    /* sin storage: no se atribuye, no se rompe nada */
  }
}

function leer(): Atribucion | null {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) ?? "null") as Atribucion | null;
    if (!a || Date.now() - a.at > DIAS * 864e5) return null;
    return a;
  } catch {
    return null;
  }
}

/** Una cuenta es "nueva" si se creó hace menos de 15 minutos (registro con correo o con Google). */
export function esCuentaNueva(user: User): boolean {
  const creada = Date.parse(user.created_at);
  return Number.isFinite(creada) && Date.now() - creada < 15 * 60 * 1000;
}

export async function guardarAtribucion(user: User) {
  const a = leer();
  const via = (user.app_metadata as { provider?: string } | undefined)?.provider ?? null;
  const { error } = await supabase.from("signup_attribution").insert({
    user_id: user.id,
    utm_source: a?.utm_source ?? null,
    utm_medium: a?.utm_medium ?? null,
    utm_campaign: a?.utm_campaign ?? null,
    utm_content: a?.utm_content ?? null,
    landing: a?.landing ?? null,
    via,
  });
  // 23505 = ya estaba (otra pestaña o un reintento): está bien.
  if (error && error.code !== "23505") console.log("No se pudo guardar la atribución", error.message);
}
