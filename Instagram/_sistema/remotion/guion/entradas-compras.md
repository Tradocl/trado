# Reel «Entradas · compras» (serie segmentada): borrador para grabar

Para: quien **compra** entradas de reventa por Instagram, WhatsApp o grupos. (El que vende tiene su propio reel: [entradas-vendes.md](entradas-vendes.md).)
Tipo de sala: `producto_digital`. ~35 s.

**Idea:** la entrada se agotó, la encuentras de reventa, y el miedo es transferir y quedarte
sin plata y sin entrada.

| # | Toma | Lo que dices | Lo que pasa en pantalla |
|---|---|---|---|
| 1 | hook | «¿Vas a comprar una entrada de reventa por Instagram?» | Tu fondo real. `Publicacion` (diseño nuestro): «2 entradas cancha · $90.000». Píldora «Agotado» sobre tu cabeza. |
| 2 | apuro | «Quedan pocas, el concierto es el sábado, y el vendedor te apura: "Transfiéreme y te la mando".» | `Chat` «Vendedor»: «Quedan 2, transfiéreme y te la mando 😉». Calendario con el sábado marcado. |
| 3 | miedo | «Transfieres, y te bloquea. O te manda una captura que no sirve de nada.» | Cambias de lado. Comprobante → «bloqueado». Después una captura borrosa de entrada que se tacha. |
| 4 | trado | «Con Trado, pagas en Trado y la plata queda retenida, no le llega al vendedor. Él te manda la entrada. Y recién cuando te llega, confirmas y se libera el pago.» | `Esquema` comprador – Trado – vendedor, un paso por frase. Ícono de entrada (la de concierto del reel 15) viajando del vendedor al comprador. |
| 5 | reclamo | «¿No te llegó? Lo reportas, y la plata no se mueve hasta que se resuelva.» | Píldora «Pago retenido» que no se mueve; `Sala` con el reporte. |
| 6 | cierre | «Compra tu entrada sin tener que confiar en un desconocido. En trado.cl» | Tarjeta final azul: «trado», «Tu entrada, sin tener que confiar», píldora «trado.cl». |

## Verificado contra la app

- El vendedor marca «Marcar como Entregado» («entrada, link o archivo»); el comprador ve
  «¿Recibiste el producto digital?» y «Confirmar Recepción y Liberar Pago».
- Si el comprador no confirma ni reporta, el pago se libera solo a las **24 h** desde que se
  marca entregado (`REVIEW_HOURS.producto_digital`, `IN_DELIVERY_AUTORELEASE_TYPES`).
- Reportar abre una apelación y la plata queda retenida mientras tanto.

## Cuidado al decirlo

Trado comprueba que **la entrada llegó**, no que vaya a pasar el torniquete del recinto el
día del evento (eso puede ser semanas después de las 24 h). Por eso el guion no dice «se acabaron
las entradas falsas» ni «entrada válida garantizada». Si se quiere agregar un consejo honesto
para el caption: «Si la ticketera lo permite, pide que te la transfieran a tu cuenta: así la
ves en tu app antes de confirmar».

Hashtags (5): #entradas #reventa #conciertoschile #festivaleschile #compraventachile
