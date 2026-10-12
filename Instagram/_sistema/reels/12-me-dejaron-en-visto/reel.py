"""Reel 05 "Me dejaron en visto": freelancer que trabaja y no le pagan, y Trado.
1080x1920 a 30 fps. 
Dato verificado (auto-release-escrow): servicio -> si el cliente no confirma ni
apela, se libera al vencer 24 h desde que el prestador lo marca realizado.
Chat genérico: sin la marca ni los colores de ninguna app de mensajería."""
import math, os, random, sys
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from motor import *  # noqa: F401,F403  colores, tipografía, fondos, text_center, cli
from sonido import *  # noqa: F401,F403  Pista y efectos

S1, S2, S3, S4, S5 = 4.2, 2.6, 2.4, 3.6, 2.6
INDIGO = (67, 56, 202)
PANEL = (24, 30, 48)
IN_BG = (44, 52, 78)

# ------------------------------------------------------------- chat
CX0, CX1, CY0, CY1 = 80, 1000, 560, 1360


def msg_bubble(text, out, file_chip=None):
    f = font(44, 700)
    tmp = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    lines = wrap(text, f, 600, tmp)
    tw = max(tmp.textlength(l, font=f) for l in lines)
    w = int(max(tw, 420 if file_chip else 0) + 70)
    h = 40 + len(lines) * 58 + (110 if file_chip else 0) + 10
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=34, fill=INDIGO if out else IN_BG)
    y = 26
    if file_chip:
        d.rounded_rectangle((22, 20, w - 22, 112), radius=20, fill=(90, 80, 220))
        d.rounded_rectangle((40, 36, 100, 96), radius=12, fill=(255, 255, 255))
        d.text((54, 40), "t.", font=font(40, 800), fill=INDIGO)
        d.text((120, 44), file_chip, font=font(36, 700), fill=WHITE)
        y = 132
    for ln in lines:
        d.text((35, y), ln, font=f, fill=WHITE); y += 58
    return im


MSGS = [  # (aparece en s, saliente, texto, archivo, y)
    (-1.0, False, "Hazme el logo. Te pago cuando lo termines.", None, 700),
    (0.9, True, "¡Listo! Te mandé los archivos", "logo-final.png", 880),
    (2.4, True, "¿Me transfieres?", None, 1160),
]
BUBS = [msg_bubble(t, o, fc) for _, o, t, fc, _ in MSGS]
SEEN_AT = [None, 1.8, 3.0]


def seen_label(d, x_right, y, a):
    if a <= 0:
        return
    f = font(30, 700)
    c = tuple(int(150 + (205 - 150) * 0) for _ in range(3))
    s = "Visto"
    d.text((x_right - d.textlength(s, font=f), y), s, font=f, fill=(170, 176, 200, int(255 * a)))


def chat(t, dim=0.0, ausente=False):
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    d.rounded_rectangle((CX0, CY0, CX1, CY1), radius=48, fill=PANEL)
    # cabecera del chat
    d.rounded_rectangle((CX0, CY0, CX1, CY0 + 120), radius=48, fill=(32, 40, 62))
    d.rectangle((CX0, CY0 + 70, CX1, CY0 + 120), fill=(32, 40, 62))
    d.ellipse((CX0 + 36, CY0 + 24, CX0 + 108, CY0 + 96), fill=(120, 130, 160))
    d.text((CX0 + 58, CY0 + 34), "C", font=font(44, 800), fill=WHITE)
    d.text((CX0 + 130, CY0 + 26), "Cliente", font=font(40, 800), fill=WHITE)
    d.text((CX0 + 130, CY0 + 74), "últ. vez hace 30 días" if ausente else "en línea", font=font(26, 600), fill=(160, 166, 190))
    for (t0, out, _, _, y), b, sa in zip(MSGS, BUBS, SEEN_AT):
        k = (t - t0) / 0.22
        if k <= 0:
            continue
        x = CX1 - 40 - b.width if out else CX0 + 40
        paste_scaled(lay, b, x + b.width / 2, y + b.height / 2 + 20 * (1 - ease_out(k)), 0.92 + 0.08 * ease_back(k), min(1, k * 2))
        if sa is not None:
            seen_label(d, CX1 - 46, y + b.height + 10, min(1, (t - sa) / 0.2))
    if dim > 0:
        lay.putalpha(lay.getchannel("A").point(lambda v: int(v * (1 - dim))))
    return lay


def title(d, t):
    text_center(d, 250, "Hice el trabajo. Me dejaron en visto.", font(92, 800), maxw=900,
                ul="visto.", ul_prog=min(1, 0.4 + t / 0.5))


# ------------------------------------------------------------- escenas
def s1(t):
    img = dark()
    d = ImageDraw.Draw(img)
    logo(d)
    title(d, t)
    img.alpha_composite(chat(t))
    return img


def day_chip(text):
    f = font(110, 800)
    tmp = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    w = int(tmp.textlength(text, font=f) + 120)
    im = Image.new("RGBA", (w, 190), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w - 1, 189), radius=40, fill=WHITE)
    d.text((60, 28), text, font=f, fill=INK)
    return im


DAYS = [(day_chip("Día 1"), 0.0), (day_chip("Día 7"), 0.5), (day_chip("Día 30"), 1.0)]


def s2(t):
    img = dark()
    d = ImageDraw.Draw(img)
    logo(d)
    title(d, 1)
    img.alpha_composite(chat(S1, dim=min(0.7, t / 0.3 * 0.7) if t < 1.55 else 0.9, ausente=True))
    cur = None
    for c, t0 in DAYS:
        if t >= t0:
            cur = (c, t0)
    if cur and t < 1.55:
        c, t0 = cur
        k = (t - t0) / 0.18
        paste_scaled(img, c, W / 2, 1000, 0.7 + 0.3 * ease_back(k), min(1, k * 2))
    if t >= 1.55:
        k = (t - 1.55) / 0.25
        lay = Image.new("RGBA", (W, 260), (0, 0, 0, 0))
        text_center(ImageDraw.Draw(lay), 30, "Nunca pagó.", font(150, 800))
        paste_scaled(img, lay, W / 2, 1000, 0.85 + 0.15 * ease_back(k), min(1, k * 1.5))
    return img


def s3(t):
    img = dark()
    d = ImageDraw.Draw(img)
    logo(d)
    a = ease_out((t - 0.05) / 0.3)
    tx = Image.new("RGBA", (W, 900), (0, 0, 0, 0))
    td = ImageDraw.Draw(tx)
    y = text_center(td, 0, "Trabajaste gratis.", font(128, 800), ul="gratis.", ul_prog=ease_out((t - 0.4) / 0.4))
    if t > 0.85:
        text_center(td, y + 60, "“Te pago al final” es pedirte que confíes en un desconocido.", font(56, 700),
                    fill=(205, 208, 222), maxw=860)
    paste_scaled(img, tx, W / 2, 1000 + 40 * (1 - a), 1.0, a)
    return img


def sala_card(t):
    w, h = 900, 720
    im = Image.new("RGBA", (w + 80, h + 80), (0, 0, 0, 0))
    sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((40, 60, w + 40, h + 50), radius=48, fill=(10, 10, 40, 140))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(24)))
    d = ImageDraw.Draw(im)
    x0, y0 = 40, 40
    d.rounded_rectangle((x0, y0, x0 + w, y0 + h), radius=48, fill=WHITE)
    d.text((x0 + 56, y0 + 48), "Sala · Logo para tu pyme · Servicio", font=font(34, 700), fill=GRAY)
    pk = ease_back((t - 0.35) / 0.3)
    if pk > 0:
        pill = Image.new("RGBA", (430, 84), (0, 0, 0, 0))
        pd = ImageDraw.Draw(pill)
        pd.rounded_rectangle((0, 0, 429, 83), radius=42, fill=(220, 246, 236))
        pd.ellipse((22, 18, 70, 66), fill=GREEN)
        pd.line([(34, 42), (43, 52), (59, 33)], fill=WHITE, width=6, joint="curve")
        pd.text((88, 20), "Pago retenido", font=font(38, 800), fill=(4, 120, 87))
        paste_scaled(im, pill, x0 + 56 + 215, y0 + 156, max(0.01, pk))
    d.text((x0 + 56, y0 + 220), "$120.000", font=font(116, 800), fill=INK)
    d.text((x0 + 56, y0 + 370), "Lo ves antes de empezar a trabajar.", font=font(36, 700), fill=GRAY)
    bk = ease_out((t - 1.0) / 0.35)
    if bk > 0:
        by = y0 + 450
        box = Image.new("RGBA", (w - 80, 220), (0, 0, 0, 0))
        bd = ImageDraw.Draw(box)
        bd.rounded_rectangle((0, 0, w - 81, 219), radius=28, fill=(255, 241, 235))
        bd.text((36, 28), "¿Te dejan en visto?", font=font(44, 800), fill=(234, 88, 12))
        bd.text((36, 90), "Lo marcas realizado y, si el cliente", font=font(36, 600), fill=INK)
        bd.text((36, 140), "no responde en 24 h, se libera igual.", font=font(36, 800), fill=INK)
        paste_scaled(im, box, x0 + w / 2, by + 110 + 20 * (1 - bk), 1.0, bk)
    return im


def s4(t):
    img = grad()
    d = ImageDraw.Draw(img)
    logo(d)
    a = ease_out(t / 0.3)
    lay = Image.new("RGBA", (W, 400), (0, 0, 0, 0))
    text_center(ImageDraw.Draw(lay), 0, "En Trado ves el pago antes de empezar.", font(92, 800), maxw=900,
                ul="antes", ul_col=GREEN, ul_prog=ease_out((t - 0.3) / 0.4))
    paste_scaled(img, lay, W / 2, 250 + 200 + 30 * (1 - a), 1.0, a)
    ck = ease_out((t - 0.15) / 0.4)
    paste_scaled(img, sala_card(t), W / 2, 1100 + 120 * (1 - ck), 1.0, ck)
    return img


def s5(t):
    img = grad()
    k = ease_back(t / 0.4)
    lg = Image.new("RGBA", (700, 260), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lg)
    ld.text((350 - ld.textlength("trado", font=font(190, 800)) / 2, 10), "trado", font=font(190, 800), fill=WHITE)
    paste_scaled(img, lg, W / 2, 520, 0.8 + 0.2 * k, min(1, t / 0.25))
    a = ease_out((t - 0.25) / 0.35)
    lay = Image.new("RGBA", (W, 400), (0, 0, 0, 0))
    text_center(ImageDraw.Draw(lay), 0, "Primero ves el pago. Después trabajas.", font(70, 800),
                maxw=880, ul="Después", ul_col=GREEN, ul_prog=ease_out((t - 0.5) / 0.4))
    paste_scaled(img, lay, W / 2, 880 + 25 * (1 - a), 1.0, a)
    b = ease_back((t - 0.7) / 0.35)
    if b > 0:
        btn = Image.new("RGBA", (560, 150), (0, 0, 0, 0))
        bd = ImageDraw.Draw(btn)
        bd.rounded_rectangle((0, 0, 559, 149), radius=75, fill=WHITE)
        fb = font(72, 800)
        bd.text((280 - bd.textlength("trado.cl", font=fb) / 2, 30), "trado.cl", font=fb, fill=BLUE)
        paste_scaled(img, btn, W / 2, 1180, max(0.01, b))
    if t > 1.0:
        k2 = ease_out((t - 1.0) / 0.3)
        lay2 = Image.new("RGBA", (W, 200), (0, 0, 0, 0))
        l2 = ImageDraw.Draw(lay2)
        text_center(l2, 0, "Comenta YO si te ha pasado", font(46, 800), fill=WHITE)
        paste_scaled(img, lay2, W / 2, 1400, 1.0, k2)
    return img


SCENES = [("a", S1, s1), ("b", S2, s2), ("c", S3, s3), ("d", S4, s4), ("e", S5, s5)]

# ---------------------------------------------------------------- sonido
# Capa de EFECTOS: idéntica a la del reel publicado (son la identidad sonora de
# Trado). La música es otra capa, opcional: ver sonido.Pista.guardar.
MUSICA_DESDE = 9.2  # segundo en que entraba la música de fondo (si se pide --con-musica)


def efectos(p):
    S2, S3, S4, S5 = 4.2, 6.8, 9.2, 12.8
    # 1. chat: pop de mensaje entrante/saliente, tic de "visto"
    p.add(pop(420, 760, 0.08), 0.02, 0.5)
    for at in (0.9, 2.4):
        p.add(pop(700, 1200, 0.07), at, 0.45); p.add(pop(900, 1500, 0.05), at + 0.06, 0.25)
    for at in (1.8, 3.0):
        p.add(tick(), at, 0.6)
    dt = t_(4.2); p.add((np.sin(2*np.pi*55*dt) + 0.4*np.sin(2*np.pi*82.4*dt))*(dt/4.2)**1.5, 0, 0.22)
    # 2. días que pasan: reloj y golpe
    for at in (S2, S2 + 0.5, S2 + 1.0):
        p.add(whoosh(0.2, up=True), at - 0.12, 0.3); p.add(thump(0.25), at, 0.6); p.add(tick(), at + 0.02, 0.5)
    p.add(thump(0.5), S2 + 1.55, 1.0)
    for i, f in enumerate((392.0, 370.0, 349.2, 311.1)):
        d = 0.28 if i < 3 else 0.7
        tt = t_(d)
        s = fft_filter(saw(f*(1 - (0.06*tt/d if i == 3 else 0)), d, 2), hi=1600)*env(len(tt), 0.01, d*0.7)
        p.add(s, S2 + 1.6 + i*0.26, 0.28)
    # 3
    p.add(whoosh(0.4, up=False), S3 - 0.1, 0.4)
    dt = t_(2.4); p.add(np.sin(2*np.pi*49*dt)*env(len(dt), 0.05, 1.2), S3, 0.35)
    # 4
    p.add(whoosh(0.5, up=True), S4 - 0.4, 0.5)
    for i, f in enumerate((1046.5, 1318.5, 1568.0)):
        p.add(bell(f, 0.7), S4 + 0.4 + i*0.06, 0.2, (-0.2, 0.2, 0)[i])
    p.add(pop(500, 900, 0.06), S4 + 1.0, 0.3)
    # 5
    p.add(pop(600, 1400, 0.12), S5 + 0.75, 0.45)

    # Momentos con animación que sólo tapaba la música (agregados oct-2026, sin música)
    p.add(whoosh(0.35, up=True), S4 + 0.1, 0.25)        # entra la tarjeta de la sala
    p.add(pop(650, 1100, 0.06), S4 + 0.35, 0.3)         # aparece "Pago retenido"
    p.add(tick(), S4 + 1.7, 0.4)
    p.add(pop(500, 850, 0.06), S4 + 2.4, 0.25)
    p.add(whoosh(0.5, up=True), S5 - 0.3, 0.35)         # cambio al cierre
    p.add(thump(0.3), S5 + 0.05, 0.45)                  # aparece el logo
    p.add(pop(500, 850, 0.06), S5 + 0.4, 0.25)          # frase de cierre
    p.add(tick(), S5 + 1.05, 0.45)                      # "Comenta YO"


SCENES_CLI = [(d, f) for _, d, f in SCENES]

if __name__ == "__main__":
    cli(SCENES_CLI, efectos, MUSICA_DESDE, "12 Me dejaron en visto")
