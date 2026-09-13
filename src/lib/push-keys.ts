/**
 * Llave pública VAPID, la que el navegador usa para suscribirse a push.
 *
 * No es secreta: por diseño viaja al cliente. La privada vive sólo como secret
 * en Supabase (`VAPID_PRIVATE_KEY`) y es la que firma cada notificación.
 *
 * ⚠️ Tiene que ser el par de la privada. Si dejan de calzar, los navegadores
 * rechazan las notificaciones y las suscripciones existentes quedan inservibles.
 *
 * Antes estaba escrita a mano acá y además leída de una variable de entorno en
 * el flujo nativo, o sea dos fuentes que podían divergir. Peor: la privada de
 * esa llave nunca se guardó, así que push jamás funcionó desde que existe.
 * Regeneradas ambas el 2026-09-13.
 */
export const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  "BDvsAj5Oj55UvT2aXsXhr_vKo02bt0n-gEFg8TtGUmGivX2fwVVW4oleDdI0AZH_PC_I9stRjCTb97nRsJl-fbU";

/** Convierte la llave base64url al formato que pide el navegador. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
