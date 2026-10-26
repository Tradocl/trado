"""Reel 15 "Venta en el metro": un hecho real como gancho y Trado en entregas en persona.

Gancho: unos segundos de las cámaras de seguridad del Metro (estación Biobío,
línea 6, julio de 2025), tal como los mostró Meganoticias: dos personas se juntan
en los torniquetes a vender un celular por $800.000 en efectivo, el comprador no
queda conforme, forcejean y termina con disparos (de balines, según Carabineros).

Para usar lo menos posible del material ajeno y que se lea como comentario de
la noticia y no como copia:
  - sólo ~4,5 s, sin el audio original;
  - recortado sin el logo ni el titular del noticiero, en duotono de Trado y
    en cámara lenta, dentro de una tarjeta con nuestro texto encima;
  - sin la víctima en el suelo ni rostros reconocibles;
  - con la fuente escrita en pantalla.
El video original NO va al repo (público): se lee de material/noticia.mp4,
que está en .gitignore. Publicar sólo orgánico; no pautar este reel.

Todo lo de Trado verificado en la app (src/lib/escrow.ts y Transaction.tsx):
venta "Producto en persona"; el comprador paga antes y queda retenido; coordinan
el encuentro en la sala; el vendedor marca la entrega y el comprador tiene 24 h
para confirmar o reportar; si no hace nada, se libera solo al vendedor.
"""
import importlib.util, math, os, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFilter, ImageOps

REELS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # .../_sistema/reels
sys.path.insert(0, REELS)
from motor import *  # noqa: F401,F403  colores, tipografía, fondos, text_center, cli
from sonido import *  # noqa: F401,F403  Pista y efectos
from motor import _ffmpeg


def _cargar(carpeta):
    """Importa el reel.py de otra carpeta para reutilizar sus piezas."""
    spec = importlib.util.spec_from_file_location(carpeta.replace("-", "_"), os.path.join(REELS, carpeta, "reel.py"))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


R14 = _cargar("14-como-funciona")  # pill_estado, CONFETI

SV, SF, SP, SB, SC, SE = 6.0, 16 * BEAT - 6.0, 3.4, 2.4, 13.5, 3.0  # SV + SF = 4 compases justos
STEP = SC / 5
PULSO = STEP / 4

# ---------------------------------------------------------------- el video de la noticia
MATERIAL = os.path.join(os.path.dirname(os.path.abspath(__file__)), "material", "noticia.mp4")
DESDE, LARGO = 56.5, 4.6        # el intercambio en los torniquetes y el forcejeo
LENTO = 0.8                     # cámara lenta
RECORTE = (320, 0, 1684, 860)   # fuera el logo (arriba a la derecha) y el titular (y > 880)
VW = W                          # el video a todo el ancho, como en un noticiero
_frames = []


def _cargar_video():
    if _frames:
        return
    if not os.path.exists(MATERIAL):
        sys.exit(f"Falta el video de la noticia en {MATERIAL} (no va al repo; ver el docstring).")
    tmp = tempfile.mkdtemp(prefix="reel15_")
    x0, y0, x1, y1 = RECORTE
    subprocess.run([_ffmpeg(), "-v", "error", "-y", "-ss", str(DESDE), "-i", MATERIAL, "-t", str(LARGO), "-an",
                    "-vf", f"crop={x1 - x0}:{y1 - y0}:{x0}:{y0},scale={VW}:-2,fps=30", os.path.join(tmp, "%04d.png")],
                   check=True)
    for n in sorted(os.listdir(tmp)):
        # blanco y negro frío, como cámara de seguridad, con grano fino distinto en cada cuadro
        g = ImageOps.autocontrast(ImageOps.grayscale(Image.open(os.path.join(tmp, n))), cutoff=1)
        im = ImageOps.colorize(g, black=(6, 8, 18), mid=(112, 116, 136), white=(238, 240, 250)).convert("RGBA")
        ruido = Image.effect_noise(im.size, 18)
        im = Image.blend(im, Image.merge("RGBA", (ruido, ruido, ruido, Image.new("L", im.size, 255))), 0.05)
        _frames.append(im)
        os.remove(os.path.join(tmp, n))
    os.rmdir(tmp)


def cuadro(t):
    _cargar_video()
    i = min(len(_frames) - 1, int(t * LENTO * 30))
    return _frames[i]


VIDEO_FIN = LARGO / LENTO  # ~5,75 s de pantalla
VY0 = 520                  # borde superior del video


def pin(d, cx, cy, s, color, hueco=None):
    """Marcador de ubicación: cabeza redonda con punta hacia abajo."""
    d.ellipse((cx - s * 0.5, cy - s * 0.85, cx + s * 0.5, cy + s * 0.15), fill=color)
    d.polygon([(cx - s * 0.42, cy - s * 0.2), (cx + s * 0.42, cy - s * 0.2), (cx, cy + s * 0.75)], fill=color)
    if hueco:
        d.ellipse((cx - s * 0.2, cy - s * 0.55, cx + s * 0.2, cy - s * 0.15), fill=hueco)


def chip(texto, fondo=(255, 255, 255, 34), color=WHITE, tam=34, punto=None):
    f = font(tam, 800)
    tmp = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    extra = 40 if punto else 0
    w = int(tmp.textlength(texto, font=f) + 64 + extra)
    im = Image.new("RGBA", (w, tam + 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w - 1, tam + 39), radius=(tam + 40) // 2, fill=fondo)
    if punto:
        pin(d, 38, (tam + 40) / 2 + 2, 26, punto, hueco=fondo)
    d.text((32 + extra, 16), texto, font=f, fill=color)
    return im


# --- el "noticiero" de Trado: etiqueta, titular en barra y franja de datos que corre.
# Gráfica propia (colores y letra de Trado), sin imitar la del canal. Sin "EN VIVO"
# ni "ÚLTIMA HORA": el hecho es de julio de 2025.
TICKER = ("Estación Biobío, Línea 6   ·   Venta de un celular de $800.000 en efectivo   ·   "
          "A mediodía y con gente alrededor   ·   Carabineros detuvo a una persona   ·   ")
_tick = []


def _ticker_tira():
    if not _tick:
        f = font(34, 700)
        tmp = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
        w = int(tmp.textlength(TICKER, font=f)) + 1
        tira = Image.new("RGBA", (w * 2, 64), (0, 0, 0, 0))
        d = ImageDraw.Draw(tira)
        d.text((0, 11), TICKER, font=f, fill=WHITE)
        d.text((w, 11), TICKER, font=f, fill=WHITE)
        _tick.extend([tira, w])
    return _tick


def noticiero(img, t, video, titular, sub_tag="METRO DE SANTIAGO", aparece=0.5):
    """Video a todo el ancho con la gráfica de noticiero de Trado encima."""
    img.alpha_composite(video, (0, VY0))
    d = ImageDraw.Draw(img)
    # sobre el video: etiqueta y fecha
    eti = chip("CHILE", fondo=RED, tam=32, punto=WHITE)
    paste_scaled(img, eti, 50 + eti.width / 2, VY0 + 66, 1.0, ease_out((t - 0.15) / 0.25))
    fecha = chip("Jul 2025 · 12:30", fondo=(15, 20, 36, 190), tam=28)
    img.alpha_composite(fecha, (W - 50 - fecha.width, VY0 + 44))
    # titular: entra desde la izquierda
    k = ease_out((t - aparece) / 0.35)
    if k > 0:
        y0 = VY0 + video.height  # debajo del video: no tapa a las personas
        x = int(-W * (1 - k))
        ft = font(30, 800)
        tag = Image.new("RGBA", (W, 52), (0, 0, 0, 0))
        td = ImageDraw.Draw(tag)
        td.rectangle((0, 0, 50 + td.textlength(sub_tag, font=ft) + 30, 51), fill=BLUE)
        td.text((50, 9), sub_tag, font=ft, fill=WHITE)
        img.alpha_composite(tag, (x, y0 - 52))
        bar = Image.new("RGBA", (W, 110), (0, 0, 0, 0))
        bd = ImageDraw.Draw(bar)
        bd.rectangle((0, 0, W, 109), fill=WHITE)
        bd.rectangle((0, 0, 18, 109), fill=ORANGE)
        fb = font(52, 800)
        while bd.textlength(titular, font=fb) > W - 90:
            fb = font(fb.size - 2, 800)
        bd.text((50, 55 - fb.size * 0.62), titular, font=fb, fill=INK)
        img.alpha_composite(bar, (x, y0))
        # franja de datos que corre
        tira, w = _ticker_tira()
        fy = y0 + 110
        d.rectangle((0, fy, W, fy + 64), fill=MID)
        off = int((t * 160) % w)
        img.alpha_composite(tira.crop((off, 0, off + W - 230, 64)), (230, fy))
        d.rectangle((0, fy, 214, fy + 64), fill=ORANGE)
        d.text((26, fy + 14), "NOTICIAS", font=font(32, 800), fill=INK)


# ---------------------------------------------------------------- V: el video
def sV(t):
    img = dark()
    d = ImageDraw.Draw(img)
    logo(d)
    if t < 2.7:
        k = ease_out(t / 0.25)
        paste_scaled(img, capa_texto("Se juntaron en el metro a concretar la venta.", font(74, 800), alto=260, maxw=980,
                                     ul="en el metro", ul_prog=ease_out((t - 0.3) / 0.4)),
                     W / 2, 250 + 130 - 20 * (1 - k), 1.0, k)
    else:
        k = ease_back((t - 2.7) / 0.3)
        lay = Image.new("RGBA", (W, 300), (0, 0, 0, 0))
        ld = ImageDraw.Draw(lay)
        y = text_center(ld, 0, "$800.000", font(140, 800), fill=ORANGE)
        text_center(ld, y + 4, "en efectivo, en la mano.", font(60, 800))
        paste_scaled(img, lay, W / 2, 250 + 150, 0.9 + 0.1 * k, min(1, (t - 2.7) / 0.15))
    noticiero(img, t, cuadro(t), "Venta de celular termina con disparos")
    return img


# ---------------------------------------------------------------- F: el final
def sF(t):
    img = dark()
    d = ImageDraw.Draw(img)
    logo(d)
    fin = cuadro(VIDEO_FIN)
    v = Image.blend(fin, Image.new("RGBA", fin.size, (8, 10, 24, 255)), 0.45)
    noticiero(img, SV + t, v, "Venta de celular termina con disparos", aparece=-1)
    k = ease_out((t - 0.15) / 0.3)
    lay = capa_texto("Pero la venta no terminó de la mejor manera.", font(76, 800), alto=260, maxw=960,
                     ul="la mejor manera.", ul_prog=ease_out((t - 0.6) / 0.4))
    paste_scaled(img, lay, W / 2, 250 + 130 + 20 * (1 - k), 1.0, k)
    return img


# ---------------------------------------------------------------- P: el problema
def sP(t):
    img = dark()
    d = ImageDraw.Draw(img)
    logo(d)
    a = ease_out(t / 0.3)
    lay = capa_texto("El problema no fue el lugar.", font(92, 800), alto=260, maxw=940)
    paste_scaled(img, lay, W / 2, 560 + 20 * (1 - a), 1.0, a)
    paste_scaled(img, capa_texto("Era pleno metro, a mediodía.", font(50, 700), alto=80, fill=(190, 195, 215)),
                 W / 2, 760, 1.0, ease_out((t - 0.4) / 0.3))
    if t > 1.3:
        b = ease_out((t - 1.3) / 0.3)
        lay2 = capa_texto("Fue andar con la plata en la mano y discutir ahí mismo.", font(76, 800), alto=360,
                          maxw=920, ul="la plata en la mano", ul_prog=ease_out((t - 1.6) / 0.4))
        paste_scaled(img, lay2, W / 2, 1120 + 30 * (1 - b), 1.0, b)
    return img


# ---------------------------------------------------------------- B: Trado
def sB(t):
    img = grad()
    a = ease_back(t / 0.4)
    lg = Image.new("RGBA", (700, 260), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lg)
    ld.text((350 - ld.textlength("trado", font=font(190, 800)) / 2, 10), "trado", font=font(190, 800), fill=WHITE)
    paste_scaled(img, lg, W / 2, 600, 0.8 + 0.2 * a, min(1, t / 0.25))
    b = ease_out((t - 0.35) / 0.35)
    lay = capa_texto("Una app chilena que guarda la plata hasta que se cumple el trato.", font(64, 800), maxw=900,
                     alto=300, ul="guarda la plata", ul_col=GREEN, ul_prog=ease_out((t - 0.7) / 0.4))
    paste_scaled(img, lay, W / 2, 960 + 25 * (1 - b), 1.0, b)
    if t > 1.2:
        paste_scaled(img, chip("En persona, por envío o digital", fondo=WHITE, color=BLUE, tam=40), W / 2, 1260, 1.0,
                     ease_back((t - 1.2) / 0.3))
    return img


# ---------------------------------------------------------------- C: línea de tiempo en persona
# Cada paso entra con su ícono animado; los anteriores quedan con check y arriba
# una píldora dice dónde está la plata en cada momento (la idea clave: retenida).
PASOS = [
    ("Pagas en Trado", "Queda retenida, no en la cuenta del vendedor.", "candado"),
    ("Te lo entregan", "En persona, por envío o digital.", "pin"),
    ("Revisas", "Tienes un plazo para ver que esté bien.", "lupa"),
    ("¿No cuadra? Lo reportas", "La plata sigue en Trado.", "bandera"),
    ("¿Todo bien? Confirmas", "Trado le libera la plata al vendedor.", "check"),
]
PLATA = ["Retenida en Trado", "Sigue retenida", "Sigue retenida", "Sigue retenida", "Liberada al vendedor"]
TL_X, TL_Y0, TL_DY = 140, 600, 196
OK_COL = (4, 120, 87)


def icono(d, tipo, cx, cy, s, t, col):
    """Íconos simples dibujados, con una animación corta al entrar (t desde que aparece)."""
    w = max(4, int(s * 0.16))
    if tipo == "candado":
        lift = s * 0.28 * (1 - ease_out((t - 0.25) / 0.3))
        d.rounded_rectangle((cx - s * 0.55, cy - s * 0.12, cx + s * 0.55, cy + s * 0.68), radius=int(s * 0.14), fill=col)
        d.arc((cx - s * 0.36, cy - s * 0.78 - lift, cx + s * 0.36, cy - s * 0.06 - lift), 180, 360, fill=col, width=w)
        d.line((cx - s * 0.36 + w / 2, cy - s * 0.42 - lift, cx - s * 0.36 + w / 2, cy - s * 0.1), fill=col, width=w)
        d.line((cx + s * 0.36 - w / 2, cy - s * 0.42 - lift, cx + s * 0.36 - w / 2, cy - s * 0.1), fill=col, width=w)
    elif tipo == "pin":
        o = -s * 0.9 * (1 - ease_back(t / 0.45))
        d.ellipse((cx - s * 0.4, cy + s * 0.62, cx + s * 0.4, cy + s * 0.78), fill=col + (90,) if len(col) == 3 else col)
        pin(d, cx, cy + o, s * 1.05, col, hueco=WHITE)
    elif tipo == "lupa":
        dx = s * 0.22 * math.sin(t * 5)
        r = s * 0.42
        d.ellipse((cx - 0.12 * s + dx - r, cy - 0.12 * s - r, cx - 0.12 * s + dx + r, cy - 0.12 * s + r), outline=col, width=w)
        d.line((cx + 0.2 * s + dx, cy + 0.2 * s, cx + 0.62 * s + dx, cy + 0.62 * s), fill=col, width=int(w * 1.4))
    elif tipo == "bandera":
        ola = s * 0.09 * math.sin(t * 8)
        d.line((cx - s * 0.45, cy - s * 0.72, cx - s * 0.45, cy + s * 0.75), fill=col, width=w)
        d.polygon([(cx - s * 0.45, cy - s * 0.72), (cx + s * 0.62, cy - s * 0.72 + ola), (cx + s * 0.36, cy - s * 0.36),
                   (cx + s * 0.62, cy + ola), (cx - s * 0.45, cy)], fill=col)
    elif tipo == "check":
        k = ease_out(t / 0.4)
        p1, p2, p3 = (cx - s * 0.48, cy), (cx - s * 0.14, cy + s * 0.36), (cx + s * 0.52, cy - s * 0.36)
        if k < 0.4:
            q = k / 0.4
            d.line([p1, (p1[0] + (p2[0] - p1[0]) * q, p1[1] + (p2[1] - p1[1]) * q)], fill=col, width=int(w * 1.3))
        else:
            q = (k - 0.4) / 0.6
            d.line([p1, p2, (p2[0] + (p3[0] - p2[0]) * q, p2[1] + (p3[1] - p2[1]) * q)], fill=col, width=int(w * 1.3),
                   joint="curve")


def plata_pill(i, tt):
    """Píldora 'La plata: …' que cambia en el paso 1 y el 5."""
    f1, f2 = font(38, 700), font(38, 800)
    estado = PLATA[i]
    col = GREEN if i == 4 else OK_COL
    tmp = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    w = int(120 + tmp.textlength("La plata:", font=f1) + 14 + tmp.textlength(estado, font=f2) + 44)
    im = Image.new("RGBA", (w, 90), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w - 1, 89), radius=45, fill=WHITE)
    d.ellipse((20, 13, 84, 77), fill=tuple(int(c + (255 - c) * 0.85) for c in col))
    icono(d, "check" if i == 4 else "candado", 52, 46, 30, tt if i in (0, 4) else 9, col)
    x = 104
    d.text((x, 22), "La plata:", font=f1, fill=GRAY)
    x += d.textlength("La plata:", font=f1) + 14
    d.text((x, 22), estado, font=f2, fill=col)
    return im


# --- los monitos: comprador a la izquierda, vendedor a la derecha, Trado (la bóveda) al medio
SUELO = 960
BX0, SX0, BX1, SX1 = 230, 850, 400, 680   # posición antes y después de juntarse
VAULT = (540, 560)
CAJA = (186, 134, 84)


def lerp(a, b, k):
    return a + (b - a) * k


def monito(d, x, mira, paso=0.0, mano=None, otra=None, col=WHITE):
    """Persona de palo. mira=+1 mira a la derecha. paso: fase de caminata.
    mano/otra: posición de las manos (por defecto, colgando)."""
    g, lw = SUELO, 11
    cab = (x, g - 225)
    hom, cad = (x, g - 165), (x, g - 92)
    d.ellipse((cab[0] - 32, cab[1] - 32, cab[0] + 32, cab[1] + 32), outline=col, width=lw)
    d.line([(x, g - 193), cad], fill=col, width=lw)
    sw = 26 * math.sin(paso)
    for pie in ((x - 30 + sw, g), (x + 30 - sw, g)):
        d.line([cad, pie], fill=col, width=lw)
        d.ellipse((pie[0] - 6, pie[1] - 6, pie[0] + 6, pie[1] + 6), fill=col)
    m1 = mano or (x + 46 * mira, g - 100)
    m2 = otra or (x - 46 * mira, g - 100)
    for m in (m1, m2):
        d.line([hom, m], fill=col, width=lw)
        d.ellipse((m[0] - 7, m[1] - 7, m[0] + 7, m[1] + 7), fill=col)
    for p in (cad, hom):
        d.ellipse((p[0] - 6, p[1] - 6, p[0] + 6, p[1] + 6), fill=col)


def billete(img, cx, cy, s=1.0, alpha=1.0):
    b = Image.new("RGBA", (120, 66), (0, 0, 0, 0))
    bd = ImageDraw.Draw(b)
    bd.rounded_rectangle((0, 0, 119, 65), radius=12, fill=GREEN)
    bd.rounded_rectangle((8, 8, 111, 57), radius=8, outline=(255, 255, 255, 140), width=3)
    bd.text((60 - bd.textlength("$", font=font(40, 800)) / 2, 8), "$", font=font(40, 800), fill=WHITE)
    paste_scaled(img, b, cx, cy, s, alpha)


def caja(d, cx, cy):
    d.rectangle((cx - 40, cy - 34, cx + 40, cy + 34), fill=CAJA)
    d.rectangle((cx - 40, cy - 34, cx + 40, cy - 20), fill=(160, 112, 66))
    d.line((cx, cy - 34, cx, cy + 34), fill=(236, 214, 170), width=8)


ENTREGAS = [("En persona", "mano"), ("Por envío", "camion"), ("Digital", "entrada")]
VIAJE = 0.78  # segundos por cada forma de entrega


def camion(d, cx, cy):
    d.rounded_rectangle((cx - 52, cy - 34, cx + 14, cy + 18), radius=6, fill=WHITE)
    d.rounded_rectangle((cx + 14, cy - 16, cx + 50, cy + 18), radius=6, fill=ORANGE)
    d.rectangle((cx + 24, cy - 10, cx + 40, cy + 2), fill=(255, 220, 205))
    for wx in (cx - 30, cx + 30):
        d.ellipse((wx - 13, cy + 8, wx + 13, cy + 34), fill=INK)
        d.ellipse((wx - 5, cy + 16, wx + 5, cy + 26), fill=WHITE)


def entrada(d, cx, cy):
    """Entrada a un concierto (lo típico que se vende en digital)."""
    x0, y0, x1, y1 = cx - 105, cy - 56, cx + 105, cy + 56
    d.rounded_rectangle((x0, y0, x1, y1), radius=16, fill=ORANGE)
    nx = cx + 46  # corte del talón
    for yy in (y0, y1):
        d.ellipse((nx - 13, yy - 13, nx + 13, yy + 13), fill=(68, 52, 205))
    for yy in range(int(y0 + 18), int(y1 - 14), 12):
        d.line((nx, yy, nx, yy + 6), fill=WHITE, width=3)
    d.text((x0 + 16, y0 + 18), "ENTRADA", font=font(30, 800), fill=WHITE)
    d.text((x0 + 16, y0 + 58), "CONCIERTO", font=font(21, 800), fill=INK)
    for k, w in enumerate((4, 2, 5, 2, 3, 2, 4, 3, 2)):  # código de barras en el talón
        xb = nx + 14 + k * 5
        d.line((xb, y0 + 20, xb, y1 - 20), fill=INK, width=max(1, w - 1))


def boveda(img, i, tt):
    """Trado al medio: la caja fuerte donde queda la plata."""
    cx, cy = VAULT
    late = 1 + 0.05 * math.sin(tt * 7) * max(0, 1 - tt / 1.2) if i == 3 else 1.0
    v = Image.new("RGBA", (260, 230), (0, 0, 0, 0))
    vd = ImageDraw.Draw(v)
    vd.rounded_rectangle((10, 20, 249, 219), radius=36, fill=WHITE)
    vd.text((130 - vd.textlength("trado", font=font(50, 800)) / 2, 40), "trado", font=font(50, 800), fill=BLUE)
    adentro = (i == 0 and tt > 1.2) or i in (1, 2, 3) or (i == 4 and tt < 0.5)
    icono(vd, "check" if (i == 4 and tt > 1.3) else "candado", 130, 152, 38,
          (tt - 0.95) if i == 0 else 9, (GREEN if i == 4 else OK_COL) if adentro or i == 4 else GRAY)
    paste_scaled(img, v, cx, cy, late)
    return adentro


def escenario(img, i, tt):
    d = ImageDraw.Draw(img)
    bx, sx = 300, 780
    d.line((60, SUELO + 8, W - 60, SUELO + 8), fill=(255, 255, 255, 70), width=4)
    d.text((bx - d.textlength("Comprador", font=font(32, 700)) / 2, SUELO + 24), "Comprador", font=font(32, 700),
           fill=(225, 228, 250))
    d.text((sx - d.textlength("Vendedor", font=font(32, 700)) / 2, SUELO + 24), "Vendedor", font=font(32, 700),
           fill=(225, 228, 250))
    boveda(img, i, tt)
    manob = manov = None
    # paso 1: el comprador paga y la plata vuela a Trado
    if i == 0:
        manob = (bx + 70, SUELO - 150)
        k = ease_out((tt - 0.35) / 0.8)
        if tt < 1.2:
            billete(img, lerp(manob[0] + 30, VAULT[0], k), lerp(manob[1] - 20, VAULT[1] + 20, k) - 120 * math.sin(math.pi * k),
                    1.0 - 0.3 * k)
    # paso 2: el producto llega al comprador, en persona, por envío o digital
    caja_pos = luego = None
    if i == 1:
        manov = (sx - 60, SUELO - 145)
        n = min(2, int(max(0.0, tt - 0.15) / VIAJE))
        k = ease_out(((tt - 0.15) - n * VIAJE) / (VIAJE * 0.8))
        etiqueta, tipo = ENTREGAS[n]
        x = lerp(sx - 80, bx + (150 if tipo == "entrada" else 80), k)
        if tipo == "camion":
            camion(d, x, SUELO - 30)
        else:
            y = lerp(SUELO - 150, SUELO - 150, k) - 70 * math.sin(math.pi * k)
            luego = (caja if tipo == "mano" else entrada, x, y)  # encima de los monitos
        if n == 2 and k >= 1:
            manob = (bx + 60, SUELO - 145)
        ek = ease_back(((tt - 0.15) - n * VIAJE) / 0.25)
        paste_scaled(img, chip(etiqueta, fondo=WHITE, color=BLUE, tam=34), 540, 712, max(0.01, min(1.0, ek)))
    elif i >= 2:
        caja_pos = (bx + 70, SUELO - 150)
        manob = (bx + 60, SUELO - 145)
        if i == 2 and tt > 0.3:
            icono(d, "lupa", bx + 85 + 12 * math.sin(tt * 6), SUELO - 215, 40, tt, ORANGE)
    monito(d, bx, +1, 0.0, mano=manob)
    monito(d, sx, -1, 0.0, mano=manov)
    if luego:
        luego[0](d, luego[1], luego[2])
    if caja_pos:
        caja(d, *caja_pos)
    # paso 4: si no cuadra, se reporta; la plata no se mueve
    if i == 3:
        k = ease_back((tt - 0.2) / 0.35)
        if k > 0:
            bur = Image.new("RGBA", (130, 130), (0, 0, 0, 0))
            bd = ImageDraw.Draw(bur)
            bd.ellipse((0, 0, 129, 129), fill=WHITE)
            icono(bd, "bandera", 66, 64, 40, tt, ORANGE)
            paste_scaled(img, bur, bx - 60, SUELO - 330, max(0.01, k))
    # paso 5: confirma y la plata va al vendedor
    if i == 4:
        k = ease_back((tt - 0.1) / 0.35)
        if k > 0:
            bur = Image.new("RGBA", (130, 130), (0, 0, 0, 0))
            bd = ImageDraw.Draw(bur)
            bd.ellipse((0, 0, 129, 129), fill=WHITE)
            icono(bd, "check", 65, 66, 40, tt - 0.1, OK_COL)
            paste_scaled(img, bur, bx - 60, SUELO - 330, max(0.01, k))
        k2 = ease_out((tt - 0.5) / 0.8)
        if tt > 0.5:
            billete(img, lerp(VAULT[0], sx - 70, k2), lerp(VAULT[1] + 20, SUELO - 150, k2) - 120 * math.sin(math.pi * k2),
                    0.7 + 0.3 * k2)
    elif (i == 0 and tt > 1.2) or i in (1, 2, 3):
        billete(img, VAULT[0] + 95, VAULT[1] + 80, 0.6)  # la plata queda guardada en Trado


def sC(t):
    img = grad()
    d = ImageDraw.Draw(img)
    logo(d)
    i = min(4, int(t / STEP))
    tt = t - i * STEP
    a = ease_out(t / 0.3)
    paste_scaled(img, capa_texto("Así funciona Trado:", font(60, 800), alto=100), W / 2, 260 + 20 * (1 - a), 1.0, a)
    pk = ease_back(tt / 0.35) if i in (0, 4) else 1.0
    paste_scaled(img, plata_pill(i, tt), W / 2, 380, max(0.01, 0.85 + 0.15 * pk), min(1, t / 0.2))
    escenario(img, i, tt)
    d = ImageDraw.Draw(img)
    # línea de tiempo resumida
    y, xs = 1070, 120
    ys = []
    for j in range(5):
        ys.append(y)
        y += 128 if j == i else 74
    d.line((xs, ys[0], xs, ys[-1]), fill=(255, 255, 255, 70), width=6)
    ant = ys[max(0, i - 1)]
    d.line((xs, ys[0], xs, ant + (ys[i] - ant) * ease_out(tt / 0.35)), fill=WHITE, width=6)
    for j, (tit, sub, tipo) in enumerate(PASOS):
        yj = ys[j]
        if j < i and j == 3:  # "¿No cuadra?" es el camino alternativo: no se marca como hecho
            d.ellipse((xs - 22, yj - 22, xs + 22, yj + 22), outline=(255, 255, 255, 110), width=4)
            d.text((xs + 50, yj - 22), tit, font=font(36, 700), fill=(255, 255, 255, 110))
        elif j < i:
            d.ellipse((xs - 24, yj - 24, xs + 24, yj + 24), fill=GREEN)
            icono(d, "check", xs, yj, 18, 9, WHITE)
            d.text((xs + 50, yj - 22), tit, font=font(36, 700), fill=(255, 255, 255, 200))
        elif j == i:
            k = ease_out(tt / 0.3)
            d.ellipse((xs - 30, yj - 30, xs + 30, yj + 30), fill=WHITE)
            n = str(j + 1)
            d.text((xs - d.textlength(n, font=font(34, 800)) / 2, yj - 22), n, font=font(34, 800), fill=BLUE)
            lay = Image.new("RGBA", (900, 130), (0, 0, 0, 0))
            ld = ImageDraw.Draw(lay)
            ld.text((0, 0), tit, font=font(46, 800), fill=WHITE)
            ld.text((0, 60), sub, font=font(32, 700), fill=(225, 228, 250))
            img.alpha_composite(lay, (int(xs + 50 + 40 * (1 - k)), int(yj - 30)))
        else:
            d.ellipse((xs - 22, yj - 22, xs + 22, yj + 22), outline=(255, 255, 255, 110), width=4)
            d.text((xs + 50, yj - 22), tit, font=font(36, 700), fill=(255, 255, 255, 110))
    if i == 4 and tt > 1.2:
        k = min(1.0, (tt - 1.2) / 1.0)
        for (dx, dy), col in R14.CONFETI:
            x = SX1 + dx * 0.6 * ease_out(k)
            yy = SUELO - 200 + dy * 0.6 * ease_out(k) + 260 * k * k
            d.rounded_rectangle((x - 10, yy - 5, x + 10, yy + 5), radius=3, fill=col + (int(255 * (1 - k)),))
    return img


# ---------------------------------------------------------------- E: cierre
def sE(t):
    img = grad()
    a = ease_out(t / 0.3)
    lay = capa_texto("Compra y vende sin tener que confiar en un desconocido.", font(76, 800), maxw=900, alto=300,
                     ul="confiar", ul_col=GREEN, ul_prog=ease_out((t - 0.35) / 0.4))
    paste_scaled(img, lay, W / 2, 620 + 25 * (1 - a), 1.0, a)
    b = ease_back((t - 0.6) / 0.35)
    if b > 0:
        paste_scaled(img, boton("Crea tu sala en trado.cl", ancho=780, tam=60), W / 2, 1000, max(0.01, b))
    if t > 0.9:
        paste_scaled(img, capa_texto("Link en la bio", font(44, 700), alto=100,
                                     fill=(225, 228, 250), maxw=900), W / 2, 1200, 1.0, ease_out((t - 0.9) / 0.3))
    return img


SCENES = [("v", SV, sV), ("f", SF, sF), ("p", SP, sP), ("b", SB, sB), ("c", SC, sC), ("e", SE, sE)]

# ---------------------------------------------------------------- sonido
MUSICA_DESDE = SV + SF  # la música de Trado entra después del golpe del final de la noticia: sin silencios


def _ruido(d, seed=0):
    return np.random.default_rng(seed).uniform(-1, 1, int(d * SR))


def _f(nota):
    """Frecuencias que no están en sonido.NOTE (sostenidos/bemoles)."""
    return {"G#3": 207.65, "Bb5": 932.33, "A5": 880.0}[nota]


def noticia_musica(p, hasta):
    """Cortina de suspenso de noticiero, 110 BPM como la música de Trado.
    La menor - La menor - Fa - Mi: bajo grave en semicorcheas (corazón acelerado), tic-tac
    de reloj, cuerdas oscuras que crecen, un agudo disonante (La-Si bemol) muy suave,
    timbal grave en cada compás y metales graves cortos. En el último compás, redoble y
    barrido hasta el tiempo fuerte donde entra la música de Trado."""
    acordes = [("A", [hz("A", 3), hz("C", 4), hz("E", 4)]),
               ("A", [hz("A", 3), hz("C", 4), hz("E", 4)]),
               ("F", [hz("F", 3), hz("A", 3), hz("C", 4)]),
               ("E", [hz("E", 3), _f("G#3"), hz("B", 3)])]
    n_comp = int(round(hasta / (4 * BEAT)))
    S16 = BEAT / 4
    for bar in range(n_comp):
        t = bar * 4 * BEAT
        raiz, fr = acordes[bar % 4]
        ultimo = bar == n_comp - 1
        crece = 0.6 + 0.4 * bar / max(1, n_comp - 1)
        # timbal grave: golpe + sub que se apaga
        dt = t_(1.2)
        p.add(np.sin(2 * np.pi * 55 * dt * (1 - 0.15 * dt)) * np.exp(-dt / 0.35), t, 0.55 * crece)
        p.add(thump(0.5), t, 0.5)
        # metales graves cortos en el 1 y en el "y" del 2
        for st, largo in ((0.0, 0.35), (1.5 * BEAT, 0.18)):
            if ultimo and st > 0:
                continue
            for f0 in fr:
                ac = fft_filter(saw(f0 / 2, largo, 3), hi=1500) * env(int(largo * SR), 0.006, largo * 0.5)
                p.add(ac, t + st, 0.1 * crece)
        # cuerdas oscuras sostenidas, con entrada lenta
        largo = 4 * BEAT + 0.15
        for f0 in fr:
            pad = fft_filter(saw(f0, largo, 4, 0.01), hi=1100)
            e = np.ones(len(pad)); at = int(0.5 * SR); e[:at] = np.linspace(0, 1, at); rl = int(0.15 * SR); e[-rl:] = np.linspace(1, 0, rl)
            p.add(pad * e, t, 0.1 * crece)
        # agudo disonante con trémolo (la tensión)
        dt = t_(largo)
        trem = 0.6 + 0.4 * np.sin(2 * np.pi * 7 * dt)
        brillo = (np.sin(2 * np.pi * _f("A5") * dt) + 0.7 * np.sin(2 * np.pi * _f("Bb5") * dt)) * trem
        brillo *= np.clip(dt / 0.6, 0, 1) * np.clip((largo - dt) / 0.15, 0, 1)
        p.add(brillo, t, 0.02 * crece)
        # bajo en semicorcheas, acento en cada tiempo
        for k in range(16):
            dur = S16 * 0.8
            g = 0.75 if k % 4 == 0 else 0.55
            p.add(fft_filter(saw(fr[0] / 4, dur, 2), hi=300) * env(int(dur * SR), 0.003, 0.06), t + k * S16, g)
        # tic-tac de reloj en corcheas
        for c in range(8):
            p.add(tick(), t + c * BEAT / 2, 0.2 if c % 2 == 0 else 0.12, 0.35 if c % 2 else -0.35)
        p.add(kick(), t, 0.55)
        if ultimo:
            t0 = t + 2 * BEAT
            k, paso, tr = 0, S16, t0
            while tr < hasta - 0.02:
                p.add(clap(), tr, 0.12 + 0.3 * (tr - t0) / (hasta - t0))
                tr += paso
                k += 1
                if k == 4:
                    paso = S16 / 2
            d = hasta - t0
            p.add(fft_filter(_ruido(d, 3), lo=1500) * np.linspace(0, 1, int(d * SR)) ** 2, t0, 0.12)
    cr = fft_filter(_ruido(1.6, 7), lo=4000) * env(int(1.6 * SR), 0.002, 0.45)
    p.add(cr, hasta, 0.22)
    p.add(kick(), hasta, 0.6)


def efectos(p):
    F, P, B, C, E = SV, SV + SF, SV + SF + SP, SV + SF + SP + SB, SV + SF + SP + SB + SC
    # video: cortina de noticiero (sin el audio de la noticia ni disparos) hasta "no terminó bien"
    noticia_musica(p, F + SF)  # = 16 tiempos justos
    p.add(whoosh(0.35, up=True), 0.0, 0.3)
    p.add(pop(500, 900, 0.06), 0.2, 0.25)               # etiqueta CHILE
    p.add(whoosh(0.3, up=True), 0.5, 0.25)              # entra el titular
    p.add(thump(0.35), 5 * BEAT, 0.45)                   # $800.000, en el tiempo
    # final: golpe seco y silencio corto
    p.add(whoosh(0.3, up=False), F - 0.2, 0.3)
    p.add(thump(0.45), 11 * BEAT, 0.7)                   # 'no terminó de la mejor manera', en el tiempo
    # el problema
    p.add(pop(420, 760, 0.07), P + 0.02, 0.35)
    p.add(thump(0.3), P + 1.3, 0.5)
    dt = t_(SP)
    p.add(np.sin(2 * np.pi * 55 * dt) * (1 - dt / SP), P, 0.12)
    # Trado
    p.add(whoosh(0.5, up=True), B - 0.4, 0.45)
    p.add(campanas(), B + 0.05, 0.22)
    p.add(pop(600, 1200, 0.08), B + 1.2, 0.35)
    # pasos
    for i in range(5):
        t0 = C + i * STEP
        p.add(whoosh(0.3, up=True), t0 - 0.15, 0.35)
        p.add(pop(600, 1000, 0.06), t0 + 0.02, 0.35)
        p.add(pop(800, 1400, 0.05), t0 + PULSO, 0.3)
    p.add(whoosh(0.6, up=True), C + 0.35, 0.3)           # la plata vuela a Trado
    p.add(tick(), C + 1.0, 0.6)                          # candado: se cierra
    for n in range(3):                                   # en persona, envío, digital
        p.add(whoosh(0.35, up=True), C + STEP + 0.15 + n * VIAJE, 0.3)
        p.add(pop(500 + n * 150, 900 + n * 150, 0.06), C + STEP + 0.2 + n * VIAJE, 0.3)
    p.add(pop(300, 520, 0.08), C + 2 * STEP + 0.3, 0.4)  # lupa
    p.add(whoosh(0.6, up=True), C + 4 * STEP + 0.5, 0.3) # la plata al vendedor
    p.add(campanas(), C + 4 * STEP + PULSO, 0.25)        # se libera
    for k in range(6):
        p.add(pop(900 + k * 120, 1600 + k * 100, 0.04), C + 4 * STEP + 0.55 + k * 0.06, 0.15)
    # cierre
    p.add(whoosh(0.5, up=True), E - 0.3, 0.35)
    p.add(pop(600, 1400, 0.12), E + 0.65, 0.45)
    p.add(tick(), E + 0.95, 0.4)
    for i, f in enumerate((523.25, 659.25, 783.99)):
        p.add(bell(f, 2.0), E + 1.1 + i * 0.05, 0.12)
    dt = t_(1.4); p.add(np.sin(2 * np.pi * 130.81 * dt) * env(len(dt), 0.05, 0.7), E + 1.05, 0.18)


SCENES_CLI = [(d, f) for _, d, f in SCENES]

if __name__ == "__main__":
    cli(SCENES_CLI, efectos, MUSICA_DESDE, "15 Venta en el metro")
