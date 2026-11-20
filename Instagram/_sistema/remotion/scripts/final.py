"""Render final de un reel: video + volumen parejo, listo para Instagram.

    python scripts/final.py DesdeDondeQuieras                 out/DesdeDondeQuieras/reel.mp4
    python scripts/final.py DesdeDondeQuieras --sin-musica    out/DesdeDondeQuieras/reel-sin-musica.mp4
    python scripts/final.py DesdeDondeQuieras --a "16 Desde donde quieras"
        además lo copia a Instagram/2 Reels/<carpeta>/ con el mismo nombre

Cada reel tiene su carpeta en out/ (con el id de la composición): ahí quedan el render
crudo, el final, y conviene dejar también la hoja y la transcripción de revisión.

El volumen va igual que en los reels de Pillow (../reels/motor.py): -15 LUFS con el pico
real bajo -3 dBFS, en dos pasadas y lineal, así no cambia la mezcla. Si el pico no deja
subir lo suficiente, primero pasa por un limitador suave. (Con loudnorm en una sola pasada
el pico se iba a +2,7 dBFS y en el celular sonaba saturado.)
"""
import argparse
import json
import os
import shutil
import subprocess

import imageio_ffmpeg

AQUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REELS = os.path.join(AQUI, "..", "..", "2 Reels")
LUFS, PICO = -15.0, -3.0
FF = imageio_ffmpeg.get_ffmpeg_exe()


def medir(entrada, previo=""):
    filtro = (previo + "," if previo else "") + f"loudnorm=I={LUFS}:TP={PICO}:LRA=20:print_format=json"
    err = subprocess.run([FF, "-hide_banner", "-i", entrada, "-vn", "-af", filtro, "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    return json.loads(err[err.rindex("{"):err.rindex("}") + 1])


def normalizar(entrada, salida, margen=2.5):
    m = medir(entrada)
    subir = LUFS - float(m["input_i"])
    previo = ""
    if float(m["input_tp"]) + subir > PICO - 0.3:
        # Picos `margen` dB bajo lo que permite la subida: el AAC después los empuja hacia arriba
        tope = 10 ** ((PICO - margen - subir) / 20)
        previo = f"alimiter=limit={max(0.0625, min(1, tope)):.4f}:attack=5:release=60:level=false"
        m = medir(entrada, previo)
    filtro = ((previo + ",") if previo else "") + (
        f"loudnorm=I={LUFS}:TP={PICO}:LRA=20:linear=true:measured_I={m['input_i']}:"
        f"measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:"
        f"offset={m['target_offset']},aresample=48000")
    subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", "-i", entrada, "-c:v", "copy", "-af", filtro,
                    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", salida], check=True)
    f = medir(salida)
    pico = float(f["input_tp"])
    if pico > PICO + 0.3 and margen < 12:
        # Una mezcla densa (p. ej. rock con distorsión) se pasa igual: más margen y de nuevo
        return normalizar(entrada, salida, margen + pico - PICO + 0.5)
    print(f"{salida}: {float(f['input_i']):.1f} LUFS, pico {pico:.1f} dBFS")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("reel", help="id de la composición (src/Root.tsx)")
    ap.add_argument("--sin-musica", action="store_true")
    ap.add_argument("--a", metavar="CARPETA", help="carpeta en Instagram/2 Reels/ donde dejar el entregable")
    a = ap.parse_args()

    carpeta = os.path.join(AQUI, "out", a.reel)
    os.makedirs(carpeta, exist_ok=True)
    sufijo = "-sin-musica" if a.sin_musica else ""
    crudo = os.path.join(carpeta, "crudo" + sufijo + ".mp4")
    final = os.path.join(carpeta, "reel" + sufijo + ".mp4")
    props = json.dumps({"musica": not a.sin_musica})
    # En Windows npx es un .cmd: necesita shell. Las props van en un archivo para no pelear con las comillas.
    pp = os.path.join(carpeta, "props" + sufijo + ".json")
    open(pp, "w").write(props)
    subprocess.run(f'npx remotion render {a.reel} "{crudo}" --props="{pp}"', shell=True, check=True, cwd=AQUI)
    os.remove(pp)
    normalizar(crudo, final)

    if a.a:
        destino = os.path.join(REELS, a.a)
        os.makedirs(destino, exist_ok=True)
        shutil.copy(final, os.path.join(destino, os.path.basename(final)))
        print("copiado a", destino)


if __name__ == "__main__":
    main()
