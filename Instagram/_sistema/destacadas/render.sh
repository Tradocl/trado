#!/bin/sh
# Genera las portadas de destacadas en "3 Historias destacadas/Portadas".
# Uso: sh render.sh   (desde esta carpeta)
set -e
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
AQUI="$(cd "$(dirname "$0")" && pwd -W 2>/dev/null || pwd)"
SALIDA="$AQUI/../../3 Historias destacadas/Portadas"
mkdir -p "$SALIDA"
n=1
for i in custodia precios senales nosotros dudas; do
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --window-size=1080,1920 --virtual-time-budget=2000 \
    --screenshot="$SALIDA/0$n-$i.png" "file:///$AQUI/portada.html?i=$i" 2>/dev/null
  n=$((n+1))
done
ls "$SALIDA"
