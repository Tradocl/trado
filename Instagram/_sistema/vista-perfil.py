# Simula el perfil de @trado_cl: miniaturas recortadas a 3:4, lo más nuevo arriba a la izquierda.
# Uso (desde _sistema):  python vista-perfil.py salida.png [--reel]
import os, sys, subprocess, pathlib
AQUI = pathlib.Path(__file__).parent.resolve()
FEED = AQUI / "feed"
salida = pathlib.Path(sys.argv[1]).resolve()
con_reel = "--reel" in sys.argv

posts = sorted(d for d in os.listdir(FEED) if d[:2].isdigit() and not d.startswith("10-reel"))
items = [(d, FEED / d / "slide-1.png", "carrusel" if len(list((FEED / d).glob("slide-*.png"))) > 1 else "") for d in posts]
if con_reel:
    items.append(("10-reel", FEED / "10-reel-portada" / "portada.png", "reel"))
items.reverse()

ICONO = {
    "carrusel": '<rect x="7" y="3" width="14" height="14" rx="2" fill="#fff"/><path d="M4 7v12a2 2 0 0 0 2 2h12" stroke="#fff" stroke-width="2" fill="none"/>',
    "reel": '<rect x="3" y="3" width="18" height="18" rx="5" stroke="#fff" stroke-width="2" fill="none"/><path d="M3 8.5h18M9 3l3 5.5M15 3l3 5.5" stroke="#fff" stroke-width="1.6"/><path d="M10 11.5v6l5-3z" fill="#fff"/>',
}
celdas = ""
for nombre, img, tipo in items:
    ic = f'<svg viewBox="0 0 24 24" class=ic>{ICONO[tipo]}</svg>' if tipo else ""
    celdas += f"<div class=c><img src='{img.as_uri()}'>{ic}<span>{nombre[:2]}</span></div>"

html = f"""<html><head><style>
body{{margin:0;background:#fff;font-family:Arial,sans-serif;width:900px}}
.perfil{{display:flex;align-items:center;gap:28px;padding:28px 24px 18px}}
.foto{{width:110px;height:110px;border-radius:50%;background:linear-gradient(135deg,#1F25C1,#7B46D8);display:grid;place-items:center;color:#fff;font:700 54px Arial;letter-spacing:-2px}}
.n{{font:700 26px Arial}} .bio{{font:17px/1.4 Arial;color:#222;padding:0 24px 18px}}
.g{{display:grid;grid-template-columns:repeat(3,1fr);gap:3px}}
.c{{position:relative;aspect-ratio:3/4;overflow:hidden}} .c img{{width:100%;height:100%;object-fit:cover}}
.ic{{position:absolute;top:12px;right:12px;width:30px;height:30px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))}}
.c span{{position:absolute;left:8px;bottom:6px;font:700 15px Arial;color:#fff;background:rgba(0,0,0,.45);padding:2px 7px;border-radius:6px}}
</style></head><body>
<div class=perfil><div class=foto>t.</div><div><div class=n>trado_cl</div><div style="font:16px Arial;color:#555;margin-top:6px">{len(items)} publicaciones</div></div></div>
<div class=bio><b>Trado</b><br>Confianza entre desconocidos. Tu plata queda en custodia hasta que llega lo acordado.<br><span style="color:#00376B">trado.cl</span></div>
<div class=g>{celdas}</div></body></html>"""
tmp = AQUI / "_vista.html"
tmp.write_text(html, encoding="utf8")
filas = -(-len(items) // 3)
alto = 250 + filas * 400
chrome = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
subprocess.run([chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
                "--force-device-scale-factor=1", f"--window-size=900,{alto}", "--virtual-time-budget=3000",
                f"--screenshot={salida}", tmp.as_uri()], check=True, capture_output=True)
tmp.unlink()
print("listo:", salida)
