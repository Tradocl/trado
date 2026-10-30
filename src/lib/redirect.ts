// Adónde volver después de iniciar sesión. La ruta se guarda desde la URL que se estaba
// visitando, así que alguien puede armar un link como trado.cl//sitio-falso.com o
// trado.cl/\sitio-falso.com: React Router 6 los toma como otro dominio (GHSA-wrjc-x8rr-h8h6)
// y la persona terminaría, ya logueada, en una copia de Trado. Sólo se aceptan rutas internas.
export const rutaInternaSegura = (ruta: string | null | undefined): string | null => {
  if (!ruta || !ruta.startsWith("/")) return null;
  if (ruta.startsWith("//") || ruta.includes("\\")) return null;
  if (/[\u0000-\u001f]/.test(ruta)) return null;
  return ruta;
};
