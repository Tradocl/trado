"""Prepara todas las tomas de un reel: voz limpia (.wav) y recorte sin fondo (.webm).

    python scripts/tomas.py desde-donde-quieras hook:6.8:11.8 duda:19.2:29.7 ...

Lee public/material/<reel>/video.mp4 y deja cada toma en public/material/<reel>/generado/.
Es audio.py + recorte.py en serie. El recorte va a ~1 s por cuadro en CPU: un reel de
40 s tarda unos 20 min, así que conviene correrlo una vez con los tramos ya decididos.
Corta cada toma con un poco de aire antes y después; las pausas se sacan después con `linea`.
"""
import os
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))


def main(reel, tomas):
    base = os.path.join(AQUI, "..", "public", "material", reel)
    video = os.path.join(base, "video.mp4")
    os.makedirs(os.path.join(base, "generado"), exist_ok=True)
    for t in tomas:
        nombre, a, b = t.split(":")
        sal = os.path.join(base, "generado", nombre)
        subprocess.run([sys.executable, os.path.join(AQUI, "audio.py"), video, a, b, sal + ".wav"], check=True)
        subprocess.run([sys.executable, os.path.join(AQUI, "recorte.py"), video, a, b, sal + ".webm"], check=True)
    print("listo")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2:])
