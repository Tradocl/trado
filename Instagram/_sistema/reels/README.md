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
- **Música** (110 BPM, sintetizada): opcional, con `--con-musica`. Desde octubre de 2026
  los reels se publican **sin** ella y se les pone una canción de la biblioteca de
  Instagram al subirlos (qué buscar está en el `caption.txt` de cada reel).

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
