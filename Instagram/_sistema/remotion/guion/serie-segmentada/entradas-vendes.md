# Reel «Entradas · vendes» (serie segmentada): borrador para grabar

Para: quien **vende** entradas que ya no va a usar. (El que compra tiene su propio reel: [entradas-compras.md](entradas-compras.md).)
Tipo de sala: `producto_digital`. ~32 s.

**Idea:** no puedes ir al concierto y quieres recuperar la plata, pero nadie te quiere
transferir primero, y tú no vas a mandar la entrada sin que te paguen.

| # | Toma | Lo que dices | Lo que pasa en pantalla |
|---|---|---|---|
| 1 | hook | «¿Tienes una entrada que ya no vas a usar y la quieres vender?» | Tu fondo real. Ícono de entrada de concierto (la del reel 15) que gira sobre tu cabeza. |
| 2 | nadie | «Te escriben diez. Ninguno quiere transferir primero: "Mándamela y te pago al tiro".» | `Chat` con varios «Comprador» que se apilan, todos con la misma frase. |
| 3 | riesgo | «Y si la mandas primero, te deja en visto. Y tu entrada ya es de otro.» | Cambias de lado. La entrada sale volando; doble check y 👻 con grillos. |
| 4 | trado | «Con Trado, el comprador paga en Trado y la plata queda retenida. Tú ves el pago antes de mandar nada.» | `Esquema` comprador – Trado – tú. Píldora «Pago retenido en escrow ✓». |
| 5 | entregas | «Mandas la entrada, la marcas como entregada, y el comprador tiene 24 horas para revisar. Si no dice nada, el pago se libera solo.» | Botón «Marcar como Entregado» → reloj de 24 h → «Pago liberado». |
| 6 | cierre | «Vende tu entrada sin que nadie te tenga que creer. En trado.cl» | Tarjeta final azul: «trado», «Vende tu entrada sin perseguir a nadie», «trado.cl». |

## Verificado contra la app

- El vendedor ve «¿Ya le entregaste el producto digital al comprador (entrada, link o archivo)?»
  y «Marcar como Entregado».
- Desde ahí, el comprador tiene **24 h** para confirmar o reportar; si no hace nada, se libera
  solo (`REVIEW_HOURS.producto_digital`, `IN_DELIVERY_AUTORELEASE_TYPES`).

## Cuidado al decirlo

- Si el comprador reporta dentro de las 24 h, se abre una apelación: no prometer «te pagan sí o sí».
- No incentivar reventa sobre el precio original: el ejemplo es alguien que «ya no va a usar»
  su entrada, no un revendedor.

Hashtags (5): #entradas #reventa #conciertoschile #festivaleschile #compraventachile
