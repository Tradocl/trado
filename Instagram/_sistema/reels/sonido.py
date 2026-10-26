"""Sonido de los reels de Trado, en dos capas: EFECTOS y MÚSICA.

- Efectos (whooshes, pops, golpes, campanas, el "fracaso"): son la identidad sonora
  de Trado y van siempre. Cada reel los describe en su función efectos(p).
- Música (bombo, palmas, bajo y acordes a 110 BPM): opcional. Desde octubre 2026 los
  reels se publican SIN ella y se les pone una canción de la biblioteca de Instagram.

Todo es sintetizado: no hay muestras de terceros ni derechos que pagar.

    p = Pista(duracion=15.0)
    p.add(pop(), 0.05, 0.5)            # señal, segundo, volumen[, paneo]
    p.evento(0.6, "beep")              # o por nombre, con volumen por defecto
    p.guardar("audio.wav")             # sólo efectos
    p.guardar("audio.wav", musica_desde=9.0)   # efectos + música
"""
import wave
import numpy as np

SR = 44100
rng = np.random.default_rng(7)

def t_(d):
    return np.arange(int(SR * d)) / SR


def fft_filter(x, lo=None, hi=None):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo: m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi: m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))


def env(n, a=0.002, d=0.1):
    t = np.arange(n) / SR
    e = np.exp(-t / d)
    na = max(1, int(a * SR)); e[:na] *= np.linspace(0, 1, na)
    return e


# ---------------------------------------------------------------- efectos
def key_click():
    n = int(0.03 * SR)
    noise = fft_filter(rng.standard_normal(n), lo=1800, hi=9000)
    thock = np.sin(2 * np.pi * rng.uniform(180, 260) * t_(0.03)) * 0.5
    return (noise * 0.6 + thock) * env(n, 0.0005, 0.007)


def pop(f0=500, f1=1100, d=0.09):
    t = t_(d)
    f = f0 + (f1 - f0) * (t / d)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.002, 0.03)


def bell(f, d=0.6):
    t = t_(d)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.01 * t) + 0.12 * np.sin(2 * np.pi * f * 3.02 * t)
    return s * env(len(t), 0.002, d / 4)


def beep(f, d=0.11):
    t = t_(d)
    s = np.sign(np.sin(2 * np.pi * f * t)) * 0.35 + np.sin(2 * np.pi * f * t) * 0.65
    s = fft_filter(s, hi=4000)
    e = np.ones(len(t)); k = int(0.008 * SR); e[:k] = np.linspace(0, 1, k); e[-k:] = np.linspace(1, 0, k)
    return s * e


def whoosh(d=0.5, up=True):
    n = int(d * SR)
    noise = rng.standard_normal(n)
    parts = []
    seg = n // 8
    for i in range(8):
        k = i if up else 7 - i
        parts.append(fft_filter(noise[i * seg:(i + 1) * seg], lo=300 + k * 500, hi=1500 + k * 1200))
    s = np.concatenate(parts)
    s = np.pad(s, (0, n - len(s)))
    shape = np.sin(np.pi * np.linspace(0, 1, n)) ** 2
    return s * shape


def thump(d=0.35):
    t = t_(d)
    f = 45 + 60 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.003, 0.12)


def tick():
    n = int(0.02 * SR)
    return fft_filter(rng.standard_normal(n), lo=3000) * env(n, 0.0005, 0.004)



BPM = 110
BEAT = 60 / BPM
NOTE = {"C": 261.63, "D": 293.66, "E": 329.63, "F": 349.23, "G": 392.0, "A": 440.0, "B": 493.88}


def hz(name, octv):
    return NOTE[name] * 2 ** (octv - 4)


CHORDS = [("C", ["C", "E", "G"]), ("G", ["G", "B", "D"]), ("A", ["A", "C", "E"]), ("F", ["F", "A", "C"])]


def saw(f, d, voices=3, detune=0.006):
    t = t_(d)
    s = np.zeros(len(t))
    for v in range(voices):
        ff = f * (1 + detune * (v - (voices - 1) / 2))
        ph = (ff * t + rng.uniform()) % 1
        s += 2 * ph - 1
    return s / voices


def kick():
    t = t_(0.4)
    f = 48 + 110 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.001, 0.16)


def clap():
    n = int(0.18 * SR)
    s = fft_filter(rng.standard_normal(n), lo=900, hi=7000)
    e = env(n, 0.001, 0.05)
    for k in (0.008, 0.017):  # palmadas múltiples
        i = int(k * SR); e[i:] += env(n - i, 0.001, 0.04) * 0.6
    return s * e


def hat(open_=False):
    n = int((0.12 if open_ else 0.04) * SR)
    return fft_filter(rng.standard_normal(n), lo=7000) * env(n, 0.0005, 0.03 if open_ else 0.01)




def fracaso():
    """Trombón triste: cuatro notas que bajan, la última se arrastra."""
    y = np.zeros(int(1.7 * SR))
    for i, f in enumerate((392.0, 370.0, 349.2, 311.1)):
        d = 0.3 if i < 3 else 0.75
        tt = t_(d)
        s = fft_filter(saw(f * (1 - (0.06 * tt / d if i == 3 else 0)), d, 2), hi=1600) * env(len(tt), 0.01, d * 0.7)
        k = int(i * 0.28 * SR); y[k:k + len(s)] += s[: len(y) - k]
    return y


def campanas():
    y = np.zeros(int(1.0 * SR))
    for i, f in enumerate((1046.5, 1318.5, 1568.0)):
        s = bell(f, 0.7); k = int(i * 0.06 * SR); y[k:k + len(s)] += s[: len(y) - k]
    return y


def _marimba(f, d=0.35):
    tt = t_(d)
    tono = np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(2 * np.pi * f * 4.0 * tt) * np.exp(-tt / 0.02)
    return tono * env(len(tt), 0.002, d / 3.5)


def msg_recibido():
    """Mensaje que llega: dos notas cortas de marimba (propio de Trado, no copia de ninguna app)."""
    y = np.zeros(int(0.5 * SR))
    for k, f in ((0.0, 987.77), (0.09, 1318.51)):
        s = _marimba(f); i = int(k * SR); y[i:i + len(s)] += s[: len(y) - i]
    return y


def msg_enviado():
    """Mensaje enviado: un "fiu" corto que sube y una burbuja al final."""
    d = 0.12
    tt = t_(d)
    f = 500 + 1100 * (tt / d) ** 1.5
    fiu = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / d) ** 2 * 0.6
    burbuja = _marimba(1567.98, 0.18) * 0.5
    y = np.zeros(int(0.32 * SR))
    y[:len(fiu)] += fiu
    i = int(0.1 * SR); y[i:i + len(burbuja)] += burbuja[: len(y) - i]
    return y


EFECTOS = {
    "msg_recibido": (msg_recibido, 0.5),
    "msg_enviado": (msg_enviado, 0.45),
    "pop": (lambda: pop(), 0.5),
    "pop_agudo": (lambda: pop(700, 1300, 0.07), 0.45),
    "pop_grave": (lambda: pop(380, 680, 0.08), 0.45),
    "beep": (lambda: beep(880), 0.3),
    "tic": (lambda: tick(), 0.55),
    "golpe": (lambda: thump(0.45), 0.9),
    "whoosh_sube": (lambda: whoosh(0.5, up=True), 0.45),
    "whoosh_baja": (lambda: whoosh(0.4, up=False), 0.4),
    "campanas": (campanas, 0.2),
    "fracaso": (fracaso, 0.3),
}


class Pista:
    def __init__(self, duracion):
        self.dur = duracion
        self.N = int(SR * duracion)
        self.L = np.zeros(self.N)
        self.R = np.zeros(self.N)

    def add(self, sig, at, gain=1.0, pan=0.0):
        i = int(at * SR)
        if i >= self.N or i < 0:
            return
        s = sig[: self.N - i] * gain
        self.L[i:i + len(s)] += s * (1 - max(0, pan))
        self.R[i:i + len(s)] += s * (1 + min(0, pan))

    def evento(self, at, nombre, vol=None, pan=0.0):
        fn, v = EFECTOS[nombre]
        self.add(fn(), at, v if vol is None else vol, pan)

    def _musica(self, desde):
        """La música del reel 09 "Pago falso" (ya publicado): la identidad sonora de Trado.
        110 BPM, acordes Do-Sol-La-Fa, bombo, palmas, platillos, bajo en corcheas, pluck en
        contratiempo y la música bajando un poco en cada bombo (sidechain). Entra con Trado."""
        N, dur = self.N, self.dur
        L = np.zeros(N); R = np.zeros(N)

        def madd(sig, at, g=1.0, pan=0.0):
            i = int(at * SR)
            if i >= N or i < 0: return
            s = sig[: N - i] * g
            L[i:i + len(s)] += s * (1 - max(0, pan)); R[i:i + len(s)] += s * (1 + min(0, pan))

        t, bar, fin = desde, 0, dur - 1.0
        while t < fin:
            root, notes = CHORDS[bar % 4]
            for nm in notes:
                p = fft_filter(saw(hz(nm, 4), min(4 * BEAT + 0.3, fin - t + 0.1)), hi=1800)
                e = np.ones(len(p)); a = int(0.05 * SR); e[:a] = np.linspace(0, 1, a); rl = min(len(p), int(0.3 * SR)); e[-rl:] *= np.linspace(1, 0, rl)
                madd(p * e, t, 0.07, rng.uniform(-0.4, 0.4))
            for b in range(4):
                bt = t + b * BEAT
                if bt >= fin: break
                madd(kick(), bt, 0.85)
                if b in (1, 3): madd(clap(), bt, 0.35)
                madd(hat(), bt + BEAT / 2, 0.22, 0.3)
                madd(hat(), bt, 0.12, -0.3)
                for h in (0, 1):
                    bd = BEAT / 2 * 0.85
                    madd(fft_filter(saw(hz(root, 2), bd, 2), hi=420) * env(int(bd * SR), 0.004, 0.12), bt + h * BEAT / 2, 0.5)
                pl = sum(fft_filter(saw(hz(nm, 5), 0.25, 1), hi=3000) for nm in notes) * env(int(0.25 * SR), 0.002, 0.06)
                madd(pl, bt + BEAT / 2, 0.06, 0.2)
            t += 4 * BEAT; bar += 1
        madd(kick(), fin, 0.9)
        for nm in CHORDS[0][1]:
            madd(fft_filter(saw(hz(nm, 4), dur - fin), hi=2600) * env(int((dur - fin) * SR), 0.005, 0.5), fin, 0.09)
        madd(fft_filter(saw(hz(CHORDS[0][0], 2), dur - fin), hi=500) * env(int((dur - fin) * SR), 0.005, 0.8), fin, 0.35)
        # sidechain: la música respira en cada bombo
        side = np.ones(N)
        k = desde
        while k < fin:
            i = int(k * SR); n = int(0.2 * SR)
            side[i:i + n] = np.minimum(side[i:i + n], 1 - 0.35 * np.exp(-np.arange(len(side[i:i + n])) / SR / 0.06))
            k += BEAT
        kk = np.arange(N) / SR
        g = np.clip((kk - desde + 0.05) / 0.1, 0, 1) * np.clip((dur - kk) / 1.2, 0, 1) * 0.9 * side
        return L * g, R * g

    def guardar(self, salida, musica_desde=None):
        L, R = self.L.copy(), self.R.copy()
        if musica_desde is not None:
            mL, mR = self._musica(musica_desde)
            L += mL; R += mR
        mix = np.stack([L, R], axis=1)
        mix = np.tanh(mix * 1.1) / np.tanh(1.1)
        mix /= max(1e-9, np.max(np.abs(mix))) / 0.89
        with wave.open(salida, "wb") as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes((mix * 32767).astype(np.int16).tobytes())
        return salida
