"""Limpia la voz de un clip grabado con el celular: corta graves, baja el ruido de
fondo, le da presencia y la deja pareja. No inventa nada: es la misma voz con menos ruido.

El ruido lo saca RNNoise (filtro arnndn de ffmpeg, gratis y local): separa voz de ruido
mucho mejor que afftdn, sobre todo al aire libre o con audio comprimido (WhatsApp).
En «En persona» bajó el piso de ruido de -46 a -58 dB sin tocar la voz. El modelo
(scripts/modelos/sh.rnnn, ~300 KB, fuera de git) se descarga solo la primera vez.

Uso:
    python scripts/audio.py public/material/<reel>/video.mp4 6.8 11.8 public/material/<reel>/generado/hook.wav
"""
import os
import subprocess
import sys
import urllib.request

import imageio_ffmpeg

MODELOS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "modelos")
MODELO = "sh.rnnn"
URL_MODELO = "https://raw.githubusercontent.com/GregorR/rnnoise-models/master/somnolent-hogwash-2018-09-01/sh.rnnn"

FILTROS = ",".join([
    "highpass=f=90",                      # retumbe, viento suave y golpes en la mesa
    f"arnndn=m={MODELO}:mix=0.9",         # ruido de fondo (calle, viento, refri); 0.9 deja un poco de aire natural
    "afftdn=nf=-55:nr=6:tn=1",            # lo poco de ruido parejo que queda
    "equalizer=f=250:t=q:w=1.2:g=-2",     # menos "caja"
    "equalizer=f=3500:t=q:w=1.5:g=3",     # presencia: se entiende mejor en el celular
    "highshelf=f=7000:g=2",               # aire (el AAC de WhatsApp llega opaco)
    "deesser=i=0.3",
    "acompressor=threshold=-22dB:ratio=3:attack=8:release=120:makeup=4",
    "loudnorm=I=-16:TP=-3:LRA=9",
])


def modelo() -> None:
    ruta = os.path.join(MODELOS, MODELO)
    if not os.path.exists(ruta):
        os.makedirs(MODELOS, exist_ok=True)
        urllib.request.urlretrieve(URL_MODELO, ruta)


def main(entrada: str, desde: str, hasta: str, salida: str) -> None:
    modelo()
    # ffmpeg corre dentro de modelos/: así el filtro recibe el modelo sin ruta (en Windows
    # el "C:" de una ruta absoluta rompe la sintaxis de filtros).
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-hide_banner", "-loglevel", "error", "-y",
                    "-ss", desde, "-to", hasta, "-i", os.path.abspath(entrada), "-vn", "-ac", "1", "-ar", "48000",
                    "-af", FILTROS, os.path.abspath(salida)], check=True, cwd=MODELOS)
    print(salida)


if __name__ == "__main__":
    main(*sys.argv[1:5])
