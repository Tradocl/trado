# Serie segmentada: un reel por cada forma de usar Trado

Mismo formato que «Desde donde quieras» (post 16): tú a cámara, jump cuts, subtítulos
palabra por palabra y animación de marca. La diferencia es que **cada reel le habla a una
sola persona con un solo problema**, en vez de explicar Trado para todos.

| Reel | Para quién | Tipo de sala en la app | Guion |
|---|---|---|---|
| Entradas | Quien compra o vende entradas de reventa | `producto_digital` | [entradas.md](entradas.md) |
| Freelance | Diseñadores, fotógrafos, editores, profes: los que cobran después de trabajar | `servicio` | [freelance.md](freelance.md) |
| En persona | Quien vende o compra usado y se junta a entregar (metro, mall) | `producto_persona` | [en-persona.md](en-persona.md) |
| Envíos | Emprendedores que venden por redes y despachan | `producto_envio` | [envios.md](envios.md) |

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
| Entradas | 18–34 | Conciertos, Festivales de música, Música en vivo, Lollapalooza, Ticketmaster |
| Freelance | 22–45 | Trabajo independiente, Freelancer, Diseño gráfico, Fotografía, Edición de video, Workana |
| En persona | 18–45 | Facebook Marketplace, Productos de segunda mano, Teléfonos inteligentes, Videojuegos, Yapo |
| Envíos | 22–50 | Emprendimiento, Pequeñas empresas, Comercio electrónico, Instagram Shopping, Chilexpress |

Mismo objetivo que la campaña actual (visitas al perfil de Instagram) para comparar con lo
que ya hay. El reparto del presupuesto se decide aparte (ver `notas/`, fuera de git).

## Orden sugerido para grabar

Los cuatro se pueden grabar el mismo día, con la misma ropa y luz: son ~25 frases en total.
Conviene grabar **Freelance y En persona primero**: son los dolores más fáciles de reconocer
en 2 segundos y los que menos dependen de una explicación.
