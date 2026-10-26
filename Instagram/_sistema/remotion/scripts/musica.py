"""Música de fondo de los reels, sintetizada (sin canciones con derechos).

Sale en dos capas que se mezclan en Remotion:
  public/sfx/musica_base.wav   acordes, bajo y un arpegio suave (desde el inicio)
  public/sfx/musica_ritmo.wav  batería liviana (entra cuando aparece la solución)

Las dos van al mismo tempo; el ritmo debe empezar en un comienzo de compás
(COMPAS segundos), y así calza con los acordes. Se corre con `npm run sfx`.
"""
import os
import sys
import wave

import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, "..", "..", "reels"))
from sonido import SR, clap, env, fft_filter, hat, kick, saw, t_  # noqa: E402

BPM = 96
PULSO = 60 / BPM
COMPAS = 4 * PULSO  # 2,5 s; el mismo valor está en src/Reel.tsx
DUR = 50.0
rng = np.random.default_rng(7)

# La - Fa - Do - Sol: arranca melancólico (el problema) y abre hacia algo luminoso
NOTA = {"C": 261.63, "D": 293.66, "E": 329.63, "F": 349.23, "G": 392.0, "A": 440.0, "B": 493.88}
ACORDES = [("A", ["A", "C", "E"]), ("F", ["F", "A", "C"]), ("C", ["C", "E", "G"]), ("G", ["G", "B", "D"])]


def hz(n, octava):
    return NOTA[n] * 2 ** (octava - 4)


class Estereo:
    def __init__(self):
        self.L = np.zeros(int(DUR * SR)); self.R = np.zeros(int(DUR * SR))

    def add(self, sig, at, g=1.0, pan=0.0):
        i = int(at * SR)
        if i >= len(self.L): return
        s = sig[: len(self.L) - i] * g
        self.L[i:i + len(s)] += s * (1 - max(0, pan)); self.R[i:i + len(s)] += s * (1 + min(0, pan))

    def guardar(self, nombre, pico):
        mix = np.stack([self.L, self.R], axis=1)
        mix *= pico / max(1e-9, np.max(np.abs(mix)))
        with wave.open(os.path.join(AQUI, "..", "public", "sfx", nombre), "wb") as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes((mix * 32767).astype(np.int16).tobytes())
        print(nombre)


def pad(f, d):
    s = fft_filter(saw(f, d, 3, 0.004), hi=1000)
    t = t_(d)
    return s * np.minimum(1, t / 0.5) * np.clip((d - t) / 0.6, 0, 1)


def pulsado(f, d=0.5):
    """Nota de arpegio: seno con un poco de brillo, ataque corto."""
    t = t_(d)
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t) * np.exp(-t * 18)
    return s * env(len(t), 0.003, 0.16)


def bajo(f, d):
    t = t_(d)
    s = np.sin(2 * np.pi * f * t) + 0.2 * np.sin(4 * np.pi * f * t)
    return s * np.minimum(1, t / 0.02) * np.clip((d - t) / 0.15, 0, 1)


base = Estereo()
ritmo = Estereo()
compases = int(DUR / COMPAS) + 1
for c in range(compases):
    t0 = c * COMPAS
    raiz, notas = ACORDES[c % 4]
    for i, n in enumerate(notas):
        base.add(pad(hz(n, 3 if i == 0 else 4), COMPAS + 0.6), t0, 0.12, (i - 1) * 0.4)
    base.add(bajo(hz(raiz, 2), COMPAS * 0.95), t0, 0.35)
    # Arpegio en corcheas: sube y baja por el acorde, alternando lados
    figura = [0, 1, 2, 1, 0, 2, 1, 2]
    for k, j in enumerate(figura):
        n = notas[j]
        base.add(pulsado(hz(n, 5)), t0 + k * PULSO / 2, 0.09 if k % 2 == 0 else 0.06, -0.35 if k % 2 == 0 else 0.35)

    for b in range(4):
        tb = t0 + b * PULSO
        if b in (0, 2): ritmo.add(fft_filter(kick(), hi=3000), tb, 0.9)
        if b in (1, 3): ritmo.add(clap(), tb, 0.28, 0.1)
        for h in range(4):  # shaker en semicorcheas, acento a contratiempo
            ritmo.add(hat(), tb + h * PULSO / 4, 0.16 if h == 2 else 0.07, 0.25)
    if c % 2 == 1: ritmo.add(kick(), t0 + 3.5 * PULSO, 0.5)  # empujón al final de cada dos compases

# El fade de entrada y salida lo hace Remotion; aquí solo el nivel.
base.guardar("musica_base.wav", 0.8)
ritmo.guardar("musica_ritmo.wav", 0.8)
