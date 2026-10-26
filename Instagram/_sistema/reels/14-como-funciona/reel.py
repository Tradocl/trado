"""Reel 14 "Cómo funciona Trado": el chat de dos desconocidos que no saben cómo
confiar, "¿y si usamos Trado?", y los cinco pasos completos.

Es el explicativo largo (~34 s): para fijar en el perfil y para reimpactar a
quien ya vio los reels cortos. Reutiliza piezas de 12 (burbujas de chat) y 13
(diagrama comprador · Trado · vendedor).

Todo verificado contra la app: cualquiera de las partes crea la sala y comparte
el link; el pago queda retenido ("Pago retenido en escrow"); el vendedor sube el
seguimiento; con envío hay 72 h de revisión desde que se marca recibido; se
libera al confirmar; si algo no calza, apelación con la plata retenida; cuenta
gratis; comisión sólo si se concreta; tarjeta o transferencia.
Chat genérico: sin la marca ni los colores de ninguna app de mensajería.
"""
import importlib.util, math, os, sys
from PIL import Image, ImageDraw, ImageFilter

REELS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # .../_sistema/reels
sys.path.insert(0, REELS)
from motor import *  # noqa: F401,F403  colores, tipografía, fondos, text_center, cli
from sonido import *  # noqa: F401,F403  Pista y efectos


def _cargar(carpeta):
    """Importa el reel.py de otra carpeta para reutilizar sus piezas."""
    spec = importlib.util.spec_from_file_location(carpeta.replace("-", "_"), os.path.join(REELS, carpeta, "reel.py"))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


R12 = _cargar("12-me-dejaron-en-visto")   # msg_bubble, PANEL
R13 = _cargar("13-quien-paga-primero")    # person, trado_node, money, box_icon, link_chip, lerp

SA, SB, SC, SD, SE = 10.2, 2.2, 12.0, 2.2, 2.6
STEP = SC / 5
PULSO = STEP / 4  # 0,6 s: el ritmo de los pasos (100 BPM), 4 golpes por paso
LX, CX, RX, NY = 200, 540, 880, 1150


def _plata(monto="$280.000"):
    im = Image.new("RGBA", (280, 100), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, 279, 99), radius=50, fill=GREEN)
    f = font(46, 800)
    d.text((140 - d.textlength(monto, font=f) / 2, 22), monto, font=f, fill=WHITE)
    return im


PLATA = _plata()  # el mismo monto del chat

# ---------------------------------------------------------------- A: el chat
CX0, CX1, CY0, CY1 = 70, 1010, 440, 1600
HEAD = 120
# (aparece en s, del vendedor?, texto)
MSGS = [
    (0.0, False, "Hola! ¿Sigue disponible el notebook?"),
    (1.2, True, "Sí, $280.000. Me transfieres y te lo envío hoy."),
    (3.0, False, "¿Y si te transfiero y no me llega nada?"),
    (4.6, True, "¿Y si te lo mando y no me pagas?"),
    (7.0, False, "Mmm… ¿y si usamos Trado?"),
    (8.4, True, "Dale, ¿cómo funciona?"),
]
BUBS = [R12.msg_bubble(t, o) for _, o, t in MSGS]
TYPING = [(6.0, 6.95, False)]  # silencio incómodo: alguien escribe y borra
DESTACAR = {4: GREEN}           # "¿y si usamos Trado?"


def typing_bubble(t):
    im = Image.new("RGBA", (200, 96), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, 199, 95), radius=34, fill=R12.IN_BG)
    for i in range(3):
        ph = max(0, math.sin(t * 9 - i * 0.9))
        r = 11 + 3 * ph
        cx, cy = 52 + i * 48, 48 - 6 * ph
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(150, 156, 180))
    return im


def chat_layer(t):
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    d.rounded_rectangle((CX0, CY0, CX1, CY1), radius=48, fill=R12.PANEL)
    d.rounded_rectangle((CX0, CY0, CX1, CY0 + HEAD), radius=48, fill=(32, 40, 62))
    d.rectangle((CX0, CY0 + 70, CX1, CY0 + HEAD), fill=(32, 40, 62))
    d.rounded_rectangle((CX0 + 36, CY0 + 22, CX0 + 112, CY0 + 98), radius=16, fill=(120, 130, 160))
    d.text((CX0 + 52, CY0 + 34), "NB", font=font(36, 800), fill=WHITE)
    d.text((CX0 + 134, CY0 + 24), "Notebook · $280.000", font=font(40, 800), fill=WHITE)
    d.text((CX0 + 134, CY0 + 74), "Compra entre desconocidos", font=font(26, 600), fill=(160, 166, 190))

    # mensajes apilados; si no caben, el chat sube como en el celular
    items, y = [], 0
    for (t0, out, _), b in zip(MSGS, BUBS):
        if t < t0:
            break
        items.append((t0, out, b, y))
        y += b.height + 22
    typing = next(((a, b, o) for a, b, o in TYPING if a <= t < b), None)
    total = y + (118 if typing else 0)
    alto = CY1 - (CY0 + HEAD) - 60
    scroll = max(0, total - alto)
    clip = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for i, (t0, out, b, yy) in enumerate(items):
        k = (t - t0) / 0.22
        x = CX1 - 36 - b.width if out else CX0 + 36
        top = CY0 + HEAD + 30 + yy - scroll
        if i in DESTACAR and t - t0 > 0.15:
            g = Image.new("RGBA", (b.width + 40, b.height + 40), (0, 0, 0, 0))
            ImageDraw.Draw(g).rounded_rectangle((0, 0, b.width + 39, b.height + 39), radius=46, outline=DESTACAR[i], width=8)
            clip.alpha_composite(g, (int(x - 20), int(top - 20)))
        paste_scaled(clip, b, x + b.width / 2, top + b.height / 2 + 18 * (1 - ease_out(k)), 0.92 + 0.08 * ease_back(k), min(1, k * 2))
    if typing:
        a, _, out = typing
        tb = typing_bubble(t)
        x = CX1 - 36 - tb.width if out else CX0 + 36
        clip.alpha_composite(tb, (int(x), int(CY0 + HEAD + 30 + y - scroll)))
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).rectangle((CX0, CY0 + HEAD, CX1, CY1 - 20), fill=255)
    lay.paste(clip, (0, 0), Image.composite(clip.getchannel("A"), Image.new("L", (W, H), 0), mask))
    return lay


def sA(t):
    img = dark()
    d = ImageDraw.Draw(img)
    logo(d)
    if t < 5.6:
        text_center(d, 236, "¿Has tenido este chat comprando por internet?", font(76, 800), maxw=960,
                    ul="por internet?", ul_prog=min(1, 0.4 + t / 0.5))
    else:
        k = ease_out((t - 5.6) / 0.3)
        lay = capa_texto("Nadie quiere arriesgarse primero.", font(80, 800), alto=260, ul="primero.")
        paste_scaled(img, lay, W / 2, 240 + 130 - 20 * (1 - k), 1.0, k)
    img.alpha_composite(chat_layer(t))
    return img


# ---------------------------------------------------------------- B: la idea
def diagrama(img, lock=0.0, t_node=1.0):
    paste_scaled(img, R13.BUYER, LX, NY, 0.85)
    paste_scaled(img, R13.SELLER, RX, NY, 0.85)
    d = ImageDraw.Draw(img)
    for x0, x1 in ((300, 380), (700, 780)):
        for x in range(x0, x1, 30):
            d.line((x, NY - 30, x + 16, NY - 30), fill=(255, 255, 255, 120), width=6)
    k = ease_back(t_node)
    if k > 0:
        paste_scaled(img, R13.trado_node(lock), CX, NY - 10 - 160 * (1 - min(1, k)), 0.9 * max(0.01, k), min(1, t_node * 2))


def sB(t):
    img = grad()
    d = ImageDraw.Draw(img)
    logo(d)
    a = ease_out(t / 0.3)
    lay = Image.new("RGBA", (W, 560), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lay)
    y = text_center(ld, 0, "Trado se pone al medio.", font(104, 800), ul="al medio.", ul_col=GREEN, ul_prog=ease_out((t - 0.25) / 0.3))
    text_center(ld, y + 30, "Guarda la plata hasta que los dos cumplen.", font(54, 700), fill=(225, 228, 250), maxw=880)
    paste_scaled(img, lay, W / 2, 280 + 260 + 30 * (1 - a), 1.0, a)
    diagrama(img, t_node=(t - 0.15) / 0.35)
    return img


# ---------------------------------------------------------------- C: cinco pasos
# Cada paso: frase corta y grande + la sala "como en la app", que va avanzando.
# (v2: la v1 con diagrama y texto chico se sentía lenta y costaba seguirla.)
PASOS = [
    # (titular, subtítulo, estado de la sala, color del estado)
    ("Creas la sala", "Qué se vende y el precio. Le mandas el link.", "Esperando pago", (110, 116, 135)),
    ("Pagas. Trado la guarda.", "Queda retenida, no en la cuenta del vendedor.", "Pago retenido", (4, 120, 87)),
    ("El vendedor envía", "Ve que el pago es real y sube el seguimiento.", "En camino", BLUE),
    ("Llega y revisas", "Tienes 72 horas para ver que esté todo bien.", "Revisando · 72 h", (234, 88, 12)),
    ("Confirmas y se libera", "El vendedor recibe su plata. Listo.", "Pago liberado", (4, 120, 87)),
]
HITOS = ["Sala creada", "Pago retenido", "Enviado · CL-48211", "Recibido · 72 h para revisar", "Pago liberado al vendedor"]
CARD_Y0 = 700


def titular(img, i, tt):
    """Número + titular que entra de golpe desde la derecha, y el subtítulo."""
    k = ease_out(tt / 0.28)
    lay = Image.new("RGBA", (W, 480), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lay)
    ld.ellipse((W / 2 - 46, 0, W / 2 + 46, 92), fill=WHITE)
    fn = font(56, 800)
    n = str(i + 1)
    ld.text((W / 2 - ld.textlength(n, font=fn) / 2, 12), n, font=fn, fill=BLUE)
    y = text_center(ld, 116, PASOS[i][0], font(86, 800), maxw=1000)
    text_center(ld, y + 18, PASOS[i][1], font(46, 700), fill=(225, 228, 250), maxw=900)
    paste_scaled(img, lay, W / 2 + 260 * (1 - k), 230 + 240, 1.0, min(1, tt / 0.18))


def pill_estado(texto, color, lock=False):
    f = font(40, 800)
    tmp = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    w = int(tmp.textlength(texto, font=f) + (130 if lock else 70))
    im = Image.new("RGBA", (w, 84), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    claro = tuple(int(c + (255 - c) * 0.86) for c in color)
    d.rounded_rectangle((0, 0, w - 1, 83), radius=42, fill=claro)
    x = 34
    if lock:
        d.rounded_rectangle((30, 36, 66, 64), radius=6, fill=color)
        d.arc((36, 16, 60, 46), 180, 360, fill=color, width=6)
        d.line((36, 31, 36, 38), fill=color, width=6)
        d.line((60, 31, 60, 38), fill=color, width=6)
        x = 86
    d.text((x, 18), texto, font=f, fill=color)
    return im


def sala(i, tt):
    """La sala de Trado en el estado del paso i (0..4)."""
    w, h = 800, 720
    im = Image.new("RGBA", (w + 80, h + 80), (0, 0, 0, 0))
    sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((40, 60, w + 40, h + 50), radius=48, fill=(10, 10, 40, 150))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(24)))
    d = ImageDraw.Draw(im)
    x0, y0 = 40, 40
    d.rounded_rectangle((x0, y0, x0 + w, y0 + h), radius=48, fill=WHITE)
    d.text((x0 + 50, y0 + 40), "Sala · Notebook", font=font(34, 700), fill=GRAY)
    d.text((x0 + 50, y0 + 88), "$280.000", font=font(104, 800), fill=INK)
    _, _, estado, color = PASOS[i]
    pk = ease_back((tt - 0.25) / 0.3) if i > 0 else 1.0
    pill = pill_estado(estado, color, lock=(i in (1, 2, 3)))
    paste_scaled(im, pill, x0 + 50 + pill.width / 2, y0 + 262, max(0.01, pk))
    y = y0 + 345
    for j, txt in enumerate(HITOS):
        hecho = j < i or (j == i and tt > PULSO - 0.05)
        actual = j == i
        cx, cy = x0 + 74, y + 30
        if hecho:
            prog = 1.0 if j < i else min(1.0, (tt - PULSO + 0.05) / 0.25)
            d.ellipse((cx - 24, cy - 24, cx + 24, cy + 24), fill=GREEN)
            p1, p2, p3 = (cx - 11, cy), (cx - 3, cy + 9), (cx + 12, cy - 9)
            if prog > 0.4:
                q = (prog - 0.4) / 0.6
                d.line([p1, p2, (p2[0] + (p3[0] - p2[0]) * q, p2[1] + (p3[1] - p2[1]) * q)], fill=WHITE, width=6, joint="curve")
            else:
                q = prog / 0.4
                d.line([p1, (p1[0] + (p2[0] - p1[0]) * q, p1[1] + (p2[1] - p1[1]) * q)], fill=WHITE, width=6)
        else:
            d.ellipse((cx - 24, cy - 24, cx + 24, cy + 24), outline=LINE, width=6)
        if j < 4:
            d.line((cx, cy + 28, cx, cy + 40), fill=GREEN if j < i else LINE, width=5)
        f = font(38, 800 if actual else 600)
        d.text((cx + 50, cy - 24), txt, font=f, fill=INK if (hecho or actual) else GRAY)
        y += 68
    return im


CONFETI = [((math.cos(k * 0.5) * (260 + (k % 5) * 40), math.sin(k * 0.5) * (260 + (k % 5) * 40)),
            (GREEN, ORANGE, WHITE, (124, 58, 237))[k % 4]) for k in range(26)]


def sC(t):
    img = grad()
    d = ImageDraw.Draw(img)
    logo(d)
    i = min(4, int(t / STEP))
    tt = t - i * STEP
    titular(img, i, tt)
    c = sala(i, tt)
    punch = 1 + 0.035 * max(0, 1 - tt / 0.25) if i > 0 else 1 - 0.1 * max(0, 1 - tt / 0.3)
    paste_scaled(img, c, W / 2, CARD_Y0 + 430, punch * 1.12, min(1, t / 0.2) if i == 0 else 1.0)
    if i == 4 and tt > 0.5:
        k = min(1.0, (tt - 0.5) / 0.9)
        for (dx, dy), col in CONFETI:
            x = W / 2 + dx * ease_out(k)
            y = CARD_Y0 + 260 + dy * ease_out(k) + 300 * k * k
            d.rounded_rectangle((x - 10, y - 5, x + 10, y + 5), radius=3, fill=col + (int(255 * (1 - k)),))
    d.rounded_rectangle((80, 196, W - 80, 206), radius=5, fill=(255, 255, 255, 60))
    d.rounded_rectangle((80, 196, 80 + (W - 160) * min(1, t / SC), 206), radius=5, fill=WHITE)
    return img


# ---------------------------------------------------------------- D: dudas
FAQ = [("Crear tu cuenta es gratis", 0.1), ("Pagas comisión solo si se concreta", 0.4), ("Con tarjeta o transferencia", 0.7)]


def sD(t):
    img = grad()
    d = ImageDraw.Draw(img)
    logo(d)
    a = ease_out(t / 0.3)
    paste_scaled(img, capa_texto("¿Y cuánto cuesta?", font(96, 800), alto=200), W / 2, 500 + 20 * (1 - a), 1.0, a)
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


# ---------------------------------------------------------------- E: cierre
def sE(t):
    img = grad()
    k = ease_back(t / 0.4)
    lg = Image.new("RGBA", (700, 260), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lg)
    ld.text((350 - ld.textlength("trado", font=font(190, 800)) / 2, 10), "trado", font=font(190, 800), fill=WHITE)
    paste_scaled(img, lg, W / 2, 520, 0.8 + 0.2 * k, min(1, t / 0.25))
    a = ease_out((t - 0.25) / 0.35)
    lay = capa_texto("Tu próxima venta, sin tener que confiar en un desconocido.", font(64, 800), maxw=880,
                     ul="confiar", ul_col=GREEN, ul_prog=ease_out((t - 0.5) / 0.4))
    paste_scaled(img, lay, W / 2, 880 + 25 * (1 - a), 1.0, a)
    b = ease_back((t - 0.7) / 0.35)
    if b > 0:
        paste_scaled(img, boton("Crea tu sala en trado.cl", ancho=780, tam=60), W / 2, 1200, max(0.01, b))
    if t > 1.0:
        paste_scaled(img, capa_texto("Link en la bio", font(44, 700), alto=100, fill=(225, 228, 250)), W / 2, 1360, 1.0,
                     ease_out((t - 1.0) / 0.3))
    return img


SCENES = [("a", SA, sA), ("b", SB, sB), ("c", SC, sC), ("d", SD, sD), ("e", SE, sE)]

# ---------------------------------------------------------------- sonido
MUSICA_DESDE = SA  # la música (opcional) entra con "Trado se pone al medio"


def efectos(p):
    B, C, D, E = SA, SA + SB, SA + SB + SC, SA + SB + SC + SD
    # chat: cada mensaje con su "pop" (entrante grave, saliente agudo) y tecleo antes
    for t0, out, _ in MSGS:
        if t0 > 0.3:
            k = t0 - 0.55
            while k < t0 - 0.05:
                p.add(key_click(), k, 0.35); k += 0.07
        p.add(msg_enviado() if out else msg_recibido(), t0 + 0.02, 0.45 if out else 0.5)
    dt = t_(SA - 0.3)
    p.add((np.sin(2 * np.pi * 55 * dt) + 0.4 * np.sin(2 * np.pi * 82.4 * dt)) * (0.3 + 0.7 * dt / (SA - 0.3)), 0.0, 0.16)
    p.add(thump(0.35), 5.6, 0.55)                       # "Nadie quiere arriesgarse primero."
    for f in (0, 1):
        p.add(tick(), 6.1 + f * 0.4, 0.3)                # alguien escribe y borra
    p.add(campanas(), 7.05, 0.18)                        # "¿y si usamos Trado?"
    # la idea
    p.add(whoosh(0.5, up=True), B - 0.4, 0.45)
    p.add(thump(0.4), C - 3 * PULSO, 0.7)
    p.add(campanas(), C - 3 * PULSO + 0.05, 0.2)
    # pasos: whoosh al entrar cada titular, golpe del estado, check del hito
    for i in range(5):
        t0 = C + i * STEP
        p.add(whoosh(0.3, up=True), t0 - 0.15, 0.35)
        p.add(pop(600, 1000, 0.06), t0 + 0.02, 0.35)
        p.add(pop(800, 1400, 0.05), t0 + PULSO, 0.3)
    p.add(tick(), C + STEP + PULSO / 2, 0.6)               # candado: pago retenido
    for k in range(3):
        p.add(tick(), C + 3 * STEP + (k + 1) * PULSO, 0.22)  # reloj 72 h
    p.add(campanas(), C + 4 * STEP + PULSO, 0.25)         # se libera
    for k in range(6):
        p.add(pop(900 + k * 120, 1600 + k * 100, 0.04), C + 4 * STEP + 0.55 + k * 0.06, 0.15)  # confeti
    # dudas y cierre
    p.add(pop(420, 800, 0.07), D, 0.35)
    for k in (0.1, 0.4, 0.7):
        p.add(pop(500, 900, 0.06), D + k, 0.3)
    p.add(whoosh(0.5, up=True), E - 0.3, 0.35)
    p.add(thump(0.3), E + 0.05, 0.45)
    p.add(pop(500, 850, 0.06), E + 0.4, 0.25)
    p.add(pop(600, 1400, 0.12), E + 0.75, 0.45)
    p.add(tick(), E + 1.05, 0.45)
    # cierre: acorde suave que se apaga con el video (antes el último 1,5 s quedaba mudo)
    for i, f in enumerate((523.25, 659.25, 783.99)):
        p.add(bell(f, 2.2), E + 1.25 + i * 0.05, 0.12)
    dt = t_(1.4); p.add(np.sin(2 * np.pi * 130.81 * dt) * env(len(dt), 0.05, 0.7), E + 1.2, 0.18)


SCENES_CLI = [(d, f) for _, d, f in SCENES]

if __name__ == "__main__":
    cli(SCENES_CLI, efectos, MUSICA_DESDE, "14 Como funciona Trado")
