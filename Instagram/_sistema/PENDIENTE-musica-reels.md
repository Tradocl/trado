# Pendiente: música distinta en cada reel

Encargo para Jose Pablo (y su Claude Code), 2026-10-02. Cuando esté hecho, borrar
este archivo en el mismo commit.

## Contexto

Hoy revisamos los reels de Instagram con otra sesión de Claude Code y decidimos
cambiar la música. Los videos los hiciste tú, así que necesitamos que dejes todo listo.
Haz `git pull` antes de empezar.

**Qué cambió hoy (commit 83d8918)**
- Ya se publicó el feed 01-08 y el reel "Pago falso" como post 9. "Para qué sirve" se
  movió a la banca (`1 Feed/Banca/`) y el reel "Transfiéreme primero" se borró.
- Ahora los reels se numeran según el puesto que ocupan en la grilla:
  `2 Reels/09 Pago falso` (ya publicado), `10 Cual es falso`, `11 Que habia en la caja`,
  `12 Me dejaron en visto`, `13 Quien paga primero`. Las portadas de su sistema están en
  `_sistema/feed/09-reel02-portada … 13-reel06-portada`.

**El problema:** los 5 reels usan la misma pista de música. Vistos seguidos se sienten
repetitivos y la música no le da gancho a los primeros segundos.

**La decisión**
- Los efectos de sonido (whooshes, pings, sello, confirmación de pago, etc.) se quedan
  igual en todos: son la identidad sonora de Trado.
- La música de fondo sale del video. Al publicar, se le pone a cada reel una canción
  distinta desde la biblioteca de Instagram. Así además ganamos alcance, porque el audio
  queda enlazado y el algoritmo favorece los audios de su biblioteca.
- Trado es cuenta de empresa: solo tiene la biblioteca libre de derechos de Meta (Sound
  Collection), no los éxitos comerciales. Las sugerencias tienen que ser ambientes o
  géneros que se puedan buscar ahí, no temas famosos.

## Lo que hay que hacer

1. **Subir al repo el generador de los reels** (escenas, efectos, audio, scripts de
   render) en `Instagram/_sistema/reels/`, siguiendo las convenciones de
   `_sistema/feed`. Hoy no está en git y nadie más puede regenerar los videos. El repo
   Tradocl/trado es **público**: revisa que no se suba nada interno (claves, datos de
   usuarios, notas de presupuesto). No subas archivos intermedios pesados que se puedan
   regenerar. Agrega un README corto que explique cómo se renderiza un reel.

2. **Separar el audio en dos capas**, efectos y música, y dejar la música como opcional
   en el generador.

3. **Exportar los reels 10, 11, 12 y 13 solo con efectos**, como `reel-sin-musica.mp4`
   en cada carpeta de `2 Reels/`, al lado del `reel.mp4` actual (que se mantiene como
   respaldo). El 09 ya está publicado: no lo toques. Revisa que los efectos queden a
   buen volumen y que no haya silencios incómodos donde antes tapaba la música. Mide el
   audio con ffmpeg (volumedetect/loudnorm) y compáralo con la versión original. Antes
   de cerrar, pide que alguien escuche al menos uno.

4. **Actualizar el `caption.txt` de los reels 10 a 13.** Reemplaza la línea "Sin música
   de Instagram (el video trae su audio)" por: qué video subir (`reel-sin-musica.mp4`),
   qué buscar en la biblioteca de Instagram (2-3 términos de búsqueda) y en qué volumen
   dejar el audio original frente a la música. Idea de ambiente para cada uno:
   - 10 Cuál es falso: juego o suspenso que sube hasta la revelación.
   - 11 Qué había en la caja: suspenso o tensión que explota en el "spoiler".
   - 12 Me dejaron en visto: comedia o drama exagerado.
   - 13 Quién paga primero: con ritmo y optimista, que acompañe la explicación.

   Si al revisar los videos se te ocurre algo mejor para alguno, propónlo.

5. **Commit y push a main**, borrando este archivo. No fuerces el push: si te lo
   rechazan, haz pull y vuelve a intentar. Al final, deja un resumen de qué subiste y
   dónde quedó cada archivo.
