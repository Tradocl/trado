"""Rock sintetizado para reels con energía (sin canciones con derechos).

    python scripts/recursos/rock.py      ->  public/sfx/musica_rock.wav

Guitarra rítmica con distorsión doblada a izquierda y derecha, guitarra solista con
bends y vibrato, bajo, batería con toms, palmas y platillos. Va a 140 BPM; un compás
dura COMPAS segundos y el reel que la use debe cortar en ese pulso (EtmDia1.tsx usa
las mismas constantes). Si cambias la estructura, no muevas FINAL ni el BPM.

  compases 0-1    riff A con la guitarra sola (el gancho)
  compases 2-5    entra la banda con platillo
  compases 6-7    coro: acordes abiertos, palmas y guitarra solista
  compases 8-11   riff A (en el reel aquí habla la entrevista)
  compases 12-13  galope
  compases 14-15  coro con el solo más arriba y redoble de toms
  compás 16       golpe final que queda sonando, con la solista arriba
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

RAIZ = {"E": 82.41, "G": 98.0, "A": 110.0, "D": 146.83, "C": 130.81, "B": 123.47}
NOTA = {"G": 98.0, "G#": 103.83, "A": 110.0, "B": 123.47}   # notas sueltas en la cuerda grave

# Riff A, 2 compases en octavos: (paso, acorde, largo, apagado). "n:X" = nota suelta.
# Los silencios (paso 4) y el empuje en el 5 son los que le dan el swing.
RIFF_A = [(0, "E", 2, False), (2, "E", 1, True), (3, "G", 1, False), (5, "A", 2, False), (7, "E", 1, True),
          (8, "E", 1, True), (9, "E", 1, True), (10, "D", 1, False), (11, "E", 1, True),
          (12, "n:G", 1, False), (13, "n:G#", 1, False), (14, "A", 2, False)]
# Coro: acordes abiertos que quedan sonando
CORO = [(0, "A", 3, False), (3, "A", 1, True), (4, "G", 2, False), (6, "D", 2, False),
        (8, "E", 5, False), (13, "E", 1, True), (14, "G", 1, False), (15, "A", 1, False)]


def galope(acordes):
    """Octavo + dos semicorcheas por pulso, un acorde por pulso."""
    return [(b * 2 + o, a, 0.5 if o else 1, a == "E") for b, a in enumerate(acordes) for o in (0, 1, 1.5)]


RIFF_B = galope(["E", "E", "E", "E", "G", "G", "A", "A"])

# Qué toca la guitarra rítmica en cada par de compases
SECCION = {0: RIFF_A, 2: RIFF_A, 4: RIFF_A, 6: CORO, 8: RIFF_A, 10: RIFF_A, 12: RIFF_B, 14: CORO}

# Guitarra solista: (compás, octavo, largo en octavos, nota Hz, bend hasta Hz o None)
E4, G4, A4, B4, D5, E5, G5, A5 = 329.63, 392.0, 440.0, 493.88, 587.33, 659.26, 783.99, 880.0
SOLO = [
    # pregunta, en el coro de los ganadores
    (6, 0, 2, B4, None), (6, 2, 1, D5, None), (6, 3, 3, D5, E5), (6, 6, 2, D5, None),
    (7, 0, 1, B4, None), (7, 1, 1, A4, None), (7, 2, 4, G4, A4), (7, 6, 1, E4, None), (7, 7, 1, G4, None),
    # respuesta más arriba, antes del final
    (14, 0, 2, E5, None), (14, 2, 1, G5, None), (14, 3, 3, G5, A5), (14, 6, 2, E5, None),
    (15, 0, 1, D5, None), (15, 1, 1, E5, None), (15, 2, 1, G5, None), (15, 3, 1, E5, None),
    (15, 4, 1, D5, None), (15, 5, 1, B4, None), (15, 6, 2, D5, E5),
]


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


def solista(f, d, bend=None, semilla=0):
    """Una nota de guitarra solista: bend opcional, vibrato que entra tarde y distorsión."""
    t = t_(d + 0.08)
    fr = np.full(len(t), float(f))
    if bend:
        fr = f + (bend - f) * np.clip((t - 0.04) / 0.12, 0, 1)
    vib = 1 + 0.012 * np.sin(2 * np.pi * 5.8 * t) * np.clip((t - 0.2) / 0.2, 0, 1)
    fase = np.cumsum(fr * vib) / SR + np.random.default_rng(semilla).uniform()
    s = (2 * (fase % 1) - 1) + 0.5 * (2 * ((fase * 2.003) % 1) - 1)
    s = np.tanh(fft_filter(s, lo=250, hi=3000) * 10)
    s = fft_filter(s, lo=300, hi=5200)
    e = np.ones(len(s)); na = int(0.004 * SR); e[:na] = np.linspace(0, 1, na)
    nr = int(0.06 * SR); e[-nr:] *= np.linspace(1, 0, nr)
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


def tom(f):
    t = t_(0.35)
    fr = f * (1 + 0.6 * np.exp(-t * 30))
    cuerpo = np.sin(2 * np.pi * np.cumsum(fr) / SR) * env(len(t), 0.001, 0.16)
    golpe = fft_filter(rng.standard_normal(len(t)), lo=2000, hi=7000) * env(len(t), 0.001, 0.015)
    return cuerpo + 0.3 * golpe


def palmas():
    n = int(0.15 * SR)
    s = np.zeros(n)
    for k, at in enumerate((0, 0.009, 0.019)):
        i = int(at * SR)
        s[i:] += fft_filter(rng.standard_normal(n - i), lo=900, hi=6000) * env(n - i, 0.0005, 0.03 if k < 2 else 0.07)
    return s


def hihat(abierto=False):
    n = int((0.3 if abierto else 0.05) * SR)
    return fft_filter(rng.standard_normal(n), lo=7500) * env(n, 0.0005, 0.12 if abierto else 0.014)


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

    # guitarra rítmica y bajo
    for compas in range(0, FINAL, 2):
        t0 = compas * COMPAS
        for paso, acorde, largo, apagado in SECCION[compas]:
            at = t0 + paso * OCTAVO
            d = largo * OCTAVO
            if acorde.startswith("n:"):  # nota suelta: sin quinta, más brillante
                f = NOTA[acorde[2:]]
                for lado, sem in ((-0.7, 500), (0.7, 600)):
                    m.add(solista(f, d * 0.9, None, sem), at, 0.32, lado)
                if compas >= 2: m.add(bajo(f, d), at, 0.55)
                continue
            # dos tomas de guitarra, una a cada lado (suena "doblada", como en estudio)
            m.add(guitarra(RAIZ[acorde], d, apagado, 100 + int(paso * 2)), at, 0.5, -0.7)
            m.add(guitarra(RAIZ[acorde], d, apagado, 200 + int(paso * 2)), at + 0.008, 0.5, 0.7)
            if compas >= 2:
                raiz = RAIZ[acorde] if RAIZ[acorde] < 120 else RAIZ[acorde] / 2
                k = 0.0
                while k < largo:
                    m.add(bajo(raiz, min(1, largo - k) * OCTAVO), at + k * OCTAVO, 0.55)
                    k += 1

    # guitarra solista, con un eco corto para que suene a escenario
    for compas, oct_, largo, f, bend in SOLO:
        at = compas * COMPAS + oct_ * OCTAVO
        n = solista(f, largo * OCTAVO, bend, compas * 10 + oct_)
        m.add(n, at, 0.3, -0.1)
        m.add(n, at + 0.32, 0.09, 0.5)

    # batería
    CRASH = {2, 4, 6, 7, 8, 12, 14}
    for compas in range(2, FINAL):
        t0 = compas * COMPAS
        coro = compas in (6, 7, 14, 15)
        relleno = compas in (5, 11, 13)  # redoble de toms en el último pulso
        if compas in CRASH:
            m.add(platillo(), t0, 0.38, 0.3)
        for p in range(4):
            at = t0 + p * PULSO
            if p in (0, 2): m.add(kick(), at, 1.0)
            if p == 2 or (p == 1 and compas % 2): m.add(kick(), at + OCTAVO, 0.7)
            if p in (1, 3) and not (relleno and p == 3): m.add(caja(), at, 0.8)
            if p in (1, 3) and coro: m.add(palmas(), at, 0.45, -0.2)
        for o in range(8):
            if relleno and o >= 6: continue
            abierto = o == 7 and not coro
            m.add(hihat(abierto), t0 + o * OCTAVO, 0.18 if abierto else (0.22 if o % 2 else 0.32), 0.4)
        if relleno:
            for k, f in enumerate((220, 196, 160, 120)):
                m.add(tom(f), t0 + 3 * PULSO + k * OCTAVO / 2, 0.7, 0.5 - k * 0.3)
        if compas == FINAL - 1:  # redoble antes del final: caja y toms
            for k in range(8):
                m.add(caja(), t0 + 2 * PULSO + k * OCTAVO / 2, 0.35 + 0.05 * k)
            for k, f in enumerate((200, 150, 110)):
                m.add(tom(f), t0 + 3 * PULSO + (k + 1) * OCTAVO / 2, 0.6, 0.4 - k * 0.4)

    # golpe final: acorde abierto que queda sonando + platillo + bombo + la solista arriba
    tf = FINAL * COMPAS
    largo = 3.6
    for lado, sem in ((-0.7, 300), (0.7, 400)):
        g = guitarra(RAIZ["E"], largo, False, sem)
        g *= np.exp(-np.arange(len(g)) / SR / 1.3)
        m.add(g, tf, 0.95, lado)
    m.add(bajo(RAIZ["E"], largo), tf, 0.6)
    m.add(kick(), tf, 1.6)
    m.add(platillo(3.5), tf, 0.7)
    alta = solista(E5, 3.2, None, 999)
    m.add(alta * np.exp(-np.arange(len(alta)) / SR / 1.6), tf, 0.32, -0.1)

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
