"""Recorta a la persona de un clip y deja el fondo transparente (WebM VP9 con alfa).

Uso:
    python scripts/recorte.py public/material/<reel>/video.mp4 6.8 11.8 public/material/<reel>/generado/hook.webm

Corre en CPU con el modelo u2net_human_seg de rembg (~1 s por cuadro). Con pared lisa
y luz de frente queda limpio; el pelo largo o las manos rápidas cuestan más.
En Remotion se usa con <OffthreadVideo transparent />.
"""
import subprocess
import sys

import imageio_ffmpeg
import numpy as np
from PIL import Image
from rembg import new_session, remove

FF = imageio_ffmpeg.get_ffmpeg_exe()
# Promedio con el cuadro anterior: evita que el borde "tiemble" entre cuadros
SUAVIZADO = 0.35


def medidas(ruta: str) -> tuple[int, int]:
    info = subprocess.run([FF, "-hide_banner", "-i", ruta], capture_output=True, text=True).stderr
    for linea in info.splitlines():
        if "Video:" in linea:
            for parte in linea.split(","):
                parte = parte.strip().split(" ")[0]
                if "x" in parte and parte.replace("x", "").isdigit():
                    w, h = parte.split("x")
                    return int(w), int(h)
    raise SystemExit(f"No encuentro el tamaño del video en {ruta}")


def main(entrada: str, desde: str, hasta: str, salida: str) -> None:
    w, h = medidas(entrada)
    lector = subprocess.Popen([FF, "-loglevel", "error", "-ss", desde, "-to", hasta, "-i", entrada,
                               "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    escritor = subprocess.Popen([FF, "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba",
                                 "-s", f"{w}x{h}", "-r", "30", "-i", "-",
                                 "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "6M",
                                 "-auto-alt-ref", "0", salida], stdin=subprocess.PIPE)
    sesion = new_session("u2net_human_seg")
    anterior = None
    n = 0
    while True:
        crudo = lector.stdout.read(w * h * 3)
        if len(crudo) < w * h * 3:
            break
        cuadro = np.frombuffer(crudo, np.uint8).reshape(h, w, 3)
        alfa = np.asarray(remove(Image.fromarray(cuadro), session=sesion, only_mask=True), np.float32)
        if anterior is not None:
            alfa = SUAVIZADO * anterior + (1 - SUAVIZADO) * alfa
        anterior = alfa
        escritor.stdin.write(np.dstack([cuadro, alfa.astype(np.uint8)]).tobytes())
        n += 1
        if n % 30 == 0:
            print(f"{n / 30:.0f} s listos", flush=True)
    escritor.stdin.close()
    escritor.wait()
    print(f"{salida}: {n} cuadros")


if __name__ == "__main__":
    main(*sys.argv[1:5])
