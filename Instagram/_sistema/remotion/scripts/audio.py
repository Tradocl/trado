"""Limpia la voz de un clip grabado con el celular: corta graves, baja el ruido de
fondo, le da presencia y la deja pareja. No inventa nada: es la misma voz con menos ruido.

Uso:
    python scripts/audio.py public/material/videos/prueba-1.mp4 0.4 6.3 public/material/generado/hook.wav
"""
import subprocess
import sys

import imageio_ffmpeg

FILTROS = ",".join([
    "highpass=f=80",                      # retumbe de la pieza y golpes en la mesa
    "afftdn=nf=-45:nr=14:tn=1",           # ruido de fondo parejo (refri, ventilador, calle)
    "equalizer=f=250:t=q:w=1.2:g=-2",     # menos "caja" de pieza chica
    "equalizer=f=3500:t=q:w=1.5:g=3",     # presencia: se entiende mejor en el celular
    "deesser=i=0.3",
    "acompressor=threshold=-22dB:ratio=3:attack=8:release=120:makeup=4",
    "loudnorm=I=-16:TP=-3:LRA=9",
])


def main(entrada: str, desde: str, hasta: str, salida: str) -> None:
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-hide_banner", "-loglevel", "error", "-y",
                    "-ss", desde, "-to", hasta, "-i", entrada, "-vn", "-ac", "1", "-ar", "48000",
                    "-af", FILTROS, salida], check=True)
    print(salida)


if __name__ == "__main__":
    main(*sys.argv[1:5])
