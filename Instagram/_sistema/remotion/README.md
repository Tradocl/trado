# Reels con Remotion

Segundo motor de reels, para los que mezclan clips grabados (tú a cámara, tu voz)
con animación. Los reels 100 % animados siguen en `../reels/` (Pillow).
Usa la misma marca (colores, Plus Jakarta Sans, zona segura) y los mismos
efectos de sonido que ese motor.

## Primera vez

```bash
npm install
npm run sfx     # exporta los efectos de ../reels/sonido.py a public/sfx/
npm run mapa    # solo si cambias ciudades: regenera src/chile.ts
```

## Día a día

```bash
npm run studio  # vista previa en el navegador, con línea de tiempo
npm run render  # out/reel-crudo.mp4
npm run final   # render + volumen normalizado (-15 LUFS, como los otros reels) -> out/reel.mp4
```

## Material propio

Clips, fotos y voz van en `public/material/{videos,fotos,voz,generado}`.
Esa carpeta está en `.gitignore`: **el repo es público y el material en bruto
nunca se sube.** Para usar un clip, pon su ruta en `src/material.ts`
(p. ej. `hook: "material/videos/hook.mp4"`). Mientras un campo esté en `null`,
el reel muestra un recuadro "TU CLIP" en su lugar.

Graba en vertical (9:16), con luz de frente y fondo liso si el clip va recortado.

Para preparar una toma (fondo fuera + audio limpio), con los segundos de inicio y fin:

```bash
python scripts/recorte.py public/material/videos/prueba-1.mp4 22.8 35.1 public/material/generado/duda.webm
python scripts/audio.py   public/material/videos/prueba-1.mp4 22.8 35.1 public/material/generado/duda.wav
```

`src/Reel.tsx` lista qué tramo del video usa cada escena.

## Archivos

- `src/marca.ts`: colores, fuente y curvas de animación
- `src/piezas/`: piezas reutilizables (título, subtítulo, chat, sala, mapa, postales)
- `src/Reel.tsx`: reel "Desde donde quieras" armado con tus tomas (formato green screen)
- `src/Hook.tsx`: su gancho, con el feed de publicaciones atrás
- `src/Regiones.tsx`: el primer borrador, todo animado con recuadros "TU CLIP"

Las afirmaciones sobre Trado (plazos, comisión, estados) se verifican contra el
código antes de publicar, igual que en los reels de Pillow.
