"""Exporta los efectos de sonido de Trado (reels/sonido.py) a public/sfx/*.wav.

Son los mismos que usan los reels hechos con Pillow, así que los dos sistemas
suenan igual. Se corre con `npm run sfx`.
"""
import os
import sys
import wave

import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, "..", "..", "reels"))
from sonido import EFECTOS, SR  # noqa: E402

SALIDA = os.path.join(AQUI, "..", "public", "sfx")
os.makedirs(SALIDA, exist_ok=True)

for nombre, (fn, vol) in EFECTOS.items():
    # Mismo volumen por defecto que Pista.evento(); el nivel final se normaliza
    # al renderizar (npm run final).
    s = np.clip(fn() * vol, -1, 1)
    with wave.open(os.path.join(SALIDA, f"{nombre}.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((s * 32767).astype(np.int16).tobytes())
    print(nombre)
