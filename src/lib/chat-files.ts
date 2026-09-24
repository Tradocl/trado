/**
 * El bucket `chat-images` es privado: antes era público y cualquiera con el
 * enlace veía las fotos de una sala (comprobantes, direcciones). Los mensajes
 * guardan la URL "pública" histórica; para mostrarla se pide una URL firmada,
 * que el storage sólo entrega a las partes de la sala o a un admin.
 */
const MARCA = /\/storage\/v1\/object\/(?:public|sign|authenticated)\/chat-images\/([^?]+)/;

/** Ruta dentro del bucket a partir de la URL guardada, o null si no es del chat. */
export function chatPathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(MARCA);
  return m ? decodeURIComponent(m[1]) : null;
}
