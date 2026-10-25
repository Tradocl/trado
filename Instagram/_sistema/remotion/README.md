# Reels con Remotion: tú a cámara + animación

Segundo motor de reels, para los que mezclan tu grabación (tu cara, tu voz) con
animación de marca. Los reels 100 % animados siguen en `../reels/` (Pillow).
Usa la misma marca (colores, Plus Jakarta Sans, zona segura) y los mismos
efectos de sonido que ese motor.

El primero hecho así es «Desde donde quieras» (post 15): `src/reels/DesdeDondeQuieras.tsx`,
guion en `guion/desde-donde-quieras.md`. Para uno nuevo, copia ese archivo y cámbiale las escenas.

## El estilo

- Se alterna **lo orgánico** (tu video tal cual, con tu fondo real y las animaciones
  entre el fondo y tú) con **la marca** (tu recorte sobre fondo azul, el chat o el esquema).
  El paso entre los dos es un círculo que se cierra hacia tu cara.
- En cada frase cambias de lugar (`modos`): abajo, cerca, a un lado, fuera de cuadro.
  Eso, más cortar las pausas, es lo que da ritmo ("jump cuts").
- Todo lo que dices aparece en subtítulos palabra por palabra: se entiende sin sonido.
- Cada idea dicha tiene su imagen en el mismo instante (dices "piedra" y cae la piedra).

## Primera vez

```bash
npm install
npm run sfx     # efectos de ../reels/sonido.py y música de fondo (scripts/musica.py) a public/sfx/
npm run mapa    # solo si cambias ciudades: regenera src/chile.ts
pip install faster-whisper opencv-python rembg imageio-ffmpeg numpy pillow
```

## Paso a paso para un reel nuevo

Cada reel tiene su carpeta de material, **fuera de git** (el repo es público y ahí van
tu cara y tu voz en bruto):

```
public/material/<reel>/
  originales/      lo que sale del celular (.MOV), tal cual
  video.mp4        la grabación convertida, la única que se usa
  palabras.json    transcripción palabra por palabra
  generado/        <toma>.wav (voz limpia) y <toma>.webm (tu recorte sin fondo)
```

1. **Grabar** (ver consejos abajo) y copiar el .MOV a `originales/`.
2. **Convertir** a SDR y 30 fps (el HDR del iPhone se ve lavado en Remotion):
   `python scripts/convertir.py public/material/<reel>/originales/IMG_1234.MOV public/material/<reel>/video.mp4`
3. **Transcribir**: `python scripts/transcribir.py public/material/<reel>/video.mp4`.
   Imprime cada frase con su segundo y marca las pausas (⏸). Con eso eliges la mejor
   toma de cada frase (si repetiste, casi siempre la última completa).
4. **Revisar a ojo** las tomas candidatas: `python scripts/hoja.py public/material/<reel>/video.mp4 out/hoja.jpg 6.8,11.8,19.2`
   (o `cada=0.7`). Una sola imagen con los cuadros: ojos abiertos, sin manos tapando, etc.
5. **Medir la cara** de cada toma: `python scripts/caras.py public/material/<reel>/video.mp4 hook:6.8:11.8 duda:19.2:29.7 ...`
6. **Preparar las tomas** (voz limpia + recorte; ~1 s por cuadro, un reel de 40 s tarda ~20 min):
   `python scripts/tomas.py <reel> hook:6.8:11.8 duda:19.2:29.7 ...`
7. **Armar las escenas** en `src/reels/<Reel>.tsx` y registrarlo en `src/Root.tsx`:
   - `<Toma carpeta archivo origen cara linea palabras modos>`: una por frase.
   - `linea([[a, b], [c, d]])`: qué tramos de la toma se usan; lo que queda entre medio
     (pausas, muletillas) se corta. `L.en(seg)` pasa un segundo de la toma al cuadro del reel.
   - `palabras`: el subtítulo con el segundo de cada palabra (sale de palabras.json, restando el inicio de la toma).
   - `modos`: `[[seg, "real" | "abajo" | "cerca" | "izq" | "der" | "fuera"], ...]`.
   - `children` va entre tu fondo y tú; `encima`, sobre ti (lo que te cae en la cabeza).
   - `<Desde en hasta>` para que una pieza viva solo en un tramo de la escena.
   - Piezas listas en `src/piezas/`: Publicacion, Chat, Mapa, Esquema, Sala, Postal,
     Pildora, Palabra, Salto, Confeti, Rayos, Destello, Sfx.
8. **Mirar** con `npm run studio`, y antes de dar por listo, una hoja del render cada 0,7 s
   (`python scripts/hoja.py out/<Id>.mp4 out/hoja.jpg cada=0.7`).
9. **Render final**: `python scripts/final.py <Id> --a "NN Nombre"` y lo mismo con `--sin-musica`.
   Deja `reel.mp4` y `reel-sin-musica.mp4` en `Instagram/2 Reels/NN Nombre/`.
10. **Portada** en `../feed/NN-reelXX-portada/portada.html` (1080×1920; la grilla muestra
    el centro 3:4, de y 240 a 1680). Para sacarte del video: un cuadro de `generado/<toma>.webm`
    con sonrisa de verdad. `node render.mjs feed/NN-reelXX-portada` desde `_sistema`.
11. **Caption** en `2 Reels/NN Nombre/caption.txt`, con el mismo formato que los demás
    (texto, hashtags y la parte "NO COPIAR" con cómo configurar la publicación).

## Consejos para grabar

- Vertical, 30 fps. Si el iPhone graba en HDR, no pasa nada: `convertir.py` lo arregla.
- Luz de frente (ventana o lámpara detrás del celular), nunca detrás tuyo.
- Fondo lo más simple posible: el recorte se ensucia con cuadros, plantas o colores
  parecidos a la piel (en el post 15 un pedazo de cuadro rosado se pegó al pelo).
- Misma ropa y mismo lugar en todas las frases del reel.
- Di cada frase entera de corrido, y si te equivocas repite **la frase completa**, no
  solo la palabra. Deja un segundo quieto y con los ojos abiertos antes de empezar.
- Mira al lente, no a la pantalla.

## Lecciones (lo que ya costó)

- **Los subtítulos siguen al audio, no al guion**, salvo que te hayas equivocado y no se
  pueda regrabar: en el post 15 se te escapó "Marketplace" por "WhatsApp" y la tarjeta y el
  subtítulo dicen WhatsApp. Si se puede, mejor regrabar solo esa frase con la misma luz y ropa.
- **Nada de burbujas con tu cara ni vibración de pantalla**: se ve barato. El paso
  entre real y marca es solo el círculo.
- **Mira cómo sale cada emoji en el render**: son los de Windows, y no siempre se leen.
  El 🪨 sale como un cristal blanco; por eso la piedra está dibujada (`Piedra` en `piezas/efectos.tsx`).
  Si un objeto es clave para el chiste, dibújalo.
- **Apps: solo el nombre**, nunca su logo ni su interfaz. El chat y la publicación son diseño nuestro.
- **Varía los efectos**: el mismo "pop" para todo cansa. Tres cosas seguidas → tonos que suben.
- **La música va ~11 dB bajo la voz** y el ritmo entra recién cuando aparece Trado.
- **Corta toda pausa de más de ~0,3 s**; la de antes de una enumeración también.
- **Revisa el primer cuadro**: es la miniatura antes de que carguen. En el post 15 sale
  con los ojos cerrados (la toma empieza a 0,08 s); conviene empezar en uno con ojos abiertos.
- **Una línea SVG de largo 0 con punta redonda igual dibuja un punto**: no la muestres
  hasta que empiece a crecer (pasó en `Esquema.tsx`).
- **loudnorm en una pasada satura** (pico de +2,7 dBFS). `final.py` hace dos pasadas lineales y un limitador.
- **Todo lo que se dice de Trado se verifica contra el código** (plazos, estados, comisión)
  antes de publicar. Las cifras de comisión, solo desde `calculateFee` en `src/lib/utils.ts`.

## Archivos

- `src/Root.tsx`: un reel por composición; el id es el que se le pasa a `final.py`.
- `src/reels/`: un archivo por reel.
- `src/piezas/`: piezas reutilizables; `Toma.tsx` es tu toma (recorte, círculo, modos, subtítulos).
- `src/marca.ts`: colores, fuente y curvas de animación.
- `scripts/`: convertir, transcribir, hoja, caras, tomas (= audio + recorte), final,
  efectos y música (`npm run sfx`), chile (mapa).
- `guion/`: el guion final de cada reel, tal como quedó dicho.
- `out/`: renders (fuera de git).
