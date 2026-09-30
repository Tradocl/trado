/**
 * Píxel de Meta, para medir qué anuncios de Instagram/Facebook traen registros.
 *
 * Solo se carga si hay ID y si la persona tocó "Aceptar todo" en el banner de
 * cookies ("Solo esenciales" lo deja apagado). Sin ID no hace nada, así que se
 * puede desplegar antes de tener la cuenta publicitaria lista.
 *
 * El ID del píxel es público (va en el HTML de cualquier sitio que lo use):
 * va fijo aquí; VITE_META_PIXEL_ID en Vercel lo reemplaza si algún día cambia.
 * Píxel "Trado web" del portafolio "trado | negocia seguro" (business
 * 1729253141780740), el mismo de la cuenta publicitaria "Trado ads". El primer
 * píxel (2622592151544928) quedó en otro portafolio y Meta no deja compartirlo
 * con socios hasta que el portafolio cumpla semanas: por eso se reemplazó.
 */
const META_PIXEL_ID: string = import.meta.env.VITE_META_PIXEL_ID || "28314429144904443";

export const COOKIE_KEY = "trado_cookie_consent";
export const CONSENT_EVENT = "trado:cookie-consent";

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue: unknown[]; loaded: boolean; version: string; push: unknown };
declare global {
  interface Window { fbq?: Fbq; _fbq?: Fbq }
}

function consentido(): boolean {
  try {
    return localStorage.getItem(COOKIE_KEY) === "accepted";
  } catch {
    return false;
  }
}

let cargado = false;

function cargar(): boolean {
  if (cargado) return true;
  if (!META_PIXEL_ID || typeof window === "undefined" || !consentido()) return false;
  // Snippet oficial de Meta, sin minificar.
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);
  fbq("init", META_PIXEL_ID);
  cargado = true;
  return true;
}

export function trackPageView() {
  if (cargar()) window.fbq?.("track", "PageView");
}

/** Cuenta creada (el formulario de registro terminó sin error). */
export function trackRegistro() {
  if (cargar()) window.fbq?.("track", "CompleteRegistration");
}
