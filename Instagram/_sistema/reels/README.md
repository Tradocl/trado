# Reels de Trado

Generador de los reels de Instagram: cada reel es un `reel.py` con sus escenas
(dibujadas con Pillow) y sus efectos de sonido (sintetizados con numpy). Nada de
esto usa material de terceros: ni videos, ni música, ni efectos con derechos.

```
reels/
  motor.py        lienzo 1080x1920, colores, tipografía, fondos, armado del .mp4, línea de comandos
  sonido.py       efectos y música sintetizados, en dos capas (Pista)
  fuentes/        Plus Jakarta Sans (licencia OFL, ver OFL.txt)
  10-cual-es-falso/reel.py
  11-que-habia-en-la-caja/reel.py
  12-me-dejaron-en-visto/reel.py
  13-quien-paga-primero/reel.py
  14-como-funciona/reel.py   (explicativo largo: reutiliza piezas del 12 y el 13)
  15-noticia-metro/reel.py   (gancho con segundos de un noticiero: el video va en material/, fuera del repo)
```

El número de cada carpeta es el puesto del reel en la grilla, igual que en
`Instagram/2 Reels/`. El 09 ("Pago falso") se hizo antes de este generador y no está acá.

## Instalar (una vez)

Python 3.10 o más nuevo, y:

```
pip install pillow numpy imageio-ffmpeg
```

## Renderizar un reel

Desde la carpeta del reel:

```
python reel.py                  # video completo, sólo efectos  -> 2 Reels/<NN …>/reel-sin-musica.mp4
python reel.py --con-musica     # efectos + música de fondo      -> reel-con-musica.mp4
python reel.py --sobre-video    # sólo cambia el audio del reel.mp4 de esa carpeta (imagen idéntica, segundos)
python reel.py --vista          # hoja PNG con un cuadro por escena, para revisar sin esperar el render
```

El render completo tarda unos minutos (dibuja ~30 cuadros por segundo de video).

## Audio: dos capas

- **Efectos** (whooshes, pops, golpes, campanas, el trombón de "fracaso"): son la
  identidad sonora de Trado y van siempre. Están en `efectos(p)` de cada reel.
- **Música** (110 BPM, sintetizada): es **la música de Trado**, la misma del reel 09 ya
  publicado. Entra cuando aparece Trado en cada reel (`MUSICA_DESDE`). Los reels se publican
  **con ella** (`reel.mp4`, que se genera con `--con-musica`) para que todos suenen a la misma
  marca. No se agrega música de Instagram encima. Ojo: no sumar otro ritmo en los efectos;
  dos ritmos a la vez suenan a destiempo (pasó con los reels 10-14 en octubre de 2026).

Los efectos se normalizan a −15 LUFS con pico máximo de −3 dBTP (`motor.LUFS`, `motor.PICO`):
los cuatro quedan parejos y dejan espacio para la música de Instagram.

## Hacer uno nuevo

Copia una carpeta (por ejemplo `13-quien-paga-primero/`), renómbrala con el puesto que
va a ocupar, cambia las escenas y los efectos, y el último argumento de `cli(...)`
(la carpeta de `2 Reels/` donde va a quedar). Reglas que estos reels siguen:

- **El gancho en el primer cuadro.** La gente mira ~4 segundos en promedio.
- **Se entiende sin sonido.** Todo lo importante va en texto grande.
- **Zona segura:** Instagram tapa arriba (~220 px) y abajo (~420 px). Lo importante
  entre y = 240 y y = 1500.
- **Todo lo que se diga de Trado, verificado en el código** (plazos, comisiones, qué
  pasa en una apelación). Nada de "100 % seguro" ni promesas absolutas.
- **Sin marcas ajenas:** comprobantes, chats y bancos genéricos.
- **Material de terceros (reel 15):** el video de la noticia se lee de `15-noticia-metro/material/`, que está en
  `.gitignore` junto con los mp4 del reel y su portada. Nunca subirlos: el repo es público. Ese reel es sólo orgánico.
