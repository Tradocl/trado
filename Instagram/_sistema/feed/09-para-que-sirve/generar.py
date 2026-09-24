# Genera los slides del post 09. Tipos de venta y plazos verificados en
# src/pages/CreateTransaction.tsx y supabase/functions/auto-release-escrow.
# Uso: python generar.py && node ../../render.mjs .
import pathlib

AQUI = pathlib.Path(__file__).parent

ICON = {
    "envio": '<svg class="icono" viewBox="0 0 24 24"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>',
    "persona": '<svg class="icono" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5"/><circle cx="17" cy="9" r="2.8"/><path d="M16.5 14.6c2.4.2 4.2 2 5 5"/></svg>',
    "servicio": '<svg class="icono" viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/></svg>',
    "digital": '<svg class="icono" viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
}
LOCK = '<svg class="icono" viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>'

CASOS = [
    ("envio", "Por envío", 'Compras algo <span class="marca">de otra ciudad.</span>', "Zapatillas talla 42", "$90.000", [
        "Pagas y la plata queda <b>en custodia</b>.",
        "El vendedor despacha y sube el <b>número de seguimiento</b>.",
        "Cuando llega, lo marcas recibido y tienes <b>72 h para revisarlo</b>.",
    ]),
    ("persona", "En persona", 'Se juntan <span class="marca">en persona.</span>', "Bici aro 29", "$180.000", [
        "Pagas <b>antes de la junta</b> y el vendedor ve que el pago está hecho.",
        "Revisas la bici ahí mismo. <b>Nadie anda con efectivo encima.</b>",
        "La plata se libera <b>cuando tú confirmas</b>.",
    ]),
    ("servicio", "Servicio", 'Contratas <span class="marca">un servicio.</span>', "Logo para tu pyme", "$120.000", [
        "El diseñador ve el <b>pago retenido antes de empezar</b>.",
        "Cuando termina, marca el servicio como <b>realizado</b>.",
        "Tienes <b>24 h para revisarlo</b>. Si no es lo acordado, apelas.",
    ]),
    ("digital", "Digital", 'Entradas, links <span class="marca">o archivos.</span>', "Entrada a un recital", "$65.000", [
        "Pagas y la plata queda <b>en custodia</b>.",
        "El vendedor te manda la entrada y la marca como <b>entregada</b>.",
        "Tienes <b>24 h para revisar</b> que funcione.",
    ]),
]

HEAD = '<!doctype html>\n<html lang="es"><head><meta charset="utf-8"><link rel="stylesheet" href="../../base.css">'

# ── Portada ──
minis = [
    ("left:-6px;top:40px;transform:rotate(-4deg)", 0),
    ("right:-6px;top:10px;transform:rotate(3deg)", 1),
    ("left:30px;top:300px;transform:rotate(2deg)", 2),
    ("right:10px;top:290px;transform:rotate(-2.5deg)", 3),
]
collage = "\n".join(
    f'    <div class="mini" style="{pos}"><div class="t">{ICON[CASOS[i][0]]} {CASOS[i][1]}</div><b>{CASOS[i][3]}</b><span class="m">{CASOS[i][4]}</span></div>'
    for pos, i in minis
)
(AQUI / "slide-1.html").write_text(f'''{HEAD}
<style>
  .grande {{ margin-top: 32px; font-size: 124px; font-weight: 800; letter-spacing: -5.5px; line-height: .96; }}
  .collage {{ position: relative; height: 560px; margin-top: 30px; }}
  .mini {{ position: absolute; background: #fff; color: var(--texto); border-radius: 26px; padding: 24px 28px; width: 420px; box-shadow: 0 30px 60px -24px rgba(10,12,60,.6); }}
  .mini .t {{ display: flex; align-items: center; gap: 12px; font-size: 26px; font-weight: 700; color: var(--indigo); }}
  .mini .t svg {{ width: 30px; height: 30px; stroke-width: 2.2; }}
  .mini b {{ display: block; font-size: 34px; letter-spacing: -1px; margin-top: 12px; }}
  .mini span.m {{ font-size: 30px; font-weight: 800; letter-spacing: -.8px; color: #3B4150; }}
</style></head>
<body><div class="slide fondo-hero">
  <div class="marca-agua"></div>
  <div class="cabecera"><span class="logo">trado</span></div>
  <div class="antetitulo"><span class="etiqueta">4 formas de usarlo</span></div>

  <div class="grande">No es solo para <span class="marca">celulares.</span></div>

  <div class="collage">
{collage}
  </div>

  <div class="relleno"></div>
  <div class="pie"><span>trado.cl</span><span class="desliza">Desliza →</span></div>
</div></body></html>
''', encoding="utf8")

# ── Un slide por tipo ──
for n, (clave, tipo, titulo, producto, monto, pasos) in enumerate(CASOS, start=2):
    lista = "\n".join(f'    <div class="paso-c"><span class="n">{i}</span><span>{p}</span></div>' for i, p in enumerate(pasos, 1))
    (AQUI / f"slide-{n}.html").write_text(f'''{HEAD}<link rel="stylesheet" href="casos.css"></head>
<body><div class="slide fondo-gris">
  <div class="cabecera"><span class="logo">trado</span><span class="contador">{n} / 6</span></div>

  <div class="tipo"><span class="ic">{ICON[clave]}</span>{tipo}</div>
  <div class="titulo caso-titulo">{titulo}</div>

  <div class="pasos-caso">
{lista}
  </div>

  <div class="relleno"></div>
  <div class="tarjeta sala giro-der">
    <div class="fila"><span class="estado estado-custodia">{LOCK}Pago retenido</span><span class="rotulo">{tipo}</span></div>
    <div class="producto">{producto} · {monto}</div>
  </div>

  <div class="pie" style="margin-top:72px"><span></span><span class="desliza">Desliza →</span></div>
</div></body></html>
''', encoding="utf8")

# ── Cierre ──
(AQUI / "slide-6.html").write_text(f'''{HEAD}</head>
<body><div class="slide fondo-hero">
  <div class="marca-agua"></div>
  <div class="cabecera"><span class="logo">trado</span><span class="contador">6 / 6</span></div>

  <div class="mega" style="margin-top:150px;font-size:100px;letter-spacing:-4px">Tú pones el trato.<br>Nosotros cuidamos <span class="marca">la plata.</span></div>

  <p class="sub" style="margin-top:48px;max-width:800px">Si algo no calza, abres una apelación, ambos suben pruebas y la plata sigue retenida mientras se resuelve.</p>

  <div class="relleno"></div>
  <div class="cta">
    <div><div class="antes">Crear tu cuenta es gratis</div><div class="url">trado.cl</div></div>
    <div class="boton">→</div>
  </div>
</div></body></html>
''', encoding="utf8")
print("listo")
