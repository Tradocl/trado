# Serie segmentada: un reel por cada forma de usar Trado

Mismo formato que «Desde donde quieras» (post 16): tú a cámara, jump cuts, subtítulos
palabra por palabra y animación de marca. La diferencia es que **cada reel le habla a una
sola persona con un solo problema**, en vez de explicar Trado para todos.

Cada caso tiene **dos reels, uno por lado**: el que paga y el que recibe la plata. Son
miedos distintos (el que paga teme quedarse sin nada; el que vende o trabaja teme no cobrar),
así que no se mezclan en el mismo video.

| Caso | Tipo de sala | El que paga | El que cobra |
|---|---|---|---|
| Entradas | `producto_digital` | [entradas-compras.md](entradas-compras.md): «¿Vas a comprar una entrada de reventa por Instagram?» | [entradas-vendes.md](entradas-vendes.md): «¿Tienes una entrada que ya no vas a usar y la quieres vender?» |
| Trabajos | `servicio` | [freelance-contratas.md](freelance-contratas.md): «Le pagaste el adelanto al diseñador… y hace dos semanas que no te contesta.» | [freelance-cobras.md](freelance-cobras.md): «Si eres freelance, esto te pasó: entregaste el trabajo… y el cliente te dejó en visto.» |
| En persona | `producto_persona` | [en-persona-compras.md](en-persona-compras.md): «¿Vas a comprar un celular usado y te vas a juntar con el vendedor?» | [en-persona-vendes.md](en-persona-vendes.md): «Te juntas a vender tu celular. Te muestra la transferencia… y la plata nunca llega.» |
| Envíos | `producto_envio` | [envios-compras.md](envios-compras.md): «Encontraste la zapatilla que buscabas, en una tienda de Instagram que no conoces.» | [envios-vendes.md](envios-vendes.md): «Si tienes un emprendimiento, seguro te han escrito esto: "¿Y cómo sé que no eres estafa?"» |

Los dos reels de un mismo caso comparten la mitad de Trado (el esquema y los botones de la
app), así que se graban seguidos y se arman reutilizando esas escenas.

## Las reglas de la serie

1. **El segmento se nombra en la primera frase.** «¿Vas a comprar una entrada de reventa?»,
   «Si eres freelance…». Meta reparte a quien reacciona en los primeros 2 segundos: si el
   gancho es de entradas, el anuncio termina en gente de entradas aunque la audiencia sea amplia.
2. **Un solo problema y un solo flujo.** Nada de «sirve para productos, servicios y digital».
   Cada reel muestra solo los pasos de su tipo de sala, con los nombres que salen en la app.
3. **El problema se dice como lo diría la persona**, con su chat típico («Te pago el viernes»,
   «Transfiéreme y te la mando»).
4. **Cierre igual en todos**: tarjeta azul, «trado», la frase del reel y la píldora «trado.cl».
   Así se reconocen como serie en la grilla.
5. **~30–40 s**, 6 tomas. Frases cortas: si una frase no cabe en un respiro, se parte.

## Lo que no se puede decir (vale para los cuatro)

- Nada de «100 % seguro», «cero estafas» ni «garantizado».
- Ninguna cifra de comisión. Si hace falta, «pagas comisión solo si la venta se concreta».
- Plazos solo los del código (`REVIEW_HOURS` en `src/lib/escrow.ts`): 72 h envío,
  24 h persona, digital y servicio. Si cambian ahí, cambia el guion.
- Apps y ticketeras solo por su nombre, sin logos ni pantallas.

## Cómo se segmenta en Meta Ads

Un conjunto de anuncios por reel, cada uno con su propia audiencia, para comparar cuál
segmento responde. **Siempre Chile completo, Santiago incluido.**

Para que los intereses se respeten hay que usar **«Opciones de audiencia original»**
(sin Advantage+ audiencia). Con Advantage+, Meta toma los intereses como sugerencia y vuelve
a mostrarle el anuncio a todos, que es justo lo que queremos dejar de hacer.

| Reel | Edad | Intereses (escribirlos en el buscador de Meta; usar los que existan) |
|---|---|---|
| Entradas · compras | 18–34 | Conciertos, Festivales de música, Música en vivo, Lollapalooza, Ticketmaster |
| Entradas · vendes | 18–34 | Los mismos de compras: es el mismo público, cambia el gancho |
| Trabajos · contratas | 25–50 | Pequeñas empresas, Emprendimiento, Marketing digital, Diseño de logotipos, Fotografía de bodas |
| Trabajos · cobras | 22–45 | Trabajo independiente, Freelancer, Diseño gráfico, Fotografía, Edición de video, Workana |
| En persona · compras | 18–45 | Productos de segunda mano, Facebook Marketplace, Teléfonos inteligentes, iPhone, Videojuegos |
| En persona · vendes | 18–45 | Los mismos de compras, más Yapo |
| Envíos · compras | 18–40 | Compras en línea, Moda, Zapatillas, Instagram Shopping, Ofertas y descuentos |
| Envíos · vendes | 22–50 | Emprendimiento, Pequeñas empresas, Comercio electrónico, Instagram Shopping, Chilexpress |

Cuando dos reels comparten audiencia (entradas, en persona), van en conjuntos separados igual:
así se ve cuál de los dos lados responde mejor.

Mismo objetivo que la campaña actual (visitas al perfil de Instagram) para comparar con lo
que ya hay. El reparto del presupuesto se decide aparte (ver `notas/`, fuera de git).

## Orden sugerido para grabar

Son ~52 frases en total: dos sesiones de grabación, cada una con la misma ropa y luz.
Conviene grabar **Trabajos y En persona primero** (los cuatro reels): son los dolores más
fáciles de reconocer en 2 segundos. Entradas y Envíos en la segunda sesión.

No hace falta lanzar los ocho anuncios a la vez: con el presupuesto mensual alcanzan pocos
conjuntos al mismo tiempo. Lo razonable es probar los dos lados de un caso, quedarse con el
que mejor convierte y pasar al caso siguiente.
