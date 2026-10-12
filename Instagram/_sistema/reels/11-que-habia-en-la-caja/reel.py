"""Reel 04 "¿Qué había en la caja?": compra por envío, la caja trae un ladrillo, y Trado.
1080x1920 a 30 fps. 
Datos verificados: envío = 72 h para revisar desde que se marca recibido
(auto-release-escrow); si no es lo acordado, apelación con la plata retenida."""
import math, os, random, sys
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from motor import *  # noqa: F401,F403  colores, tipografía, fondos, text_center, cli
from sonido import *  # noqa: F401,F403  Pista y efectos

S1, S2, S3, S4, S5 = 4.0, 2.6, 2.4, 3.4, 2.6

KRAFT, KRAFT_D, KRAFT_L = (196, 148, 96), (150, 108, 66), (218, 174, 122)
INSIDE = (92, 62, 36)
TAPE = (226, 204, 160)


# ------------------------------------------------------------- caja
def box_layer(opened, brick_y=None, brick_rot=0.0):
    """Caja en un lienzo W x H. opened 0..1 abre las solapas; brick_y = centro del ladrillo."""
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # sombra
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse((250, 1300, 930, 1400), fill=(0, 0, 0, 150))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(26)))
    FL, FR, FT, FB = 300, 780, 980, 1340   # cara frontal
    DX, DY = 90, -110                      # profundidad
    top = [(FL, FT), (FR, FT), (FR + DX, FT + DY), (FL + DX, FT + DY)]
    if opened <= 0:
        d.polygon(top, fill=KRAFT_L)
        cx0, cx1 = (FL + FR) / 2 - 40, (FL + FR) / 2 + 40
        d.polygon([(cx0, FT), (cx1, FT), (cx1 + DX, FT + DY), (cx0 + DX, FT + DY)], fill=TAPE)
    else:
        o = ease_out(opened)
        d.polygon(top, fill=INSIDE)
        # solapa trasera hacia arriba
        d.polygon([(FL + DX, FT + DY), (FR + DX, FT + DY), (FR + DX + 10 * o, FT + DY - 150 * o),
                   (FL + DX + 10 * o, FT + DY - 150 * o)], fill=KRAFT_D)
        # solapas laterales
        d.polygon([(FL, FT), (FL + DX, FT + DY), (FL + DX - 120 * o, FT + DY - 90 * o), (FL - 120 * o, FT - 60 * o)], fill=KRAFT)
        d.polygon([(FR, FT), (FR + DX, FT + DY), (FR + DX + 130 * o, FT + DY - 100 * o), (FR + 130 * o, FT - 50 * o)], fill=KRAFT_D)
    if brick_y is not None:
        paste_scaled(im, BRICK.rotate(brick_rot, expand=True, resample=Image.BICUBIC), (FL + FR) / 2 + 40, brick_y, 1.0)
    # lado derecho y frente
    d.polygon([(FR, FT), (FR + DX, FT + DY), (FR + DX, FB + DY), (FR, FB)], fill=KRAFT_D)
    d.rectangle((FL, FT, FR, FB), fill=KRAFT)
    if opened > 0:  # solapa frontal doblada sobre la cara
        d.polygon([(FL, FT), (FR, FT), (FR - 10, FT + 80 * ease_out(opened)), (FL + 10, FT + 80 * ease_out(opened))], fill=KRAFT_L)
    else:
        d.rectangle(((FL + FR) / 2 - 40, FT, (FL + FR) / 2 + 40, FT + 120), fill=TAPE)
    # etiqueta de envío y FRÁGIL
    d.rounded_rectangle((FL + 40, FT + 150, FL + 250, FT + 300), radius=10, fill=WHITE)
    for k in range(4):
        d.rectangle((FL + 60, FT + 175 + k * 28, FL + 230 - (k % 2) * 50, FT + 187 + k * 28), fill=(170, 172, 182))
    fr = Image.new("RGBA", (260, 90), (0, 0, 0, 0))
    fd = ImageDraw.Draw(fr)
    fd.rounded_rectangle((0, 0, 259, 89), radius=12, outline=(200, 40, 40), width=7)
    fd.text((24, 12), "FRÁGIL", font=font(56, 800), fill=(200, 40, 40))
    paste_scaled(im, fr.rotate(-8, expand=True, resample=Image.BICUBIC), FR - 140, FB - 90, 1.0)
    return im


def brick():
    w, h = 420, 190
    im = Image.new("RGBA", (w + 40, h + 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((20, 20, w + 20, h + 20), radius=14, fill=(178, 72, 50))
    d.rounded_rectangle((20, 20, w + 20, 52), radius=14, fill=(204, 96, 70))
    rnd = random.Random(3)
    for _ in range(140):  # textura
        x, y = rnd.uniform(26, w + 14), rnd.uniform(60, h + 14)
        c = rnd.choice([(150, 56, 40), (196, 88, 64), (165, 66, 46)])
        d.ellipse((x, y, x + 5, y + 5), fill=c)
    for i in range(3):
        cx = 20 + w * (i + 1) / 4
        d.ellipse((cx - 30, 70, cx + 30, 150), fill=(110, 40, 28))
    return im


BRICK = brick()


def chip(text, col=(255, 255, 255), fg=INK):
    f = font(46, 800)
    tmp = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    w = int(tmp.textlength(text, font=f) + 80)
    im = Image.new("RGBA", (w + 30, 120), (0, 0, 0, 0))
    sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((15, 22, w + 15, 104), radius=41, fill=(0, 0, 0, 140))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(10)))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((15, 15, w + 15, 97), radius=41, fill=col)
    d.text((55, 29), text, font=f, fill=fg)
    return im


CHIPS = [(chip("¿La consola?"), 250, 760, -6, 1.0),
         (chip("¿Vacía?"), 850, 730, 7, 1.7),
         (chip("¿Otra cosa?"), 820, 1500, -5, 2.4)]


def header_q(d, t):
    text_center(d, 250, "¿Qué había en la caja?", font(108, 800), ul="caja", ul_prog=min(1, 0.4 + t / 0.5))


# ------------------------------------------------------------- escena 1
def s1(t):
    img = dark()
    d = ImageDraw.Draw(img)
    logo(d)
    header_q(d, t)
    y = text_center(d, 515, "Pagó $350.000 por una consola.", font(46, 700), fill=(205, 208, 222))
    text_center(d, y + 4, "Comenta tu apuesta", font(46, 800), fill=ORANGE)
    # temblor que crece
    amp = 2 + 10 * min(1, t / 3.6)
    ang = math.sin(t * 38) * amp * 0.25
    dx = math.sin(t * 47) * amp
    lay = box_layer(0)
    lay = lay.rotate(ang, center=(540, 1160), resample=Image.BICUBIC)
    img.alpha_composite(lay, (int(dx), 0))
    for c, x, y, rot, t0 in CHIPS:
        k = (t - t0) / 0.25
        if k > 0:
            paste_scaled(img, c.rotate(rot, expand=True, resample=Image.BICUBIC), x, y, 0.6 + 0.4 * ease_back(k), min(1, k * 2))
    return img


# ------------------------------------------------------------- escena 2
def s2(t):
    img = dark()
    d = ImageDraw.Draw(img)
    logo(d)
    header_q(d, 1)
    o = min(1, t / 0.25)
    by = None
    if t > 0.15:
        k = ease_back((t - 0.15) / 0.45)
        by = 1040 - 330 * k
    rot = math.sin(t * 6) * 4 if t > 0.6 else 0
    # destello
    if 0.15 < t < 0.6:
        g = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        a = int(170 * (1 - (t - 0.15) / 0.45))
        ImageDraw.Draw(g).ellipse((240, 520, 840, 1100), fill=(255, 200, 120, a))
        img.alpha_composite(g.filter(ImageFilter.GaussianBlur(90)))
    img.alpha_composite(box_layer(o, by, rot))
    if t > 0.7:
        k = (t - 0.7) / 0.25
        lay = Image.new("RGBA", (W, 260), (0, 0, 0, 0))
        text_center(ImageDraw.Draw(lay), 30, "Un ladrillo.", font(150, 800))
        paste_scaled(img, lay, W / 2, 1530, 0.85 + 0.15 * ease_back(k), min(1, k * 1.5))
    return img


# ------------------------------------------------------------- escena 3
def s3(t):
    img = dark()
    d = ImageDraw.Draw(img)
    logo(d)
    k = ease_out(t / 0.35)
    lay = box_layer(1, 710, 3)
    lay.putalpha(lay.getchannel("A").point(lambda v: int(v * (1 - 0.7 * k))))
    img.alpha_composite(lay, (0, int(300 * k)))
    a = ease_out((t - 0.15) / 0.3)
    tx = Image.new("RGBA", (W, 800), (0, 0, 0, 0))
    td = ImageDraw.Draw(tx)
    y = text_center(td, 0, "Pagó antes de abrir la caja.", font(108, 800), ul="antes", ul_prog=ease_out((t - 0.45) / 0.4))
    if t > 0.9:
        text_center(td, y + 50, "Y la plata ya estaba en la cuenta del vendedor.", font(54, 700), fill=(205, 208, 222), maxw=860)
    paste_scaled(img, tx, W / 2, 820 + 40 * (1 - a), 1.0, a)
    return img


# ------------------------------------------------------------- escena 4
def sala_card(t):
    w, h = 900, 700
    im = Image.new("RGBA", (w + 80, h + 80), (0, 0, 0, 0))
    sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((40, 60, w + 40, h + 50), radius=48, fill=(10, 10, 40, 140))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(24)))
    d = ImageDraw.Draw(im)
    x0, y0 = 40, 40
    d.rounded_rectangle((x0, y0, x0 + w, y0 + h), radius=48, fill=WHITE)
    d.text((x0 + 56, y0 + 48), "Sala · Consola · Por envío", font=font(34, 700), fill=GRAY)
    pk = ease_back((t - 0.35) / 0.3)
    if pk > 0:
        pill = Image.new("RGBA", (430, 84), (0, 0, 0, 0))
        pd = ImageDraw.Draw(pill)
        pd.rounded_rectangle((0, 0, 429, 83), radius=42, fill=(220, 246, 236))
        pd.ellipse((22, 18, 70, 66), fill=GREEN)
        pd.line([(34, 42), (43, 52), (59, 33)], fill=WHITE, width=6, joint="curve")
        pd.text((88, 20), "Pago retenido", font=font(38, 800), fill=(4, 120, 87))
        paste_scaled(im, pill, x0 + 56 + 215, y0 + 156, max(0.01, pk))
    d.text((x0 + 56, y0 + 220), "$350.000", font=font(116, 800), fill=INK)
    # reloj 72 h
    ck = ease_out((t - 0.8) / 0.35)
    if ck > 0:
        cy = y0 + 400
        d.rounded_rectangle((x0 + 40, cy, x0 + w - 40, cy + 110), radius=28, fill=(240, 242, 255))
        d.ellipse((x0 + 70, cy + 25, x0 + 130, cy + 85), outline=BLUE, width=6)
        ang = -90 + 360 * min(1, (t - 0.8) / 2.0)
        d.line([(x0 + 100, cy + 55), (x0 + 100 + 20 * math.cos(math.radians(ang)), cy + 55 + 20 * math.sin(math.radians(ang)))], fill=BLUE, width=5)
        d.text((x0 + 160, cy + 30), "Llega la caja: 72 h para revisar", font=font(40, 800), fill=INK)
    rk = ease_out((t - 1.4) / 0.35)
    if rk > 0:
        yy = y0 + 550
        d.text((x0 + 56, yy), "Todo bien", font=font(36, 800), fill=(4, 120, 87))
        d.text((x0 + 56 + d.textlength("Todo bien", font=font(36, 800)) + 14, yy + 2), "→ se libera", font=font(36, 600), fill=GRAY)
        d.text((x0 + 56, yy + 56), "No es lo acordado", font=font(36, 800), fill=(234, 88, 12))
        d.text((x0 + 56 + d.textlength("No es lo acordado", font=font(36, 800)) + 14, yy + 58), "→ apelas, sigue retenida", font=font(36, 600), fill=GRAY)
    return im


def s4(t):
    img = grad()
    d = ImageDraw.Draw(img)
    logo(d)
    a = ease_out(t / 0.3)
    lay = Image.new("RGBA", (W, 400), (0, 0, 0, 0))
    text_center(ImageDraw.Draw(lay), 0, "En Trado, la plata espera a que abras la caja.", font(86, 800), maxw=900,
                ul="espera", ul_col=GREEN, ul_prog=ease_out((t - 0.3) / 0.4))
    paste_scaled(img, lay, W / 2, 250 + 200 + 30 * (1 - a), 1.0, a)
    ck = ease_out((t - 0.15) / 0.4)
    paste_scaled(img, sala_card(t), W / 2, 1090 + 120 * (1 - ck), 1.0, ck)
    return img


# ------------------------------------------------------------- escena 5
def s5(t):
    img = grad()
    k = ease_back(t / 0.4)
    lg = Image.new("RGBA", (700, 260), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lg)
    ld.text((350 - ld.textlength("trado", font=font(190, 800)) / 2, 10), "trado", font=font(190, 800), fill=WHITE)
    paste_scaled(img, lg, W / 2, 540, 0.8 + 0.2 * k, min(1, t / 0.25))
    a = ease_out((t - 0.25) / 0.35)
    lay = Image.new("RGBA", (W, 400), (0, 0, 0, 0))
    text_center(ImageDraw.Draw(lay), 0, "Primero abres la caja. Después se libera la plata.", font(66, 800),
                maxw=880, ul="Después", ul_col=GREEN, ul_prog=ease_out((t - 0.5) / 0.4))
    paste_scaled(img, lay, W / 2, 900 + 25 * (1 - a), 1.0, a)
    b = ease_back((t - 0.7) / 0.35)
    if b > 0:
        btn = Image.new("RGBA", (560, 150), (0, 0, 0, 0))
        bd = ImageDraw.Draw(btn)
        bd.rounded_rectangle((0, 0, 559, 149), radius=75, fill=WHITE)
        fb = font(72, 800)
        bd.text((280 - bd.textlength("trado.cl", font=fb) / 2, 30), "trado.cl", font=fb, fill=BLUE)
        paste_scaled(img, btn, W / 2, 1230, max(0.01, b))
    if t > 1.0:
        k2 = ease_out((t - 1.0) / 0.3)
        lay2 = Image.new("RGBA", (W, 100), (0, 0, 0, 0))
        text_center(ImageDraw.Draw(lay2), 0, "Crear tu cuenta es gratis", font(42, 700), fill=(225, 228, 250))
        paste_scaled(img, lay2, W / 2, 1380, 1.0, k2)
    return img


SCENES = [("a", S1, s1), ("b", S2, s2), ("c", S3, s3), ("d", S4, s4), ("e", S5, s5)]

# ---------------------------------------------------------------- sonido
# Capa de EFECTOS: idéntica a la del reel publicado (son la identidad sonora de
# Trado). La música es otra capa, opcional: ver sonido.Pista.guardar.
MUSICA_DESDE = 9.0  # segundo en que entraba la música de fondo (si se pide --con-musica)


def efectos(p):
    S2, S3, S4, S5 = 4.0, 6.6, 9.0, 12.4
    # 1. la caja tiembla: traqueteo creciente + redoble
    rt = 0.05
    while rt < 3.9:
        n = int(0.05*SR); g = 0.15 + 0.35*rt/3.9
        p.add(fft_filter(rng.standard_normal(n), lo=150, hi=1800)*env(n, 0.001, 0.02), rt, g, rng.uniform(-0.3, 0.3))
        rt += max(0.06, 0.16 - 0.025*rt)
    p.add(pop(), 0.05, 0.5)
    for at in (1.0, 1.7, 2.4):
        p.add(pop(520, 980, 0.07), at, 0.35)
    dt = t_(1.2); p.add(np.sin(2*np.pi*np.cumsum(140 + 260*(dt/1.2)**2)/SR)*(dt/1.2)**2, 2.8, 0.2)
    # 2. se abre: golpe y "fracaso" cómico (trombón que baja)
    p.add(whoosh(0.3, up=True), S2 - 0.1, 0.4)
    p.add(thump(0.5), S2 + 0.15, 1.0)
    for i, f in enumerate((392.0, 370.0, 349.2, 311.1)):
        d = 0.32 if i < 3 else 0.8
        tt = t_(d); vib = 1 + (0.012*np.sin(2*np.pi*6*tt) if i == 3 else 0)
        s = fft_filter(saw(f*vib if i < 3 else f*vib*(1 - 0.06*tt/d), d, 2), hi=1600)*env(len(tt), 0.01, d*0.7)
        p.add(s, S2 + 0.7 + i*0.3, 0.32)
    # 3. explicación
    p.add(whoosh(0.4, up=False), S3 - 0.1, 0.4)
    dt = t_(2.4); p.add(np.sin(2*np.pi*49*dt)*env(len(dt), 0.05, 1.2), S3, 0.35)
    # 4. Trado
    p.add(whoosh(0.5, up=True), S4 - 0.4, 0.5)
    for i, f in enumerate((1046.5, 1318.5, 1568.0)):
        p.add(bell(f, 0.7), S4 + 0.4 + i*0.06, 0.2, (-0.2, 0.2, 0)[i])
    p.add(tick(), S4 + 0.8, 0.5); p.add(pop(500, 900, 0.06), S4 + 1.4, 0.25)
    # 5. cierre
    p.add(pop(600, 1400, 0.12), S5 + 0.75, 0.45)

    # Momentos con animación que sólo tapaba la música (agregados oct-2026, sin música)
    p.add(whoosh(0.35, up=True), S4 + 0.1, 0.25)        # entra la tarjeta de la sala
    p.add(pop(650, 1100, 0.06), S4 + 0.35, 0.3)         # aparece "Pago retenido"
    p.add(pop(500, 850, 0.06), S4 + 1.45, 0.3)          # "Todo bien / No es lo acordado"
    p.add(tick(), S4 + 2.2, 0.4)
    p.add(whoosh(0.5, up=True), S5 - 0.3, 0.35)         # cambio al cierre
    p.add(thump(0.3), S5 + 0.05, 0.45)                  # aparece el logo
    p.add(pop(500, 850, 0.06), S5 + 0.4, 0.25)          # frase de cierre
    p.add(tick(), S5 + 1.05, 0.45)                      # "Crear tu cuenta es gratis"


SCENES_CLI = [(d, f) for _, d, f in SCENES]

if __name__ == "__main__":
    cli(SCENES_CLI, efectos, MUSICA_DESDE, "11 Que habia en la caja")
