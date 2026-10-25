"""Hoja de revisión: cuadros del video en los segundos que digas, en una sola imagen.

    python scripts/hoja.py out/DesdeDondeQuieras.mp4 out/hoja.jpg 1,3.5,6,10.2
    python scripts/hoja.py out/DesdeDondeQuieras.mp4 out/hoja.jpg cada=0.7

Sirve para revisar sin ver el video entero: el paso del círculo, que las animaciones
calcen con lo que dices, que nada tape la cara ni quede cortado en los bordes.
"""
import sys

import cv2
import numpy as np


def main(video, salida, cuando):
    cap = cv2.VideoCapture(video)
    fps, n = cap.get(cv2.CAP_PROP_FPS), cap.get(cv2.CAP_PROP_FRAME_COUNT)
    if cuando.startswith("cada="):
        paso = float(cuando[5:])
        ts = list(np.arange(0.1, n / fps, paso))
    else:
        ts = [float(x) for x in cuando.split(",")]
    cuadros = []
    for t in ts:
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(t * fps))
        ok, fr = cap.read()
        if not ok:
            continue
        fr = cv2.resize(fr, (360, 640))
        cv2.putText(fr, f"{t:.1f}s", (8, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
        cuadros.append(fr)
    while len(cuadros) % 5:
        cuadros.append(np.zeros_like(cuadros[0]))
    filas = [np.hstack(cuadros[i:i + 5]) for i in range(0, len(cuadros), 5)]
    cv2.imencode(".jpg", np.vstack(filas))[1].tofile(salida)
    print(salida)


if __name__ == "__main__":
    main(*sys.argv[1:4])
