"""Pasa la grabación del iPhone (.MOV en HDR) a video.mp4 de 1080×1920 en SDR.

    python scripts/convertir.py public/material/<reel>/originales/IMG_1234.MOV public/material/<reel>/video.mp4

El iPhone graba en HDR (HLG) y, si se usa tal cual, Remotion lo muestra lavado y gris.
Aquí se mapea a SDR (bt709) con tonemap "hable", que respeta los tonos de piel.
"""
import subprocess
import sys

import imageio_ffmpeg

FILTRO = ("zscale=w=1080:h=1920:f=spline36,zscale=t=linear:npl=203,format=gbrpf32le,zscale=p=bt709,"
          "tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p")


def main(entrada, salida):
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-hide_banner", "-loglevel", "error", "-stats", "-y",
                    "-i", entrada, "-vf", FILTRO, "-r", "30", "-c:v", "libx264", "-crf", "17", "-preset", "medium",
                    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", salida], check=True)
    print(salida)


if __name__ == "__main__":
    main(*sys.argv[1:3])
