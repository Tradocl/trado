"""Mide dónde queda el centro de tu cara en cada toma, para la prop `cara` de <Toma>.

    python scripts/caras.py public/material/<reel>/video.mp4 hook:6.8:11.8 duda:19.2:29.7 ...

El círculo que pasa de tu fondo real a la marca se cierra hacia ese punto, y el recorte
se coloca a partir de él: si está mal, en el paso se ve un salto. Entre frase y frase uno
se mueve un poco, por eso cada toma lleva la suya.

Usa el detector de caras de OpenCV en ~10 cuadros por toma y toma la mediana. El ajuste
(-7, -20) lo deja en el mismo punto que se calibró a ojo para el primer reel (entre los ojos).
"""
import sys

import cv2
import numpy as np

AJUSTE = (-7, -20)


def medir(video, a, b, n=10):
    det = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    cap = cv2.VideoCapture(video)
    puntos = []
    for t in np.linspace(a + 0.2, b - 0.2, n):
        cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
        ok, fr = cap.read()
        if not ok:
            continue
        caras = det.detectMultiScale(cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY), 1.1, 6, minSize=(200, 200))
        if len(caras):
            x, y, w, h = max(caras, key=lambda c: c[2] * c[3])
            puntos.append((x + w / 2, y + h / 2))
    if not puntos:
        return None
    x, y = np.median(puntos, axis=0)
    return round(x + AJUSTE[0]), round(y + AJUSTE[1])


if __name__ == "__main__":
    video = sys.argv[1]
    for arg in sys.argv[2:]:
        nombre, a, b = arg.split(":")
        c = medir(video, float(a), float(b))
        print(f"{nombre:10s} cara={{{{ x: {c[0]}, y: {c[1]} }}}}" if c else f"{nombre:10s} sin cara detectada")
