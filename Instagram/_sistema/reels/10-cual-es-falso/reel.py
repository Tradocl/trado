"""Reel 03 "¿Cuál es falso?": juego de dos comprobantes, giro "los dos" y Trado.
1080x1920 a 30 fps. Usa motor.py y sonido.py.
Comprobantes genéricos: sin nombres ni logos de bancos reales."""
import math, os, random, sys
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from motor import *  # noqa: F401,F403  colores, tipografía, fondos, text_center, cli
from sonido import *  # noqa: F401,F403  Pista y efectos


# Duraciones (s) de cada escena
S1, S2, S3, SQ, S4, S5 = 4.2, 2.3, 3.6, 3.2, 3.2, 2.6  # SQ: qué es Trado (oct-2026)


def receipt(variant):
    w, h = 450, 720
    im = Image.new("RGBA", (w + 60, h + 60), (0, 0, 0, 0))
    sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((30, 46, w + 30, h + 40), radius=36, fill=(0, 0, 0, 150))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(20)))
    d = ImageDraw.Draw(im)
    x0, y0 = 30, 30
    d.rounded_rectangle((x0, y0, x0 + w, y0 + h), radius=36, fill=WHITE)
    cx = x0 + w / 2
    # check verde
    d.ellipse((cx - 44, y0 + 46, cx + 44, y0 + 134), fill=(220, 246, 236))
    d.line([(cx - 20, y0 + 92), (cx - 5, y0 + 108), (cx + 22, y0 + 76)], fill=GREEN, width=9, joint="curve")
    f = font(30, 800)
    t = "Transferencia exitosa"
    d.text((cx - d.textlength(t, font=f) / 2, y0 + 156), t, font=f, fill=INK)
    amt = "$180.000" if variant == "A" else "$ 180.000"
    fa = font(70, 800)
    d.text((cx - d.textlength(amt, font=fa) / 2, y0 + 212), amt, font=fa, fill=INK)
    d.line((x0 + 36, y0 + 330, x0 + w - 36, y0 + 330), fill=LINE, width=3)
    rows = [("Para", "Matías G."),
            ("Cuenta", "•••• 4821"),
            ("Fecha", "02/10/2026"),
            ("Hora", "14:32" if variant == "A" else "14:23"),
            ("N° operación", "88341920" if variant == "A" else "8834192O")]
    fl, fv = font(26, 600), font(28, 800)
    y = y0 + 360
    for k, v in rows:
        d.text((x0 + 40, y), k, font=fl, fill=GRAY)
        d.text((x0 + w - 40 - d.textlength(v, font=fv), y - 1), v, font=fv, fill=INK)
        y += 66
    # etiqueta A / B
    col = ORANGE if variant == "A" else (90, 120, 255)
    d.ellipse((x0 - 18, y0 - 18, x0 + 70, y0 + 70), fill=col)
    fb = font(54, 800)
    d.text((x0 + 26 - d.textlength(variant, font=fb) / 2, y0 - 7), variant, font=fb, fill=WHITE if variant == "B" else INK)
    return im


RA, RB = receipt("A"), receipt("B")
RA_POS, RB_POS = (285, 960), (795, 960)


def stamp():
    f = font(110, 800)
    tmp = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    tw = tmp.textlength("FALSO", font=f)
    w, h = int(tw + 90), 170
    im = Image.new("RGBA", (w + 40, h + 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((20, 20, w + 20, h + 20), radius=24, outline=RED, width=12, fill=(255, 255, 255, 215))
    d.rounded_rectangle((38, 38, w + 2, h + 2), radius=16, outline=RED, width=4)
    d.text((20 + (w - tw) / 2, 36), "FALSO", font=f, fill=RED)
    return im.rotate(12, expand=True, resample=Image.BICUBIC)


STAMP = stamp()


def s1(t):
    img = dark()
    d = ImageDraw.Draw(img)
    logo(d)
    # título presente desde el primer cuadro (el gancho no puede esperar)
    text_center(d, 250, "¿Cuál es falso?", font(118, 800), ul="falso", ul_prog=min(1, 0.35 + t / 0.5))
    y = text_center(d, 404, "Vendiste algo por internet y te mandan esto.", font(42, 700), fill=(205, 208, 222))
    text_center(d, y + 2, "Comenta A o B antes del final", font(42, 800), fill=ORANGE)
    flo = math.sin(t * 2.2) * 6
    paste_scaled(img, RA, RA_POS[0], RA_POS[1] + flo, 1.0)
    paste_scaled(img, RB, RB_POS[0], RB_POS[1] - flo, 1.0)
    # cuenta regresiva 3-2-1 (0,6 s a 3,6 s)
    if t >= 0.6:
        k = min(1.0, (t - 0.6) / 3.0)
        n = 3 - min(2, int((t - 0.6)))
        cx, cy, r = W / 2, 1450, 82
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(30, 36, 58), outline=(60, 66, 92), width=6)
        d.arc((cx - r, cy - r, cx + r, cy + r), start=-90, end=-90 + 360 * (1 - k), fill=ORANGE, width=12)
        fn = font(96, 800)
        sub = ((t - 0.6) % 1.0)
        sc = 1 + 0.25 * max(0, 1 - sub / 0.18)
        num = Image.new("RGBA", (200, 200), (0, 0, 0, 0))
        nd = ImageDraw.Draw(num)
        nd.text((100 - nd.textlength(str(n), font=fn) / 2, 40), str(n), font=fn, fill=WHITE)
        paste_scaled(img, num, cx, cy, sc)
    return img


# ------------------------------------------------------------- escena 2: los dos
def s2(t):
    img = dark()
    shake = 0
    for t0 in (0.05, 0.5):
        k = t - t0
        if 0 <= k < 0.18:
            shake = (1 - k / 0.18) * 14 * (1 if int(k * 60) % 2 else -1)
    d = ImageDraw.Draw(img)
    logo(d)
    text_center(d, 250, "¿Cuál es falso?", font(118, 800), ul="falso")
    y = text_center(d, 404, "Vendiste algo por internet y te mandan esto.", font(42, 700), fill=(205, 208, 222))
    text_center(d, y + 2, "Comenta A o B antes del final", font(42, 800), fill=ORANGE)
    paste_scaled(img, RA, RA_POS[0] + shake, RA_POS[1], 1.0)
    paste_scaled(img, RB, RB_POS[0] - shake, RB_POS[1], 1.0)
    for (px, py), t0 in ((RA_POS, 0.05), (RB_POS, 0.5)):
        k = (t - t0) / 0.16
        if k > 0:
            sc = 2.2 - 1.2 * ease_out(k)
            paste_scaled(img, STAMP, px, py - 40, sc * 0.92, min(1, k * 1.6))
    if t > 0.95:
        k = (t - 0.95) / 0.25
        lay = Image.new("RGBA", (W, 260), (0, 0, 0, 0))
        ld = ImageDraw.Draw(lay)
        text_center(ld, 30, "Los dos.", font(150, 800))
        paste_scaled(img, lay, W / 2, 1450, 0.85 + 0.15 * ease_back(k), min(1, k * 1.5))
    return img


# ------------------------------------------------------------- escena 3: por qué
def s3(t):
    img = dark()
    d = ImageDraw.Draw(img)
    logo(d)
    k = ease_out(t / 0.35)
    # comprobantes se alejan y se apagan
    for (px, py), r in ((RA_POS, RA), (RB_POS, RB)):
        paste_scaled(img, r, px, py + 420 * k, 1 - 0.3 * k, 1 - 0.8 * k)
        paste_scaled(img, STAMP, px, py - 40 + 420 * k, 0.92 * (1 - 0.3 * k), 1 - 0.8 * k)
    a = ease_out((t - 0.15) / 0.3)
    lay = Image.new("RGBA", (W, 900), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lay)
    y = text_center(ld, 0, "Un pantallazo se edita en un minuto.", font(104, 800), ul="un minuto",
                    ul_prog=ease_out((t - 0.5) / 0.4))
    if t > 0.9:
        y = text_center(ld, y + 50, "No prueba que la plata llegó.", font(56, 700), fill=(205, 208, 222))
    if t > 1.9:
        k2 = ease_out((t - 1.9) / 0.3)
        text_center(ld, y + 40, "Si despachas confiando en él, pierdes el producto y la plata.", font(56, 800),
                    fill=ORANGE, maxw=900)
    paste_scaled(img, lay, W / 2, 360 + 450 + 40 * (1 - a), 1.0, a)
    return img


# ------------------------------------------------------------- escena 4: Trado
def sala_card(t):
    w, h = 900, 640
    im = Image.new("RGBA", (w + 80, h + 80), (0, 0, 0, 0))
    sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((40, 60, w + 40, h + 50), radius=48, fill=(10, 10, 40, 140))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(24)))
    d = ImageDraw.Draw(im)
    x0, y0 = 40, 40
    d.rounded_rectangle((x0, y0, x0 + w, y0 + h), radius=48, fill=WHITE)
    d.text((x0 + 56, y0 + 50), "Sala · iPhone 13", font=font(34, 700), fill=GRAY)
    # pill de estado
    pk = ease_back((t - 0.35) / 0.3)
    if pk > 0:
        pill = Image.new("RGBA", (430, 84), (0, 0, 0, 0))
        pd = ImageDraw.Draw(pill)
        pd.rounded_rectangle((0, 0, 429, 83), radius=42, fill=(220, 246, 236))
        pd.ellipse((22, 18, 70, 66), fill=GREEN)
        pd.line([(34, 42), (43, 52), (59, 33)], fill=WHITE, width=6, joint="curve")
        pd.text((88, 20), "Pago liberado" if t >= 2.5 else "Pago retenido", font=font(38, 800), fill=(4, 120, 87))
        paste_scaled(im, pill, x0 + 56 + 215, y0 + 160, max(0.01, pk))
    d.text((x0 + 56, y0 + 230), "$180.000", font=font(120, 800), fill=INK)
    d.text((x0 + 56, y0 + 380), "Lo confirma Trado, no un pantallazo.", font=font(36, 700), fill=GRAY)
    # pasos
    steps = ["Pagado", "Entregas", "Se libera"]
    sx = [x0 + 110, x0 + w / 2, x0 + w - 110]
    yy = y0 + 520
    d.line((sx[0], yy, sx[2], yy), fill=LINE, width=8)
    # la barra avanza hasta el final: Pagado -> Entregas (1,6 s) -> Se libera (2,5 s)
    p1 = min(1, max(0, (t - 0.9) / 0.7))
    p2 = min(1, max(0, (t - 1.8) / 0.7))
    d.line((sx[0], yy, sx[0] + (sx[1] - sx[0]) * p1, yy), fill=GREEN, width=8)
    if p2 > 0:
        d.line((sx[1], yy, sx[1] + (sx[2] - sx[1]) * p2, yy), fill=GREEN, width=8)
    hechos = [True, p1 >= 1, p2 >= 1]
    for i, (x, s) in enumerate(zip(sx, steps)):
        on = hechos[i]
        d.ellipse((x - 26, yy - 26, x + 26, yy + 26), fill=GREEN if on else WHITE, outline=GREEN if on else LINE, width=6)
        if on:
            d.line([(x - 11, yy), (x - 3, yy + 9), (x + 12, yy - 9)], fill=WHITE, width=6, joint="curve")
        fs = font(30, 800 if on else 600)
        d.text((x - d.textlength(s, font=fs) / 2, yy + 44), s, font=fs, fill=INK if on else GRAY)
    return im


def sQ(t):
    """Quiénes somos: una página desconocida tiene que decirlo antes de explicar."""
    img = grad()
    if t < 0.18:
        img.alpha_composite(Image.new("RGBA", (W, H), (255, 255, 255, int(200 * (1 - t / 0.18)))))
    k = ease_back(t / 0.35)
    lg = Image.new("RGBA", (800, 260), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lg)
    ld.text((400 - ld.textlength("trado", font=font(200, 800)) / 2, 0), "trado", font=font(200, 800), fill=WHITE)
    paste_scaled(img, lg, W / 2, 620, 0.6 + 0.4 * k, min(1, t / 0.12))
    a = ease_out((t - 0.35) / 0.3)
    # Trado no compra ni vende: protege el pago cuando la gente compra y vende entre ella.
    lay = capa_texto("Una app chilena que protege tu plata cuando compras o vendes por internet.",
                     font(62, 800), alto=380, maxw=900, ul="protege", ul_col=GREEN, ul_prog=ease_out((t - 0.6) / 0.35))
    paste_scaled(img, lay, W / 2, 1000 + 25 * (1 - a), 1.0, a)
    if t > 1.6:
        k2 = ease_out((t - 1.6) / 0.25)
        fp = font(44, 800)
        tx = "Trado guarda la plata hasta que entregas."
        tw = int(ImageDraw.Draw(Image.new("RGBA", (1, 1))).textlength(tx, font=fp)) + 90
        pill = Image.new("RGBA", (tw, 120), (0, 0, 0, 0))
        pd = ImageDraw.Draw(pill)
        pd.rounded_rectangle((0, 0, tw - 1, 119), radius=60, fill=WHITE)
        pd.text((tw / 2 - pd.textlength(tx, font=fp) / 2, 32), tx, font=fp, fill=BLUE)
        paste_scaled(img, pill, W / 2, 1360 + 20 * (1 - k2), 1.0, k2)
    return img


def s4(t):
    img = grad()
    d = ImageDraw.Draw(img)
    logo(d)
    a = ease_out(t / 0.3)
    lay = Image.new("RGBA", (W, 400), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lay)
    text_center(ld, 0, "En Trado no hay pantallazos.", font(100, 800), ul="pantallazos", ul_col=GREEN,
                ul_prog=ease_out((t - 0.3) / 0.4))
    paste_scaled(img, lay, W / 2, 250 + 200 + 30 * (1 - a), 1.0, a)
    ck = ease_out((t - 0.15) / 0.4)
    c = sala_card(t)
    paste_scaled(img, c, W / 2, 1060 + 120 * (1 - ck), 1.0, ck)
    if t > 1.6:
        k = ease_out((t - 1.6) / 0.35)
        lay2 = Image.new("RGBA", (W, 200), (0, 0, 0, 0))
        text_center(ImageDraw.Draw(lay2), 0, "Entregas sabiendo que el pago es real.", font(48, 700))
        paste_scaled(img, lay2, W / 2, 1500 + 20 * (1 - k), 1.0, k)
    return img


# ------------------------------------------------------------- escena 5: cierre
def s5(t):
    img = grad()
    d = ImageDraw.Draw(img)
    k = ease_back(t / 0.4)
    lg = Image.new("RGBA", (700, 260), (0, 0, 0, 0))
    ImageDraw.Draw(lg).text((350 - ImageDraw.Draw(lg).textlength("trado", font=font(190, 800)) / 2, 10),
                            "trado", font=font(190, 800), fill=WHITE)
    paste_scaled(img, lg, W / 2, 560, 0.8 + 0.2 * k, min(1, t / 0.25))
    a = ease_out((t - 0.25) / 0.35)
    lay = Image.new("RGBA", (W, 400), (0, 0, 0, 0))
    text_center(ImageDraw.Draw(lay), 0, "La plata queda retenida hasta que se cumple el trato.", font(66, 800),
                maxw=880, ul="retenida", ul_col=GREEN, ul_prog=ease_out((t - 0.5) / 0.4))
    paste_scaled(img, lay, W / 2, 920 + 25 * (1 - a), 1.0, a)
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


SCENES = [("a", S1, s1), ("b", S2, s2), ("c", S3, s3), ("q", SQ, sQ), ("d", S4, s4), ("e", S5, s5)]

# ---------------------------------------------------------------- sonido
# Capa de EFECTOS: idéntica a la del reel publicado (son la identidad sonora de
# Trado). La música es otra capa, opcional: ver sonido.Pista.guardar.
MUSICA_DESDE = 10.1  # segundo en que entraba la música de fondo (si se pide --con-musica)


def efectos(p):
    S2, S3, SQ_, S4, S5 = 4.2, 6.5, 10.1, 13.3, 16.5
    # 1. juego: pulso tenso y cuenta regresiva
    dt = t_(4.2)
    drone = (np.sin(2*np.pi*55*dt) + 0.5*np.sin(2*np.pi*82.4*dt)) * (0.4 + 0.6*dt/4.2)
    p.add(drone, 0, 0.25)
    b = 0.1
    while b < 4.1:
        p.add(thump(0.25), b, 0.35); b += 0.5
    p.add(pop(), 0.05, 0.5)
    for i, at in enumerate((0.6, 1.6, 2.6)):
        p.add(beep(880), at, 0.3)
    p.add(whoosh(0.5, up=True), 3.75, 0.35)
    # 2. timbres FALSO
    for at in (S2 + 0.05, S2 + 0.5):
        p.add(thump(0.5), at, 1.0); p.add(whoosh(0.18, up=False), at - 0.05, 0.4)
        n = int(0.12*SR); p.add(fft_filter(rng.standard_normal(n), lo=200, hi=3000)*env(n, 0.001, 0.04), at, 0.5)
    p.add(pop(300, 700, 0.12), S2 + 0.97, 0.6)
    # después de "Los dos." quedaba 1 s en silencio: fondo grave que sube hacia la explicación
    dt = t_(S3 - S2 - 0.8)
    p.add((np.sin(2*np.pi*55*dt) + 0.5*np.sin(2*np.pi*82.4*dt)) * np.clip(dt / 0.3, 0, 1), S2 + 0.9, 0.22)
    # 3. explicación
    p.add(whoosh(0.4, up=False), S3 - 0.1, 0.4)
    dt = t_(3.6); p.add(np.sin(2*np.pi*49*dt)*env(len(dt), 0.05, 1.8), S3, 0.35)
    p.add(thump(0.35), S3 + 1.92, 0.7); p.add(pop(380, 700, 0.1), S3 + 1.95, 0.45)   # "pierdes el producto y la plata"
    # qué es Trado
    p.add(whoosh(0.4, up=True), SQ_ - 0.35, 0.5); p.add(thump(0.5), SQ_ + 0.02, 1.0)
    p.add(campanas(), SQ_ + 0.05, 0.25); p.add(pop(500, 850, 0.06), SQ_ + 0.62, 0.3)
    p.add(pop(650, 1100, 0.06), SQ_ + 1.62, 0.35)
    # 4. Trado
    p.add(whoosh(0.5, up=True), S4 - 0.4, 0.5)
    for i, f in enumerate((1046.5, 1318.5, 1568.0)):
        p.add(bell(f, 0.7), S4 + 0.4 + i*0.06, 0.2, (-0.2, 0.2, 0)[i])
    p.add(pop(500, 900, 0.06), S4 + 1.6, 0.25)
    # 5. cierre
    p.add(pop(600, 1400, 0.12), S5 + 0.75, 0.45)

    # Momentos con animación que sólo tapaba la música (agregados oct-2026, sin música)
    p.add(whoosh(0.35, up=True), S4 + 0.1, 0.25)        # entra la tarjeta de la sala
    p.add(pop(650, 1100, 0.06), S4 + 0.35, 0.3)         # aparece "Pago retenido"
    p.add(tick(), S4 + 1.0, 0.45)                       # avanza la barra de pasos
    p.add(pop(800, 1400, 0.05), S4 + 1.6, 0.35); p.add(tick(), S4 + 1.6, 0.45)   # check "Entregas"
    p.add(pop(800, 1400, 0.05), S4 + 2.5, 0.35); p.add(campanas(), S4 + 2.5, 0.25)  # check "Se libera"
    p.add(whoosh(0.5, up=True), S5 - 0.3, 0.35)         # cambio al cierre
    p.add(thump(0.3), S5 + 0.05, 0.45)                  # aparece el logo
    p.add(pop(500, 850, 0.06), S5 + 0.4, 0.25)          # frase de cierre
    p.add(tick(), S5 + 1.05, 0.45)                      # "Crear tu cuenta es gratis"


SCENES_CLI = [(d, f) for _, d, f in SCENES]

if __name__ == "__main__":
    cli(SCENES_CLI, efectos, MUSICA_DESDE, "10 Cual es falso")
