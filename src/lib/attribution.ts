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

/**
 * Navegador interno de Instagram o Facebook. Desde ahí llega casi todo lo de los anuncios,
 * pero Google no siempre deja iniciar sesión dentro de una app, y si la persona copia el
 * link a Safari o Chrome, el utm queda guardado en el navegador de Instagram y la cuenta
 * se crea sin origen (7 de las 10 cuentas nuevas de fines de octubre 2026).
 */
export function esNavegadorInterno(ua: string = navigator.userAgent): boolean {
  return /Instagram|FBAN|FBAV|FB_IAB/i.test(ua);
}

/** La misma página, con el utm guardado pegado en la URL para que el otro navegador lo recoja. */
export function urlConAtribucion(href: string = window.location.href): string {
  const url = new URL(href);
  const a = leer();
  if (a) {
    for (const c of CAMPOS) {
      if (a[c] && !url.searchParams.has(c)) url.searchParams.set(c, a[c]!);
    }
  }
  return url.toString();
}

/**
 * Link que saca la página del navegador interno: en Android abre el navegador del teléfono
 * con un intent, en iPhone abre Safari (x-safari-https, iOS 17 o más nuevo). Si el sistema
 * no lo reconoce no pasa nada: el botón además copia el link.
 */
export function urlNavegadorExterno(ua: string = navigator.userAgent, href?: string): string {
  const destino = urlConAtribucion(href);
  if (/Android/i.test(ua)) {
    const u = new URL(destino);
    return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;end`;
  }
  if (/iPhone|iPad|iPod/i.test(ua)) return destino.replace(/^https:\/\//, "x-safari-https://");
  return destino;
}
