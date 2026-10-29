# Reel «En persona · vendes» (serie segmentada): borrador para grabar

Para: quien **vende** usado y se junta a entregar (metro, mall, plaza). (El que compra tiene su propio reel: [en-persona-compras.md](en-persona-compras.md).)
Tipo de sala: `producto_persona`. ~32 s.

**Idea:** juntarse en persona parece lo más seguro, pero el que vende entrega el producto
mirando un comprobante que puede ser falso.

| # | Toma | Lo que dices | Lo que pasa en pantalla |
|---|---|---|---|
| 1 | hook | «Te juntas a vender tu celular. Te muestra la transferencia en su teléfono, le pasas el celu… y la plata nunca llega.» | Tu fondo real. 📱 que pasa de tus manos a otras; comprobante «Transferencia exitosa ✓» que se rompe en pedazos. |
| 2 | comprobante | «Porque un comprobante en pantalla se hace en un minuto. Y tú ya entregaste.» | Cambias de lado. Comprobante que se arma solo, pieza por pieza; píldora «Falso». |
| 3 | trado | «Con Trado, el comprador paga antes de juntarse, y la plata queda retenida.» | `Esquema` comprador – Trado – tú. Píldora «Pago retenido en escrow ✓». |
| 4 | antes | «Tú ves el pago en la app antes de salir de tu casa. Y en la misma sala ponen el lugar y la hora.» | `Sala` con «Propuesta de encuentro»: «Metro Baquedano · sábado 12:00» → «Encuentro Confirmado». |
| 5 | entrega | «Se juntan, el comprador lo revisa ahí mismo y confirma desde su celular. Ahí se libera tu pago.» | Te acercas («cerca»). Botón «Confirmar Recepción y Liberar Pago» → ✓ y destello. |
| 6 | cierre | «Nunca más entregues mirando un comprobante. Vende en trado.cl» | Tarjeta final azul: «trado», «Entrega sin mirar comprobantes», «trado.cl». |

## Verificado contra la app

- En persona se paga antes del encuentro: el estado «Pago retenido en escrow» existe antes de entregar.
- `MeetingProposalPanel`: se propone ubicación, fecha y hora, el otro la acepta o rechaza,
  y aparece «Encuentro Confirmado». La app recomienda «un lugar público y seguro».
- El comprador ve «¿Recibiste el producto en persona?» y «Confirmar Recepción y Liberar Pago».

## Cuidado al decirlo

- «Se libera tu pago» sí; «te llega al instante a tu cuenta» no (el retiro tiene sus propios tiempos).
- Trado resuelve el pago, no la seguridad física del encuentro: no decir «juntarse seguro».

Hashtags (5): #segundamano #ventadecelulares #compraventachile #metrodesantiago #santiagodechile
