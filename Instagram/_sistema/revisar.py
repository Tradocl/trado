# Detecta franjas blancas espurias (artefacto de Chrome headless) en slides de fondo morado u oscuro:
# revisa la última fila de píxeles: ningún fondo del sistema es blanco puro (el claro es #F5F5FA).
import sys, glob
from PIL import Image
malos = []
for f in sorted(glob.glob('*/slide-*.png')):
    im = Image.open(f).convert('RGB'); w, h = im.size
    fila = [im.getpixel((x, h - 3)) for x in range(0, w, 4)]
    blancos = sum(1 for p in fila if min(p) > 252)
    if blancos > 5: malos.append((f, blancos))
print('\n'.join(f'MAL {f} ({n})' for f, n in malos) or 'sin franjas')
