"""Reel 06 "¿Quién paga primero?": explicativo para quien no conoce Trado.
Problema -> Trado al medio -> 4 pasos con diagrama -> apelación -> dudas -> CTA.
1080x1920 a 30 fps. 
Todo verificado contra la app: cualquiera de las partes crea la sala; el pago queda
retenido ("Pago retenido en escrow"); se libera al confirmar; apelación con la plata
retenida; cuenta gratis; comisión solo si se concreta; tarjeta o transferencia."""
import math, os, random, sys
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from motor import *  # noqa: F401,F403  colores, tipografía, fondos, text_center, cli
from sonido import *  # noqa: F401,F403  Pista y efectos

SA, SB, SC, SD, SE, SF = 4.0, 2.6, 10.8, 2.4, 2.6, 2.6
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
    im = Image.new("RGBA", (300, 340), (0, 0, 0, 0))
    sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((40, 30, 260, 250), radius=56, fill=(10, 10, 40, 140))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(18)))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((40, 20, 260, 240), radius=56, fill=WHITE)
    f = font(150, 800)
    d.text((150 - d.textlength("t.", font=f) / 2 - 4, 30), "t.", font=f, fill=BLUE)
    lab = font(38, 800)
    d.text((150 - d.textlength("Trado", font=lab) / 2, 262), "Trado", font=lab, fill=WHITE)
    if lock > 0:
        s = 0.6 + 0.4 * ease_back(lock)
        b = Image.new("RGBA", (110, 110), (0, 0, 0, 0))
        bd = ImageDraw.Draw(b)
        bd.ellipse((0, 0, 109, 109), fill=GREEN)
        bd.rounded_rectangle((30, 50, 80, 88), radius=8, fill=WHITE)
        bd.arc((37, 22, 73, 66), 180, 360, fill=WHITE, width=9)
        bd.line((37, 44, 37, 52), fill=WHITE, width=9); bd.line((73, 44, 73, 52), fill=WHITE, width=9)
        paste_scaled(im, b, 240, 40, s, min(1, lock * 2))
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
def sA(t):
    img = dark()
    d = ImageDraw.Draw(img)
    logo(d)
    text_center(d, 250, "Comprar o vender por internet tiene un problema:", font(46, 700), fill=(205, 208, 222), maxw=880)
    text_center(d, 400, "¿Quién paga primero?", font(118, 800), ul="primero?", ul_prog=min(1, 0.35 + t / 0.5))
    paste_scaled(img, BUYER, LX + 30, NY, 1.0)
    paste_scaled(img, SELLER, RX - 30, NY, 1.0)
    # entre los dos: línea cortada y signo de pregunta que tiembla
    for x in range(330, 760, 46):
        d.line((x, NY - 30, x + 24, NY - 30), fill=(90, 96, 124), width=8)
    q = Image.new("RGBA", (160, 200), (0, 0, 0, 0))
    ImageDraw.Draw(q).text((40, 0), "?", font=font(170, 800), fill=ORANGE)
    paste_scaled(img, q, CX, NY - 60 + math.sin(t * 9) * 6, 1.0)
    for b, x, t0 in ((THINK_B, LX + 150, 0.6), (THINK_S, RX - 150, 1.4)):
        k = (t - t0) / 0.25
        if k > 0:
            paste_scaled(img, b, x, NY - 300, 0.7 + 0.3 * ease_back(k), min(1, k * 2))
    if t > 2.4:
        k = ease_out((t - 2.4) / 0.35)
        lay = Image.new("RGBA", (W, 200), (0, 0, 0, 0))
        text_center(ImageDraw.Draw(lay), 0, "Nadie quiere arriesgarse primero.", font(62, 800))
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
    img = grad()
    d = ImageDraw.Draw(img)
    logo(d)
    a = ease_out(t / 0.3)
    lay = Image.new("RGBA", (W, 520), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lay)
    y = text_center(ld, 0, "Trado se pone al medio.", font(108, 800), ul="al medio.", ul_col=GREEN,
                    ul_prog=ease_out((t - 0.4) / 0.4))
    text_center(ld, y + 30, "Guardamos la plata hasta que el trato se cumpla.", font(52, 700), fill=(225, 228, 250), maxw=880)
    paste_scaled(img, lay, W / 2, 280 + 260 + 30 * (1 - a), 1.0, a)
    diagram(img, t_node=(t - 0.3) / 0.45)
    return img


# ------------------------------------------------------------- C: 4 pasos
STEPS = [("Creas una sala", "Pones qué se vende y el precio, y compartes el link."),
         ("El comprador paga", "La plata queda retenida en Trado, no en la cuenta del vendedor."),
         ("El vendedor entrega", "Sabe que el pago es real porque lo ve en la sala."),
         ("El comprador confirma", "Recién ahí la plata se libera al vendedor.")]


def step_header(img, i, tt):
    a = ease_out(tt / 0.3)
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
    paste_scaled(img, lay, W / 2, 270 + 280 + 30 * (1 - a), 1.0, a)
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
        lock = 1.0 if i >= 2 else max(0.0, (tt - 1.0) / 0.3)
    if i == 3:
        lock = max(0.0, 1 - (tt - 0.8) / 0.25) if tt > 0.8 else 1.0
    diagram(img, 1.0, lock)
    step_header(img, i, tt)
    # dinero
    mk = lambda a, b: ease_out(min(1, max(0, (tt - a) / (b - a))))
    if i == 0:
        mx, my = LX, NY + 210
    elif i == 1:
        k = mk(0.3, 1.0); mx, my = lerp(LX, CX, k), lerp(NY + 210, NY + 210, k)
    elif i == 2:
        mx, my = CX, NY + 210
    else:
        k = mk(0.8, 1.6); mx, my = lerp(CX, RX, k), NY + 210
    paste_scaled(img, MONEY, mx, my, 0.85)
    # paquete
    if i < 2:
        bx = RX
    elif i == 2:
        bx = lerp(RX, LX, mk(0.3, 1.2))
    else:
        bx = LX
    paste_scaled(img, BOX, bx, NY - 230, 0.85)
    # link de la sala (paso 1)
    if i == 0:
        k = mk(0.4, 1.3)
        al = 1.0 if tt < 1.9 else max(0, 1 - (tt - 1.9) / 0.3)
        paste_scaled(img, LINK, lerp(RX, LX, k), NY - 360, 0.8, al * min(1, (tt - 0.3) / 0.15) if tt > 0.3 else 0)
    # check final
    if i == 3 and tt > 1.6:
        k = ease_back((tt - 1.6) / 0.3)
        c = Image.new("RGBA", (120, 120), (0, 0, 0, 0))
        cd = ImageDraw.Draw(c)
        cd.ellipse((0, 0, 119, 119), fill=GREEN)
        cd.line([(32, 62), (52, 82), (90, 40)], fill=WHITE, width=12, joint="curve")
        paste_scaled(img, c, RX + 90, NY - 90, max(0.01, k))
    return img


# ------------------------------------------------------------- D: apelación
def sD(t):
    img = grad()
    d = ImageDraw.Draw(img)
    logo(d)
    a = ease_out(t / 0.3)
    lay = Image.new("RGBA", (W, 600), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lay)
    y = text_center(ld, 0, "¿Algo salió mal?", font(110, 800))
    text_center(ld, y + 30, "Apelas y la plata sigue retenida mientras se resuelve.", font(58, 700), fill=(225, 228, 250), maxw=860,
                ul="retenida", ul_col=GREEN, ul_prog=ease_out((t - 0.5) / 0.4))
    paste_scaled(img, lay, W / 2, 560 + 30 * (1 - a), 1.0, a)
    k = ease_back((t - 0.3) / 0.4)
    paste_scaled(img, trado_node(1.0), CX, 1180, 1.15 * max(0.01, k), min(1, k * 2))
    paste_scaled(img, MONEY, CX, 1420, 0.9 * max(0.01, k), min(1, k * 2))
    return img


# ------------------------------------------------------------- E: dudas
FAQ = [("Crear tu cuenta es gratis", 0.2), ("Pagas comisión solo si se concreta", 0.7), ("Con tarjeta o transferencia", 1.2)]


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


SCENES = [("a", SA, sA), ("b", SB, sB), ("c", SC, sC), ("d", SD, sD), ("e", SE, sE), ("f", SF, sF)]

# ---------------------------------------------------------------- sonido
# Capa de EFECTOS: idéntica a la del reel publicado (son la identidad sonora de
# Trado). La música es otra capa, opcional: ver sonido.Pista.guardar.
MUSICA_DESDE = 4.0  # segundo en que entraba la música de fondo (si se pide --con-musica)


def efectos(p):
    SB, SC, SD, SE, SF = 4.0, 6.6, 17.4, 19.8, 22.4
    STEP = 2.7
    # A: problema
    p.add(pop(), 0.03, 0.5)
    dt = t_(4.0); p.add((np.sin(2*np.pi*55*dt) + 0.4*np.sin(2*np.pi*82.4*dt))*(0.5 + 0.5*dt/4.0), 0, 0.22)
    p.add(pop(420, 760, 0.08), 0.6, 0.45); p.add(pop(380, 680, 0.08), 1.4, 0.45)
    p.add(thump(0.35), 2.4, 0.6)
    # B: Trado al medio (entra la música)
    p.add(whoosh(0.5, up=True), SB - 0.4, 0.5)
    p.add(thump(0.4), SB + 0.45, 0.8)
    for i, f in enumerate((1046.5, 1318.5, 1568.0)):
        p.add(bell(f, 0.7), SB + 0.5 + i*0.06, 0.18, (-0.2, 0.2, 0)[i])
    # C: pasos
    for i in range(4):
        t0 = SC + i*STEP
        p.add(pop(600, 1000, 0.06), t0, 0.35)
        p.add(whoosh(0.5, up=True), t0 + (0.3, 0.3, 0.3, 0.8)[i], 0.25)
    p.add(tick(), SC + STEP + 1.0, 0.6)              # candado
    for i, f in enumerate((1318.5, 1568.0, 2093.0)):  # liberado
        p.add(bell(f, 0.7), SC + 3*STEP + 1.6 + i*0.06, 0.2)
    # D, E, F
    p.add(pop(420, 800, 0.07), SD, 0.35)
    for k in (0.2, 0.7, 1.2):
        p.add(pop(500, 900, 0.06), SE + k, 0.3)
    p.add(pop(600, 1400, 0.12), SF + 0.75, 0.45)

    # Momentos con animación que sólo tapaba la música (agregados oct-2026, sin música)
    p.add(pop(450, 800, 0.06), SB + 1.2, 0.25)          # el diagrama queda armado
    p.add(tick(), SC + 1.3, 0.45)                       # paso 1: llega el link de la sala
    p.add(pop(500, 850, 0.06), SC + STEP + 0.3, 0.2)    # paso 2: sale la plata
    p.add(tick(), SC + 2 * STEP + 1.2, 0.45)            # paso 3: llega el paquete
    p.add(pop(500, 850, 0.06), SC + 2 * STEP + 1.8, 0.2)
    p.add(pop(500, 850, 0.06), SC + 3 * STEP + 0.8, 0.2)  # paso 4: la plata sale hacia el vendedor
    p.add(thump(0.3), SD + 0.3, 0.45)                   # aparece Trado con el candado
    p.add(tick(), SD + 1.1, 0.4)
    p.add(whoosh(0.5, up=True), SF - 0.3, 0.35)         # cambio al cierre
    p.add(thump(0.3), SF + 0.05, 0.45)                  # aparece el logo
    p.add(pop(500, 850, 0.06), SF + 0.4, 0.25)          # frase de cierre
    p.add(tick(), SF + 1.05, 0.45)                      # "Link en la bio"


SCENES_CLI = [(d, f) for _, d, f in SCENES]

if __name__ == "__main__":
    cli(SCENES_CLI, efectos, MUSICA_DESDE, "13 Quien paga primero")
