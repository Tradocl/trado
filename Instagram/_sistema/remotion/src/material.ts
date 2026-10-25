// Material en bruto del reel: va en public/material/, que está en .gitignore
// porque el repo es público (fotos y voz de personas reales no se suben).
// Mientras un campo esté en null, el reel muestra un recuadro "TU CLIP" en su lugar.
export const MATERIAL: Record<string, string | null> = {
  hook: null, // "material/videos/hook.mp4"   tú a cámara: la frase del gancho
  calama: null, // "material/videos/calama.mp4"
  laSerena: null,
  cordillera: null,
  chiloe: null,
  remate: null, // tú a cámara: el remate final
  voz: null, // "material/voz/voz-en-off.m4a"  la voz en off de las escenas animadas
};
