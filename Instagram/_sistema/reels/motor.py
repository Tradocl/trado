"""Motor de reels de Trado: lienzo, colores, tipografía, animación y armado del video.

Cada reel (ver ejemplos/ y plantilla.py) define sus escenas como funciones
f(t) -> imagen y llama a construir(). Esto se encarga del resto: dibujar los
cuadros, generar el audio y juntar todo en un .mp4 listo para Instagram.

Formato: 1080x1920 (9:16), 30 cuadros por segundo, H.264 + AAC.
Zona segura: Instagram tapa arriba (~220 px) y abajo (~420 px) con su interfaz.
Lo importante va entre y=240 y y=1500, y dentro de x=60..1020.
"""
import math, os, sys, shutil, subprocess, tempfile
from PIL import Image, ImageDraw, ImageFont, ImageFilter

AQUI = os.path.dirname(os.path.abspath(__file__))
W, H, FPS = 1080, 1920, 30
FONT = os.path.join(AQUI, "fuentes", "PlusJakartaSans.ttf")

# Colores de marca
BLUE, VIOLET, MID = (34, 48, 194), (124, 58, 237), (75, 53, 214)
GREEN, ORANGE, INK = (16, 185, 129), (255, 107, 74), (15, 20, 36)
WHITE = (255, 255, 255)
GRAY = (110, 116, 135)
LINE = (232, 234, 242)
RED = (232, 62, 62)

_fonts = {}

# Pillow sin raqm no aplica kerning: se dibuja letra por letra con tracking
# negativo (como el -0.035em de los carruseles) y el punto/coma más pegados.
_orig_text = ImageDraw.ImageDraw.text
TRACK = -0.025


def _adv(ch, f):
    return f.getlength(ch) + TRACK * f.size


def _pre(ch, f):
    return -0.1 * f.size if ch in ".," else 0


def _text(self, xy, s, fill=None, font=None, **kw):
    if font is None or len(s) <= 1:
        return _orig_text(self, xy, s, fill=fill, font=font, **kw)
    x, y = xy
    for ch in s:
        x += _pre(ch, font)
        _orig_text(self, (x, y), ch, fill=fill, font=font)
        x += _adv(ch, font)


def _textlength(self, s, font=None, **kw):
    return sum(_adv(c, font) + _pre(c, font) for c in s)


ImageDraw.ImageDraw.text = _text
ImageDraw.ImageDraw.textlength = _textlength


def font(size, weight=800):
    key = (size, weight)
    if key not in _fonts:
        f = ImageFont.truetype(FONT, size)
        try:
            f.set_variation_by_axes([weight])
        except Exception:
            pass
        _fonts[key] = f
    return _fonts[key]


def gradient():
    # Diagonal 135deg: #2230C2 -> #4B35D6 (55%) -> #7C3AED
    small = Image.new("RGB", (108, 192))
    px = small.load()
    for y in range(192):
        for x in range(108):
            t = (x / 108 + y / 192) / 2
            if t < 0.55:
                k = t / 0.55; a, b = BLUE, MID
            else:
                k = (t - 0.55) / 0.45; a, b = MID, VIOLET
            px[x, y] = tuple(int(a[i] + (b[i] - a[i]) * k) for i in range(3))
    return small.resize((W, H), Image.BICUBIC)


GRAD = gradient()


def ease_out(t):
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 3


def ease_back(t):
    t = max(0.0, min(1.0, t))
    c1, c3 = 1.70158, 2.70158
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2


def wrap(text, f, maxw, draw):
    words, lines, cur = text.split(), [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textlength(test, font=f) <= maxw:
            cur = test
        else:
            lines.append(cur); cur = w
    lines.append(cur)
    return lines


def paste_scaled(base, layer, cx, cy, scale, alpha=1.0):
    """Pega `layer` (RGBA) centrado en cx,cy con escala y opacidad."""
    if scale <= 0.01 or alpha <= 0.01:
        return
    lw, lh = layer.size
    im = layer.resize((max(1, int(lw * scale)), max(1, int(lh * scale))), Image.BICUBIC)
    if alpha < 1:
        a = im.getchannel("A").point(lambda v: int(v * alpha))
        im.putalpha(a)
    base.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2)))


def _header_viejo(img, pill=None):
    d = ImageDraw.Draw(img)
    d.text((80, 110), "trado", font=font(64, 800), fill=WHITE)
    if pill:
        f = font(26, 700)
        tw = d.textlength(pill, font=f) + len(pill) * 3
        x1 = W - 80; x0 = x1 - tw - 60
        d.rounded_rectangle((x0, 112, x1, 172), radius=30, fill=(255, 255, 255, 30),
                            outline=(255, 255, 255, 130), width=3)
        x = x0 + 30
        for ch in pill:
            d.text((x, 127), ch, font=f, fill=WHITE); x += d.textlength(ch, font=f) + 3


def flag_icon(d, x, y, s, color):
    d.line((x, y, x, y + s), fill=color, width=5)
    d.polygon([(x, y), (x + s * 0.8, y), (x + s * 0.62, y + s * 0.3), (x + s * 0.8, y + s * 0.6), (x, y + s * 0.6)], fill=color)


def alert_pill(text):
    f = font(34, 800)
    tmp = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    tw = tmp.textlength(text, font=f) + len(text) * 3
    w, h = int(tw + 130), 84
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=42, fill=ORANGE)
    flag_icon(d, 40, 22, 40, INK)
    x = 96
    for ch in text:
        d.text((x, 22), ch, font=f, fill=INK); x += d.textlength(ch, font=f) + 3
    return im


def bubble(text, typing=False):
    f = font(76, 800)
    tmp = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    lines = wrap(text, f, 780, tmp)
    lh = 92
    w = 920
    h = 150 + len(lines) * lh + 60 if not typing else 170
    if typing:
        w = 260
    im = Image.new("RGBA", (w + 40, h + 40), (0, 0, 0, 0))
    sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((20, 34, w + 20, h + 30), radius=56, fill=(10, 10, 40, 90))
    sh = sh.filter(ImageFilter.GaussianBlur(14))
    im.alpha_composite(sh)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((20, 20, w + 20, h + 20), radius=56, fill=WHITE)
    d.rectangle((20, h - 20, 70, h + 20), fill=WHITE)  # esquina inferior izquierda casi recta
    d.rounded_rectangle((20, h - 20, 70, h + 20), radius=10, fill=WHITE)
    if typing:
        return im
    d.text((80, 40), "“", font=font(170, 800), fill=BLUE)
    y = 170
    for ln in lines:
        d.text((80, y), ln, font=f, fill=INK); y += lh
    return im


TYPE_END = 0.55
_bub_cache = {}


def bubble_partial(msg, nchar):
    """Burbuja del tamaño final con solo los primeros nchar caracteres dibujados."""
    if nchar not in _bub_cache:
        full = bubble(msg)
        f = font(76, 800)
        tmp = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
        lines = wrap(msg, f, 780, tmp)
        im = bubble(" ".join(" " for _ in range(1)))  # tamaño se corrige abajo
        im = Image.new("RGBA", full.size, (0, 0, 0, 0))
        base = bubble("x")
        # redibuja el fondo de la burbuja al tamaño completo
        d0 = ImageDraw.Draw(im)
        w, h = full.size[0] - 40, full.size[1] - 40
        sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle((20, 34, w + 20, h + 30), radius=56, fill=(10, 10, 40, 90))
        im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(14)))
        d0.rounded_rectangle((20, 20, w + 20, h + 20), radius=56, fill=WHITE)
        d0.rounded_rectangle((20, h - 20, 70, h + 20), radius=10, fill=WHITE)
        d0.text((80, 40), "“", font=font(170, 800), fill=BLUE)
        left, y = nchar, 170
        for ln in lines:
            if left <= 0: break
            d0.text((80, y), ln[:left], font=f, fill=INK)
            left -= len(ln) + 1; y += 92
        _bub_cache[nchar] = im
    return _bub_cache[nchar]


def typing_dots(t):
    im = bubble("", typing=True)
    d = ImageDraw.Draw(im)
    for i in range(3):
        ph = math.sin((t * 8) - i * 0.9)
        r = 16 + 4 * max(0, ph)
        cx, cy = 90 + i * 60, 105 - 8 * max(0, ph)
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(150, 156, 180))
    return im


def underline_text(d, x, y, words, f, lh, maxw, ul_word=None, ul_prog=1.0, color=WHITE):
    """Dibuja texto envuelto; subraya en verde la palabra ul_word."""
    lines = wrap(" ".join(words), f, maxw, d)
    for ln in lines:
        d.text((x, y), ln, font=f, fill=color)
        if ul_word and ul_word in ln:
            pre = ln[:ln.index(ul_word)]
            ux = x + d.textlength(pre, font=f)
            uw = d.textlength(ul_word, font=f) * ul_prog
            if uw > 2:
                d.rounded_rectangle((ux, y + f.size * 1.08, ux + uw, y + f.size * 1.08 + 14), radius=7, fill=GREEN)
        y += lh
    return y



def _dark_bg():
    small = Image.new("RGB", (108, 192))
    px = small.load()
    for y in range(192):
        for x in range(108):
            k = y / 192
            px[x, y] = (int(15 + 10 * k), int(20 + 6 * k), int(36 + 24 * k))
    return small.resize((W, H), Image.BICUBIC).convert("RGBA")



DARK_BG = _dark_bg()


def dark():
    """Fondo oscuro (tensión: el problema, la estafa)."""
    return DARK_BG.copy()


def grad():
    """Fondo degradado de marca (alivio: Trado, la solución)."""
    return GRAD.convert("RGBA").copy()


def text_center(d, y, text, f, fill=WHITE, maxw=920, lh=None, ul=None, ul_col=ORANGE, ul_prog=1.0):
    lines = wrap(text, f, maxw, d)
    lh = lh or int(f.size * 1.12)
    for ln in lines:
        x = (W - d.textlength(ln, font=f)) / 2
        d.text((x, y), ln, font=f, fill=fill)
        if ul and ul in ln and ul_prog > 0:
            ux = x + d.textlength(ln[:ln.index(ul)], font=f)
            uw = d.textlength(ul, font=f) * ul_prog
            d.rounded_rectangle((ux, y + f.size * 1.06, ux + uw, y + f.size * 1.06 + 14), radius=7, fill=ul_col)
        y += lh
    return y


def logo(d, y=110):
    d.text((80, y), "trado", font=font(64, 800), fill=WHITE)




def capa_texto(texto, f, ancho=W, alto=400, **kw):
    """Texto centrado en una capa transparente, para animarlo con paste_scaled."""
    lay = Image.new("RGBA", (ancho, alto), (0, 0, 0, 0))
    text_center(ImageDraw.Draw(lay), 0, texto, f, **kw)
    return lay


def boton(texto, ancho=560, fondo=WHITE, color=BLUE, tam=72):
    btn = Image.new("RGBA", (ancho, 150), (0, 0, 0, 0))
    d = ImageDraw.Draw(btn)
    d.rounded_rectangle((0, 0, ancho - 1, 149), radius=75, fill=fondo)
    f = font(tam, 800)
    d.text((ancho / 2 - d.textlength(texto, font=f) / 2, 75 - tam * 0.62), texto, font=f, fill=color)
    return btn


# ------------------------------------------------------------------ armado
def _ffmpeg():
    """ffmpeg de imageio-ffmpeg (pip), o el de la variable FFMPEG, o el del PATH."""
    if os.environ.get("FFMPEG"):
        return os.environ["FFMPEG"]
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except (ImportError, AttributeError):
        exe = shutil.which("ffmpeg")
        if exe:
            return exe
        sys.exit("Falta ffmpeg. Instala con:  pip install imageio-ffmpeg")


def construir(escenas, salida, audio=None, solo_vista_previa=False):
    """escenas: lista de (duración_en_s, función f(t)->Image).
    audio: ruta a un .wav (ver sonido.py) o None.
    solo_vista_previa=True: no arma el video, guarda una hoja con un cuadro por escena."""
    if solo_vista_previa:
        hoja = Image.new("RGB", (360 * len(escenas), 640))
        for i, (dur, fn) in enumerate(escenas):
            hoja.paste(fn(dur * 0.7).convert("RGB").resize((360, 640)), (i * 360, 0))
        nombre = os.path.splitext(salida)[0] + "_vista_previa.png"
        hoja.save(nombre)
        print("Vista previa:", nombre)
        return
    tmp = tempfile.mkdtemp(prefix="reel_")
    n = 0
    for dur, fn in escenas:
        cuadros = int(round(dur * FPS))
        for j in range(cuadros):
            fn(j / FPS).convert("RGB").save(os.path.join(tmp, f"{n:05d}.png"))
            n += 1
        print(f"  escena lista ({cuadros} cuadros)")
    cmd = [_ffmpeg(), "-v", "error", "-y", "-framerate", str(FPS), "-i", os.path.join(tmp, "%05d.png")]
    if audio:
        cmd += ["-i", audio, "-c:a", "aac", "-b:a", "192k", "-shortest"]
    cmd += ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "slow", "-movflags", "+faststart", salida]
    subprocess.run(cmd, check=True)
    shutil.rmtree(tmp, ignore_errors=True)
    print(f"Listo: {salida} ({n / FPS:.1f} s)")


# ------------------------------------------------------------------ volumen
LUFS, PICO = -15.0, -3.0  # nivel parejo para los 4 reels; deja espacio a la música de Instagram


def normalizar(wav):
    """Lleva el audio a LUFS integrados con pico real <= PICO (loudnorm, dos pasadas, lineal)."""
    import json
    ff = _ffmpeg()
    med = subprocess.run([ff, "-hide_banner", "-i", wav, "-af", f"loudnorm=I={LUFS}:TP={PICO}:LRA=20:print_format=json",
                          "-f", "null", "-"], capture_output=True, text=True).stderr
    m = json.loads(med[med.rindex("{"):med.rindex("}") + 1])
    out = wav.replace(".wav", "_norm.wav")
    filtro = (f"loudnorm=I={LUFS}:TP={PICO}:LRA=20:linear=true:measured_I={m['input_i']}:"
              f"measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:"
              f"offset={m['target_offset']}")
    subprocess.run([ff, "-v", "error", "-y", "-i", wav, "-af", filtro, "-ar", "44100", out], check=True)
    return out


# ------------------------------------------------------------------ línea de comandos
INSTAGRAM = os.path.dirname(os.path.dirname(AQUI))  # .../Instagram


def cli(escenas, efectos, musica_desde, carpeta):
    """Punto de entrada de cada reel.py.

        python reel.py                      video completo, sólo efectos -> reel-sin-musica.mp4
        python reel.py --con-musica         video completo, efectos + música -> reel-con-musica.mp4
        python reel.py --sobre-video        sólo cambia el audio del reel.mp4 publicado (imagen idéntica)
        python reel.py --vista              hoja con un cuadro por escena, para revisar rápido
        python reel.py --salida X.mp4       cambia el archivo de salida

    La salida va a Instagram/2 Reels/<carpeta>/.
    """
    import argparse
    from sonido import Pista

    ap = argparse.ArgumentParser()
    ap.add_argument("--con-musica", action="store_true")
    ap.add_argument("--sobre-video", nargs="?", const="reel.mp4", default=None)
    ap.add_argument("--vista", action="store_true")
    ap.add_argument("--salida")
    a = ap.parse_args()

    destino = os.path.join(INSTAGRAM, "2 Reels", carpeta)
    os.makedirs(destino, exist_ok=True)
    salida = a.salida or os.path.join(destino, "reel-con-musica.mp4" if a.con_musica else "reel-sin-musica.mp4")

    if a.vista:
        construir(escenas, salida, solo_vista_previa=True)
        return

    duracion = sum(d for d, _ in escenas)
    p = Pista(duracion)
    efectos(p)
    wav = os.path.join(tempfile.mkdtemp(prefix="reel_audio_"), "audio.wav")
    p.guardar(wav, musica_desde=musica_desde if a.con_musica else None)
    wav = normalizar(wav)

    if a.sobre_video:
        video = a.sobre_video if os.path.isabs(a.sobre_video) else os.path.join(destino, a.sobre_video)
        subprocess.run([_ffmpeg(), "-v", "error", "-y", "-i", video, "-i", wav, "-map", "0:v", "-map", "1:a",
                        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", salida],
                       check=True)
        print(f"Listo: {salida} (imagen de {os.path.basename(video)}, audio nuevo)")
    else:
        construir(escenas, salida, audio=wav)
    shutil.rmtree(os.path.dirname(wav), ignore_errors=True)
