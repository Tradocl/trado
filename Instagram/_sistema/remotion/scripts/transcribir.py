"""Transcribe la grabación palabra por palabra, para elegir tomas y armar los subtítulos.

    python scripts/transcribir.py public/material/<reel>/video.mp4 [--prompt "Trado, Marketplace, Arica"]

Imprime cada frase con su segundo de inicio y marca las pausas largas (⏸), que son
justo las que conviene cortar con `linea(...)`. Deja además palabras.json al lado del
video, con [inicio, fin, palabra] por palabra, en segundos del video.

Usa faster-whisper "medium" en CPU (gratis, sin internet después de bajar el modelo).
Ojo: escucha lo que dijiste de verdad. Si el guion decía "WhatsApp" y tú dijiste
"Facebook", sale "Facebook", y los subtítulos tienen que decir lo mismo que el audio.
"""
import argparse
import json
import os

from faster_whisper import WhisperModel

PAUSA = 0.35  # segundos de silencio entre palabras que ya se notan


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--prompt", default="Trado, trado.cl, Marketplace, Instagram, Facebook, WhatsApp, escrow.")
    a = ap.parse_args()

    modelo = WhisperModel("medium", device="cpu", compute_type="int8")
    segmentos, _ = modelo.transcribe(a.video, language="es", word_timestamps=True, vad_filter=True,
                                     initial_prompt=a.prompt)
    palabras = []
    for seg in segmentos:
        linea, previo = [], None
        for w in seg.words:
            if previo is not None and w.start - previo > PAUSA:
                linea.append(f"⏸{w.start - previo:.1f}")
            linea.append(w.word.strip())
            palabras.append([round(w.start, 2), round(w.end, 2), w.word.strip()])
            previo = w.end
        print(f"{seg.start:7.2f}–{seg.end:6.2f}  {' '.join(linea)}")

    salida = os.path.join(os.path.dirname(os.path.abspath(a.video)), "palabras.json")
    json.dump(palabras, open(salida, "w", encoding="utf-8"), ensure_ascii=False)
    print("\n" + salida)


if __name__ == "__main__":
    main()
