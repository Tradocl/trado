# Reel «En persona» (serie segmentada): borrador para grabar

Para: quien vende o compra usado y se junta a entregar (metro, mall, plaza).
Tipo de sala: `producto_persona`. ~35 s.

**Idea:** juntarse en persona parece lo más seguro, pero el problema sigue siendo el pago:
el comprobante falso o andar con efectivo.

| # | Toma | Lo que dices | Lo que pasa en pantalla |
|---|---|---|---|
| 1 | hook | «Te juntas a vender tu celular. Te muestra la transferencia en su teléfono, le pasas el celu… y la plata nunca llega.» | Tu fondo real. 📱 que pasa de tus manos a otras; comprobante «Transferencia exitosa ✓» que se rompe en pedazos. |
| 2 | efectivo | «Y si compras, ¿vas con $300.000 en efectivo a juntarte con alguien que no conoces?» | Cambias de lado. Fajo de billetes que tiembla; píldora «¿Y si no llega?». |
| 3 | trado | «Con Trado, el comprador paga antes de juntarse, y la plata queda retenida.» | `Esquema` comprador – Trado – vendedor. Píldora «Pago retenido en escrow ✓». |
| 4 | antes | «El vendedor ve el pago antes de salir de su casa. Y en la misma sala ponen el lugar y la hora.» | `Sala` con «Propuesta de encuentro»: «Metro Baquedano · sábado 12:00» → «Encuentro Confirmado». |
| 5 | entrega | «Se juntan, revisas el producto ahí mismo y confirmas desde el celular. Ahí se libera el pago.» | Te acercas («cerca»). Botón «Confirmar Recepción y Liberar Pago» → ✓ y destello. |
| 6 | cierre | «Nadie anda con efectivo y nadie entrega a ciegas. En trado.cl» | Tarjeta final azul: «trado», «Ni efectivo ni comprobantes falsos», «trado.cl». |

## Verificado contra la app

- En persona se paga antes del encuentro: el estado «Pago retenido en escrow» existe antes de entregar.
- `MeetingProposalPanel`: se propone ubicación, fecha y hora, el otro la acepta o rechaza,
  y aparece «Encuentro Confirmado». La app recomienda «un lugar público y seguro».
- El comprador ve «¿Recibiste el producto en persona?» y «Confirmar Recepción y Liberar Pago».
- Si no confirma ni reporta, se libera solo a las **24 h** (`REVIEW_HOURS.producto_persona`).

## Cuidado al decirlo

- «Se libera el pago» sí; «te llega al instante a tu cuenta» no (el retiro tiene sus propios tiempos).
- Trado resuelve el pago, no la seguridad física del encuentro: no decir «juntarse seguro».
- El monto de $300.000 está sobre el límite sin verificar ($250.000 por sala,
  `UNVERIFIED_LIMITS`). Está bien como ejemplo de efectivo, pero si se muestra una sala con
  ese monto, tiene que ser de alguien verificado; si no, usar $200.000.

Hashtags (5): #segundamano #ventadecelulares #compraventachile #metrodesantiago #santiagodechile
