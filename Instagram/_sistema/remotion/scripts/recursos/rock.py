"""Rock sintetizado para reels con energía (sin canciones con derechos).

    python scripts/recursos/rock.py      ->  public/sfx/musica_rock.wav

Guitarra con distorsión doblada a izquierda y derecha (power chords en Mi, riff con
palm mute), bajo, batería y platillo. Va a 140 BPM; un compás dura COMPAS segundos y
el reel que la use debe cortar en ese pulso (EtmDia1.tsx usa las mismas constantes).

  compases 0-1   la guitarra sola (el gancho)
  compás 2       entra la banda con platillo
  compases 2-15  riff con la banda completa
  compás 16      golpe final que queda sonando
"""
import os
import sys
import wave

import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, "..", "..", "..", "reels"))
from sonido import SR, env, fft_filter, kick, t_  # noqa: E402

BPM = 140
PULSO = 60 / BPM
OCTAVO = PULSO / 2
COMPAS = 4 * PULSO
FINAL = 16           # compás del golpe final
DUR = FINAL * COMPAS + 4.0
rng = np.random.default_rng(11)

RAIZ = {"E": 82.41, "G": 98.0, "A": 110.0, "D": 73.42, "B": 61.74}

# Riff de 2 compases en octavos: (paso, acorde, largo en octavos, apagado con la mano)
RIFF = [(0, "E", 1, True), (1, "E", 1, True), (2, "E", 1, True), (3, "G", 1, False),
        (4, "E", 1, True), (5, "E", 1, True), (6, "A", 2, False),
        (8, "E", 1, True), (9, "E", 1, True), (10, "E", 1, True), (11, "G", 1, False),
        (12, "A", 1, False), (13, "G", 1, False), (14, "E", 2, False)]


def sierra(f, d, semilla):
    r = np.random.default_rng(semilla)
    t = t_(d)
    s = np.zeros(len(t))
    for k in range(2):
        ff = f * (1 + 0.004 * (k - 0.5))
        s += 2 * ((ff * t + r.uniform()) % 1) - 1
    return s / 2


def guitarra(raiz, d, apagado, semilla):
    """Power chord (raíz, quinta y octava) con distorsión y caja de parlante."""
    d_son = d * (0.55 if apagado else 1.0) + (0.02 if apagado else 0.12)
    s = sum(sierra(raiz * m, d_son, semilla + i) * g for i, (m, g) in enumerate([(1, 1), (1.4983, 0.8), (2, 0.6)]))
    s = fft_filter(s, lo=70, hi=1300 if apagado else 2600)
    s = np.tanh(s * (7 if apagado else 9))
    s = fft_filter(s, lo=90, hi=4200)
    n = len(s)
    e = np.ones(n)
    na = int(0.003 * SR); e[:na] = np.linspace(0, 1, na)
    nr = int(0.03 * SR); e[-nr:] *= np.linspace(1, 0, nr)
    if apagado:
        e *= np.exp(-np.arange(n) / SR / 0.09)
    return s * e


def bajo(raiz, d):
    s = sierra(raiz / 2, d, 3)
    s = np.tanh(fft_filter(s, hi=420) * 3)
    return s * env(len(s), 0.004, d * 0.9)


def caja():
    n = int(0.25 * SR)
    ruido = fft_filter(rng.standard_normal(n), lo=1200, hi=9000) * env(n, 0.001, 0.09)
    cuerpo = np.sin(2 * np.pi * 185 * np.arange(n) / SR) * env(n, 0.001, 0.05)
    return ruido * 0.8 + cuerpo * 0.9


def hihat():
    n = int(0.05 * SR)
    return fft_filter(rng.standard_normal(n), lo=7500) * env(n, 0.0005, 0.014)


def platillo(d=2.2):
    n = int(d * SR)
    return fft_filter(rng.standard_normal(n), lo=4500, hi=14000) * env(n, 0.001, 0.55)


class Estereo:
    def __init__(self):
        self.L = np.zeros(int(DUR * SR)); self.R = np.zeros(int(DUR * SR))

    def add(self, sig, at, g=1.0, pan=0.0):
        i = int(at * SR)
        if i >= len(self.L): return
        s = sig[: len(self.L) - i] * g
        self.L[i:i + len(s)] += s * (1 - max(0, pan)); self.R[i:i + len(s)] += s * (1 + min(0, pan))


def main():
    m = Estereo()
    for compas in range(0, FINAL, 2):
        t0 = compas * COMPAS
        for paso, acorde, largo, apagado in RIFF:
            at = t0 + paso * OCTAVO
            d = largo * OCTAVO
            # dos tomas de guitarra, una a cada lado (suena "doblada", como en estudio)
            m.add(guitarra(RAIZ[acorde], d, apagado, 100 + paso), at, 0.5, -0.7)
            m.add(guitarra(RAIZ[acorde], d, apagado, 200 + paso), at + 0.008, 0.5, 0.7)
            if compas >= 2:
                for k in range(largo):
                    m.add(bajo(RAIZ[acorde], OCTAVO), at + k * OCTAVO, 0.55)

    for compas in range(2, FINAL):
        t0 = compas * COMPAS
        if compas % 4 == 2:
            m.add(platillo(), t0, 0.35, 0.3)
        for p in range(4):
            at = t0 + p * PULSO
            if p in (0, 2): m.add(kick(), at, 1.0)
            if p == 2 or (p == 1 and compas % 2): m.add(kick(), at + OCTAVO, 0.7)
            if p in (1, 3): m.add(caja(), at, 0.75)
        for o in range(8):
            m.add(hihat(), t0 + o * OCTAVO, 0.22 if o % 2 else 0.32, 0.4)
        if compas == FINAL - 1:  # redoble antes del final
            for k in range(8):
                m.add(caja(), t0 + 2 * PULSO + k * OCTAVO / 2, 0.35 + 0.05 * k)

    # golpe final: acorde abierto que queda sonando + platillo + bombo
    tf = FINAL * COMPAS
    largo = 3.6
    for lado, sem in ((-0.7, 300), (0.7, 400)):
        g = guitarra(RAIZ["E"], largo, False, sem)
        g *= np.exp(-np.arange(len(g)) / SR / 1.3)
        m.add(g, tf, 0.95, lado)
    m.add(bajo(RAIZ["E"], largo), tf, 0.6)
    m.add(kick(), tf, 1.6)
    m.add(platillo(3.5), tf, 0.7)

    mix = np.stack([m.L, m.R], axis=1)
    mix = np.tanh(mix / np.max(np.abs(mix)) * 1.6) / np.tanh(1.6)  # pegamento, como un compresor
    mix *= 0.89
    salida = os.path.join(AQUI, "..", "..", "public", "sfx", "musica_rock.wav")
    with wave.open(salida, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((mix * 32767).astype(np.int16).tobytes())
    print(f"musica_rock.wav  {DUR:.1f} s, compás {COMPAS:.4f} s")


if __name__ == "__main__":
    main()
