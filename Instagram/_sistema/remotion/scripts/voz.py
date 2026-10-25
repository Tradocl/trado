"""Voz en off con tu voz clonada (Chatterbox, licencia MIT, corre en CPU, gratis).

Uso, con el entorno aparte donde está instalado Chatterbox:
    C:/Users/herna/herramientas/voz/Scripts/python.exe scripts/voz.py \
        public/material/voz/muestra.wav guion/regiones.txt

Deja un wav por línea del guion en public/material/generado/voz/ (fuera del repo).
Todo audio generado lleva la marca de agua Perth de Resemble; en Meta se publica
con la etiqueta de contenido hecho con IA.
"""
import sys
from pathlib import Path

import torchaudio as ta
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

AQUI = Path(__file__).resolve().parent.parent
SALIDA = AQUI / "public" / "material" / "generado" / "voz"

# Más bajo = más parecido a la muestra y más calmado; más alto = más expresivo
EXAGERACION = 0.5
CFG = 0.5


def main(muestra: str, guion: str) -> None:
    lineas = [l.strip() for l in Path(guion).read_text(encoding="utf-8").splitlines()]
    lineas = [l for l in lineas if l and not l.startswith("#")]
    SALIDA.mkdir(parents=True, exist_ok=True)

    modelo = ChatterboxMultilingualTTS.from_pretrained(device="cpu", t3_model="v3")
    for i, texto in enumerate(lineas, 1):
        wav = modelo.generate(texto, language_id="es", audio_prompt_path=muestra,
                              exaggeration=EXAGERACION, cfg_weight=CFG)
        destino = SALIDA / f"{i:02d}.wav"
        ta.save(str(destino), wav, modelo.sr)
        print(f"{destino.name}  {wav.shape[-1] / modelo.sr:4.1f} s  {texto}")


if __name__ == "__main__":
    main(*sys.argv[1:3])
