"""Reel 13 "¿Quién paga primero?": explicativo corto para quien no conoce Trado.
v3 (oct-2026): gancho con contexto (compraventa por internet), quiénes somos antes
del diagrama, pasos más rápidos con golpe de cámara y un sonido por cada movimiento.
Gancho -> problema -> qué es Trado -> 4 pasos -> apelación -> dudas -> CTA.
1080x1920 a 30 fps. 
Todo verificado contra la app: cualquiera de las partes crea la sala; el pago queda
retenido ("Pago retenido en escrow"); se libera al confirmar; apelación con la plata
retenida; cuenta gratis; comisión solo si se concreta; tarjeta o transferencia."""
import math, os, random, sys
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from motor import *  # noqa: F401,F403  colores, tipografía, fondos, text_center, cli
from sonido import *  # noqa: F401,F403  Pista y efectos

SH, SA, SB, SC, SD, SE, SF = 4.5, 3.0, 3.2, 8.4, 2.0, 2.2, 2.6
STEP = SC / 4

LX, CX, RX, NY = 200, 540, 880, 1150
KRAFT, KRAFT_D, KRAFT_L = (196, 148, 96), (150, 108, 66), (218, 174, 122)


# ------------------------------------------------------------- piezas
def person(color, label):
    im = Image.new("RGBA", (260, 330), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((30, 0, 230, 200), fill=color)
    d.ellipse((95, 38, 165, 108), fill=WHITE)
    d.pieslice((70, 110, 190, 230), 180, 360, fill=WHITE)
    f = font(38, 800)
    d.text((130 - d.textlength(label, font=f) / 2, 225), label, font=f, fill=WHITE)
    return im


BUYER = person((90, 120, 255), "Comprador")
SELLER = person((255, 107, 74), "Vendedor")


def trado_node(lock=0.0):
    # Lienzo con margen (P) para que el candado, que sobresale arriba a la derecha
    # y rebota al aparecer, no quede cortado. El centro no cambia.
    P = 40
    im = Image.new("RGBA", (300 + 2 * P, 340 + 2 * P), (0, 0, 0, 0))
    sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((40 + P, 30 + P, 260 + P, 250 + P), radius=56, fill=(10, 10, 40, 140))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(18)))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((40 + P, 20 + P, 260 + P, 240 + P), radius=56, fill=WHITE)
    f = font(150, 800)
    d.text((150 + P - d.textlength("t.", font=f) / 2 - 4, 30 + P), "t.", font=f, fill=BLUE)
    lab = font(38, 800)
    d.text((150 + P - d.textlength("Trado", font=lab) / 2, 262 + P), "Trado", font=lab, fill=WHITE)
    if lock > 0:
        s = 0.6 + 0.4 * ease_back(lock)
        b = Image.new("RGBA", (110, 110), (0, 0, 0, 0))
        bd = ImageDraw.Draw(b)
        bd.ellipse((0, 0, 109, 109), fill=GREEN)
        bd.rounded_rectangle((30, 50, 80, 88), radius=8, fill=WHITE)
        bd.arc((37, 22, 73, 66), 180, 360, fill=WHITE, width=9)
        bd.line((37, 44, 37, 52), fill=WHITE, width=9); bd.line((73, 44, 73, 52), fill=WHITE, width=9)
        paste_scaled(im, b, 240 + P, 40 + P, s, min(1, lock * 2))
    return im


def money():
    im = Image.new("RGBA", (260, 100), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, 259, 99), radius=50, fill=GREEN)
    f = font(46, 800)
    d.text((130 - d.textlength("$150.000", font=f) / 2, 22), "$150.000", font=f, fill=WHITE)
    return im


def box_icon():
    im = Image.new("RGBA", (170, 160), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.polygon([(10, 50), (120, 50), (155, 15), (45, 15)], fill=KRAFT_L)
    d.polygon([(120, 50), (155, 15), (155, 115), (120, 150)], fill=KRAFT_D)
    d.rectangle((10, 50, 120, 150), fill=KRAFT)
    d.rectangle((52, 50, 78, 95), fill=(226, 204, 160))
    return im


def link_chip():
    im = Image.new("RGBA", (330, 96), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, 329, 95), radius=48, fill=WHITE)
    f = font(38, 800)
    d.text((34, 24), "Link de la sala", font=f, fill=BLUE)
    return im


MONEY, BOX, LINK = money(), box_icon(), link_chip()


def think(text, tail_left):
    f = font(42, 800)
    tmp = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    lines = wrap(text, f, 380, tmp)
    w = int(max(tmp.textlength(l, font=f) for l in lines) + 60)
    h = 30 + len(lines) * 52 + 30
    im = Image.new("RGBA", (w, h + 30), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=32, fill=WHITE)
    tx = 60 if tail_left else w - 60
    d.polygon([(tx - 20, h - 2), (tx + 20, h - 2), (tx + (-10 if tail_left else 10), h + 28)], fill=WHITE)
    y = 30
    for ln in lines:
        d.text((30, y), ln, font=f, fill=INK); y += 52
    return im


THINK_B = think("¿Y si no me lo manda?", True)
THINK_S = think("¿Y si no me paga?", False)


def lerp(a, b, k):
    return a + (b - a) * k


# ------------------------------------------------------------- A: el problema
# ------------------------------------------------------------- H: gancho
# Somos una página desconocida: primero el contexto (comprar y vender por
# internet, dónde), después la pregunta gigante.
CANALES = [("Marketplace", 0.5, -7, 230, 1030), ("Instagram", 0.8, 5, 820, 990), ("WhatsApp", 1.1, -4, 540, 1180)]
HOOK_WORDS = [("¿Quién", 2.15), ("paga", 2.42), ("primero?", 2.69)]


def chip_canal(texto):
    f = font(52, 800)
    tmp = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    w = int(tmp.textlength(texto, font=f) + 90)
    im = Image.new("RGBA", (w + 30, 130), (0, 0, 0, 0))
    sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((15, 24, w + 15, 112), radius=44, fill=(0, 0, 0, 150))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(10)))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((15, 15, w + 15, 103), radius=44, fill=WHITE)
    d.text((60, 30), texto, font=f, fill=INK)
    return im


CHIPS_CANAL = {t: chip_canal(t) for t, *_ in CANALES}


def sH(t):
    img = dark()
    d = ImageDraw.Draw(img)
    logo(d)
    # 1) contexto: "¿Compras o vendes por internet?" + dónde
    fuera = ease_out((t - 1.95) / 0.25) if t > 1.95 else 0.0
    if fuera < 1:
        lay = Image.new("RGBA", (W, 520), (0, 0, 0, 0))
        ld = ImageDraw.Draw(lay)
        k1 = ease_out(t / 0.2)
        y = text_center(ld, 0, "¿Compras o vendes", font(118, 800))
        if t > 0.22:
            text_center(ld, y + 6, "por internet?", font(132, 800), fill=ORANGE, ul="por internet?",
                        ul_prog=ease_out((t - 0.3) / 0.3))
        paste_scaled(img, lay, W / 2, 560 - 120 * fuera, 1.0 + 0.25 * (1 - k1), min(1, t / 0.12) * (1 - fuera))
        for txt, t0, rot, x, y in CANALES:
            k = (t - t0) / 0.2
            if k > 0:
                paste_scaled(img, CHIPS_CANAL[txt].rotate(rot, expand=True, resample=Image.BICUBIC), x, y + 200 * fuera,
                             0.5 + 0.5 * ease_back(min(1, k)), min(1, k * 2) * (1 - fuera))
    # 2) la pregunta, palabra por palabra, gigante
    salida = ease_out((t - (SH - 0.3)) / 0.3) if t > SH - 0.3 else 0.0
    f = font(196, 800)
    bloque = Image.new("RGBA", (W, 760), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bloque)
    for n, (w, t0) in enumerate(HOOK_WORDS):
        k = (t - t0) / 0.18
        if k <= 0:
            continue
        pal = Image.new("RGBA", (W, 260), (0, 0, 0, 0))
        pd = ImageDraw.Draw(pal)
        pd.text(((W - pd.textlength(w, font=f)) / 2, 0), w, font=f, fill=ORANGE if n == 2 else WHITE)
        paste_scaled(bloque, pal, W / 2, 130 + n * 225, 1.7 - 0.7 * ease_out(min(1, k)), min(1, k * 2))
    if t > 2.9:
        k = ease_out((t - 2.9) / 0.3)
        w = bd.textlength("primero?", font=f)
        x = (W - w) / 2
        bd.rounded_rectangle((x, 130 + 450 + 100, x + w * k, 130 + 450 + 120), radius=10, fill=ORANGE)
    # sacudida cuando cae "primero?"
    sx = 0
    if 2.69 < t < 2.95:
        sx = (1 - (t - 2.69) / 0.26) * 16 * (1 if int(t * 60) % 2 else -1)
    paste_scaled(img, bloque, W / 2 + sx, 940 - 470 * salida, 1 - 0.45 * salida, 1 - 0.85 * salida)
    if t > 3.05:
        k = ease_out((t - 3.05) / 0.25) * (1 - salida)
        sub = capa_texto("¡Cuando no conoces a la otra persona!", font(56, 800), alto=240, maxw=940, fill=(205, 208, 222))
        paste_scaled(img, sub, W / 2, 1490 + 20 * (1 - k), 1.0, k)
    return img


def sA(t):
    img = dark()
    d = ImageDraw.Draw(img)
    logo(d)
    text_center(d, 250, "Comprar o vender por internet tiene un problema:", font(46, 700), fill=(205, 208, 222), maxw=880)
    text_center(d, 400, "¿Quién paga primero?", font(118, 800), ul="primero?", ul_prog=1.0)
    paste_scaled(img, BUYER, LX + 30, NY, 1.0)
    paste_scaled(img, SELLER, RX - 30, NY, 1.0)
    # entre los dos: línea cortada y signo de pregunta que tiembla
    for x in range(330, 760, 46):
        d.line((x, NY - 30, x + 24, NY - 30), fill=(90, 96, 124), width=8)
    q = Image.new("RGBA", (160, 200), (0, 0, 0, 0))
    ImageDraw.Draw(q).text((40, 0), "?", font=font(170, 800), fill=ORANGE)
    paste_scaled(img, q, CX + math.sin(t * 31) * 5, NY - 60 + math.sin(t * 9) * 6, 1.0 + 0.12 * abs(math.sin(t * 6)))
    for b, x, t0 in ((THINK_B, LX + 150, 0.25), (THINK_S, RX - 150, 0.75)):
        k = (t - t0) / 0.25
        if k > 0:
            paste_scaled(img, b, x, NY - 300, 0.7 + 0.3 * ease_back(k), min(1, k * 2))
    if t > 1.35:
        k = ease_out((t - 1.35) / 0.25)
        lay = Image.new("RGBA", (W, 200), (0, 0, 0, 0))
        text_center(ImageDraw.Draw(lay), 0, "Nadie quiere arriesgarse primero.", font(66, 800))
        paste_scaled(img, lay, W / 2, 1520 + 20 * (1 - k), 1.0, k)
    return img


# ------------------------------------------------------------- B: Trado al medio
def diagram(img, t_node=1.0, lock=0.0):
    paste_scaled(img, BUYER, LX, NY, 0.85)
    paste_scaled(img, SELLER, RX, NY, 0.85)
    d = ImageDraw.Draw(img)
    for x0, x1 in ((300, 380), (700, 780)):
        for x in range(x0, x1, 30):
            d.line((x, NY - 30, x + 16, NY - 30), fill=(255, 255, 255, 120), width=6)
    k = ease_back(t_node)
    if k > 0:
        paste_scaled(img, trado_node(lock), CX, NY - 10 - 160 * (1 - min(1, k)), 0.9 * max(0.01, k), min(1, t_node * 2))


def sB(t):
    """Quiénes somos, antes de explicar cómo: somos una página desconocida."""
    img = grad()
    d = ImageDraw.Draw(img)
    # destello de entrada
    if t < 0.18:
        fl = Image.new("RGBA", (W, H), (255, 255, 255, int(200 * (1 - t / 0.18))))
        img.alpha_composite(fl)
    k = ease_back(t / 0.35)
    lg = Image.new("RGBA", (800, 260), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lg)
    ld.text((400 - ld.textlength("trado", font=font(200, 800)) / 2, 0), "trado", font=font(200, 800), fill=WHITE)
    paste_scaled(img, lg, W / 2, 400, 0.6 + 0.4 * k, min(1, t / 0.12))
    a = ease_out((t - 0.35) / 0.3)
    lay = capa_texto("Una app chilena que guarda la plata hasta que se cumple el trato.", font(60, 800), alto=260,
                     maxw=900, ul="guarda la plata", ul_col=GREEN, ul_prog=ease_out((t - 0.6) / 0.35))
    paste_scaled(img, lay, W / 2, 650 + 25 * (1 - a), 1.0, a)
    diagram(img, t_node=(t - 1.25) / 0.35)
    if 1.45 < t < 1.75:
        r = 120 + 500 * (t - 1.45) / 0.3
        ring = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(ring).ellipse((CX - r, NY - r, CX + r, NY + r), outline=(255, 255, 255, int(200 * (1 - (t - 1.45) / 0.3))), width=8)
        img.alpha_composite(ring)
    if t > 1.9:
        k2 = ease_out((t - 1.9) / 0.25)
        paste_scaled(img, capa_texto("Se pone al medio.", font(64, 800), alto=120), W / 2, 1460 + 20 * (1 - k2), 1.0, k2)
    return img


# ------------------------------------------------------------- C: 4 pasos
STEPS = [("Creas una sala", "Pones qué se vende y el precio, y mandas el link."),
         ("El comprador paga", "La plata queda retenida en Trado, no en la cuenta del vendedor."),
         ("El vendedor entrega", "Sabe que el pago es real porque lo ve en la sala."),
         ("El comprador confirma", "Recién ahí la plata se libera al vendedor.")]


def step_header(img, i, tt):
    a = ease_out(tt / 0.2)
    lay = Image.new("RGBA", (W, 560), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lay)
    # pill "Paso N de 4"
    pf = font(34, 800)
    ptxt = f"PASO {i + 1} DE 4"
    pw = ld.textlength(ptxt, font=pf) + len(ptxt) * 3 + 70
    ld.rounded_rectangle(((W - pw) / 2, 0, (W + pw) / 2, 70), radius=35, fill=(255, 255, 255, 40), outline=(255, 255, 255, 140), width=3)
    x = (W - pw) / 2 + 35
    for ch in ptxt:
        ld.text((x, 16), ch, font=pf, fill=WHITE); x += ld.textlength(ch, font=pf) + 3
    y = text_center(ld, 110, STEPS[i][0], font(104, 800))
    text_center(ld, y + 26, STEPS[i][1], font(50, 700), fill=(225, 228, 250), maxw=880)
    paste_scaled(img, lay, W / 2 + 200 * (1 - a), 270 + 280, 1.0, min(1, tt / 0.12))
    # puntos de progreso
    d = ImageDraw.Draw(img)
    for j in range(4):
        cx = W / 2 - 60 + j * 40
        d.ellipse((cx - 9, 1480 - 9, cx + 9, 1480 + 9), fill=WHITE if j <= i else (255, 255, 255, 90))


def sC(t):
    img = grad()
    d = ImageDraw.Draw(img)
    logo(d)
    i = min(3, int(t / STEP))
    tt = t - i * STEP
    lock = 0.0
    if i >= 1:
        lock = 1.0 if i >= 2 else max(0.0, (tt - 0.75) / 0.25)
    if i == 3:
        lock = max(0.0, 1 - (tt - 0.5) / 0.2) if tt > 0.5 else 1.0
    diagram(img, 1.0, lock)
    step_header(img, i, tt)
    # dinero
    mk = lambda a, b: ease_out(min(1, max(0, (tt - a) / (b - a))))
    if i == 0:
        mx, my = LX, NY + 210
    elif i == 1:
        k = mk(0.2, 0.75); mx, my = lerp(LX, CX, k), NY + 210
    elif i == 2:
        mx, my = CX, NY + 210
    else:
        k = mk(0.5, 1.15); mx, my = lerp(CX, RX, k), NY + 210
    paste_scaled(img, MONEY, mx, my, 0.85)
    # paquete
    if i < 2:
        bx = RX
    elif i == 2:
        bx = lerp(RX, LX, mk(0.2, 0.95))
    else:
        bx = LX
    paste_scaled(img, BOX, bx, NY - 230, 0.85)
    # link de la sala (paso 1)
    if i == 0:
        k = mk(0.25, 0.95)
        al = 1.0 if tt < 1.7 else max(0, 1 - (tt - 1.7) / 0.3)
        paste_scaled(img, LINK, lerp(RX, LX, k), NY - 360, 0.8, al * min(1, (tt - 0.3) / 0.15) if tt > 0.3 else 0)
    # check final
    if i == 3 and tt > 1.15:
        k = ease_back((tt - 1.15) / 0.25)
        c = Image.new("RGBA", (120, 120), (0, 0, 0, 0))
        cd = ImageDraw.Draw(c)
        cd.ellipse((0, 0, 119, 119), fill=GREEN)
        cd.line([(32, 62), (52, 82), (90, 40)], fill=WHITE, width=12, joint="curve")
        paste_scaled(img, c, RX + 90, NY - 90, max(0.01, k))
    # golpe de cámara al empezar cada paso
    z = 1 + 0.06 * max(0.0, 1 - tt / 0.22)
    if z > 1.001:
        big = img.resize((int(W * z), int(H * z)), Image.BICUBIC)
        ox, oy = (big.width - W) // 2, (big.height - H) // 2
        img = big.crop((ox, oy, ox + W, oy + H))
    return img


# ------------------------------------------------------------- D: apelación
def sD(t):
    img = grad()
    d = ImageDraw.Draw(img)
    logo(d)
    a = ease_out(t / 0.2)
    lay = Image.new("RGBA", (W, 600), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lay)
    y = text_center(ld, 0, "¿Algo salió mal?", font(110, 800))
    text_center(ld, y + 30, "Apelas y la plata sigue retenida mientras se resuelve.", font(58, 700), fill=(225, 228, 250), maxw=860,
                ul="retenida", ul_col=GREEN, ul_prog=ease_out((t - 0.3) / 0.3))
    paste_scaled(img, lay, W / 2, 560 + 30 * (1 - a), 1.0, a)
    k = ease_back((t - 0.15) / 0.3)
    paste_scaled(img, trado_node(1.0), CX, 1180, 1.15 * max(0.01, k), min(1, k * 2))
    paste_scaled(img, MONEY, CX, 1420, 0.9 * max(0.01, k), min(1, k * 2))
    return img


# ------------------------------------------------------------- E: dudas
FAQ = [("Crear tu cuenta es gratis", 0.1), ("Pagas comisión solo si se concreta", 0.4), ("Con tarjeta o transferencia", 0.7)]


def sE(t):
    img = grad()
    d = ImageDraw.Draw(img)
    logo(d)
    a = ease_out(t / 0.3)
    lay = Image.new("RGBA", (W, 200), (0, 0, 0, 0))
    text_center(ImageDraw.Draw(lay), 0, "Y lo que siempre preguntan:", font(70, 800))
    paste_scaled(img, lay, W / 2, 480 + 20 * (1 - a), 1.0, a)
    for n, (txt, t0) in enumerate(FAQ):
        k = (t - t0) / 0.3
        if k <= 0:
            continue
        row = Image.new("RGBA", (960, 150), (0, 0, 0, 0))
        rd = ImageDraw.Draw(row)
        rd.rounded_rectangle((0, 0, 959, 149), radius=40, fill=WHITE)
        rd.ellipse((36, 35, 116, 115), fill=GREEN)
        rd.line([(56, 76), (70, 90), (98, 60)], fill=WHITE, width=9, joint="curve")
        rd.text((150, 46), txt, font=font(46, 800), fill=INK)
        paste_scaled(img, row, W / 2 + 40 * (1 - ease_out(k)), 760 + n * 200, 1.0, min(1, k * 2))
    return img


# ------------------------------------------------------------- F: CTA
def sF(t):
    img = grad()
    k = ease_back(t / 0.4)
    lg = Image.new("RGBA", (700, 260), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lg)
    ld.text((350 - ld.textlength("trado", font=font(190, 800)) / 2, 10), "trado", font=font(190, 800), fill=WHITE)
    paste_scaled(img, lg, W / 2, 520, 0.8 + 0.2 * k, min(1, t / 0.25))
    a = ease_out((t - 0.25) / 0.35)
    lay = Image.new("RGBA", (W, 400), (0, 0, 0, 0))
    text_center(ImageDraw.Draw(lay), 0, "Compra y vende sin tener que confiar en un desconocido.", font(66, 800),
                maxw=880, ul="confiar", ul_col=GREEN, ul_prog=ease_out((t - 0.5) / 0.4))
    paste_scaled(img, lay, W / 2, 880 + 25 * (1 - a), 1.0, a)
    b = ease_back((t - 0.7) / 0.35)
    if b > 0:
        btn = Image.new("RGBA", (760, 150), (0, 0, 0, 0))
        bd = ImageDraw.Draw(btn)
        bd.rounded_rectangle((0, 0, 759, 149), radius=75, fill=WHITE)
        fb = font(60, 800)
        s = "Crea tu sala en trado.cl"
        bd.text((380 - bd.textlength(s, font=fb) / 2, 38), s, font=fb, fill=BLUE)
        paste_scaled(img, btn, W / 2, 1200, max(0.01, b))
    if t > 1.0:
        k2 = ease_out((t - 1.0) / 0.3)
        lay2 = Image.new("RGBA", (W, 100), (0, 0, 0, 0))
        text_center(ImageDraw.Draw(lay2), 0, "Link en la bio", font(44, 700), fill=(225, 228, 250))
        paste_scaled(img, lay2, W / 2, 1360, 1.0, k2)
    return img


SCENES = [("h", SH, sH), ("a", SA, sA), ("b", SB, sB), ("c", SC, sC), ("d", SD, sD), ("e", SE, sE), ("f", SF, sF)]

# ---------------------------------------------------------------- sonido
# Capa de EFECTOS: idéntica a la del reel publicado (son la identidad sonora de
# Trado). La música es otra capa, opcional: ver sonido.Pista.guardar.
MUSICA_DESDE = SH + SA  # la música de Trado entra cuando aparece Trado


def efectos(p):
    A = SH; B = A + SA; C = B + SB; D = C + SC; E = D + SD; F = E + SE
    # gancho: contexto
    p.add(thump(0.3), 0.02, 0.6); p.add(whoosh(0.2, up=False), 0.0, 0.3)
    p.add(pop(500, 900, 0.07), 0.24, 0.45)
    for _, t0, *_ in CANALES:
        p.add(pop(700, 1300, 0.06), t0 + 0.02, 0.4)
    p.add(whoosh(0.3, up=True), 1.9, 0.35)
    # gancho: la pregunta, un golpe por palabra, el último más fuerte
    for n, (_, t0) in enumerate(HOOK_WORDS):
        p.add(thump(0.35), t0 + 0.02, 0.55 + 0.25 * n)
        p.add(whoosh(0.18, up=False), t0 - 0.08, 0.25)
    n = int(0.15 * SR); p.add(fft_filter(rng.standard_normal(n), lo=200, hi=3000) * env(n, 0.001, 0.05), 2.7, 0.35)
    dt = t_(SH)
    p.add((np.sin(2 * np.pi * 55 * dt) + 0.4 * np.sin(2 * np.pi * 82.4 * dt)) * (dt / SH), 0, 0.2)
    # problema
    p.add(pop(420, 760, 0.08), A + 0.27, 0.45); p.add(pop(380, 680, 0.08), A + 0.77, 0.45)
    p.add(thump(0.35), A + 1.35, 0.6)
    dt = t_(1.4); p.add(np.sin(2 * np.pi * np.cumsum(140 + 300 * (dt / 1.4) ** 2) / SR) * (dt / 1.4) ** 2, A + 1.6, 0.18)  # sube la tensión
    # qué es Trado: golpe grande, campanas, aterriza en el medio
    p.add(thump(0.5), B + 0.02, 1.0); p.add(whoosh(0.4, up=True), B - 0.35, 0.5)
    p.add(campanas(), B + 0.05, 0.25)
    p.add(pop(500, 850, 0.06), B + 0.62, 0.3)
    p.add(whoosh(0.3, up=False), B + 1.15, 0.35); p.add(thump(0.35), B + 1.45, 0.75)
    p.add(pop(600, 1100, 0.06), B + 1.92, 0.35)
    # pasos
    for i in range(4):
        t0 = C + i * STEP
        p.add(whoosh(0.25, up=True), t0 - 0.12, 0.4)  # sin golpe: chocaba con el bombo de la música
        p.add(pop(650, 1100, 0.06), t0 + 0.05, 0.3)
    p.add(whoosh(0.4, up=False), C + 0.3, 0.3); p.add(tick(), C + 0.95, 0.55)                  # 1: viaja el link
    p.add(whoosh(0.35, up=True), C + STEP + 0.2, 0.3); p.add(bell(1568.0, 0.5), C + STEP + 0.75, 0.25)
    p.add(tick(), C + STEP + 0.8, 0.7)                                                         # 2: candado
    p.add(whoosh(0.45, up=False), C + 2 * STEP + 0.25, 0.3); p.add(thump(0.2), C + 2 * STEP + 0.95, 0.4)  # 3: paquete
    p.add(whoosh(0.35, up=True), C + 3 * STEP + 0.5, 0.3)
    p.add(campanas(), C + 3 * STEP + 1.15, 0.28)                                               # 4: se libera
    for k in range(5):
        p.add(pop(900 + k * 150, 1600 + k * 120, 0.04), C + 3 * STEP + 1.2 + k * 0.05, 0.15)
    # apelación, dudas, cierre
    p.add(whoosh(0.3, up=True), D - 0.15, 0.35); p.add(thump(0.35), D + 0.15, 0.6); p.add(tick(), D + 0.4, 0.5)
    p.add(whoosh(0.25, up=True), E - 0.1, 0.3)
    for k in (0.1, 0.4, 0.7):
        p.add(pop(500, 900, 0.06), E + k, 0.35)
    p.add(whoosh(0.5, up=True), F - 0.3, 0.4); p.add(thump(0.45), F + 0.02, 0.8)
    p.add(pop(500, 850, 0.06), F + 0.4, 0.3); p.add(pop(600, 1400, 0.12), F + 0.75, 0.5); p.add(tick(), F + 1.05, 0.45)


SCENES_CLI = [(d, f) for _, d, f in SCENES]

if __name__ == "__main__":
    cli(SCENES_CLI, efectos, MUSICA_DESDE, "13 Quien paga primero")
