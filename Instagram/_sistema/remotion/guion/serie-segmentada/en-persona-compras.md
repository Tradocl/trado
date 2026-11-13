# Reel «En persona · compras» (serie segmentada): borrador para grabar

Para: quien **compra** usado y se junta a recibirlo (metro, mall, plaza). (El que vende tiene su propio reel: [en-persona-vendes.md](en-persona-vendes.md).)
Tipo de sala: `producto_persona`. ~33 s.

**Idea:** para comprar en persona hay dos opciones y las dos dan miedo: ir con efectivo, o
transferir antes y rezar para que el vendedor llegue.

| # | Toma | Lo que dices | Lo que pasa en pantalla |
|---|---|---|---|
| 1 | hook | «¿Vas a comprar un celular usado y te vas a juntar con el vendedor?» | Tu fondo real. `Publicacion` (diseño nuestro): «iPhone 13 · $200.000 · Metro Baquedano». |
| 2 | efectivo | «O vas con $200.000 en efectivo a juntarte con alguien que no conoces…» | Fajo de billetes en tu mano que tiembla; reloj que corre mientras esperas. |
| 3 | adelanto | «…o le transfieres antes "para asegurarlo", y nunca llega.» | Cambias de lado. `Chat` «Vendedor»: «Transfiéreme para reservártelo» → comprobante → 👻 con grillos. |
| 4 | trado | «Con Trado, pagas en Trado antes de juntarte, pero la plata queda retenida. No le llega al vendedor.» | `Esquema` tú – Trado – vendedor. Píldora «Pago retenido en escrow ✓». |
| 5 | revisas | «Se juntan donde acordaron en la sala, revisas el celular ahí mismo, y recién si está todo bien, confirmas y se libera el pago.» | `Sala` «Encuentro Confirmado» → te acercas («cerca») → botón «Confirmar Recepción y Liberar Pago». |
| 6 | reclamo | «¿No llegó? ¿No era lo que decía? Lo reportas, y la plata sigue retenida hasta que se resuelva.» | Píldora «Producto nunca llegó» → la plata quieta en el centro del esquema. |
| 7 | cierre | «Ni efectivo, ni transferirle a un desconocido. Compra en trado.cl» | Tarjeta final azul: «trado», «Ni efectivo ni transferencias a ciegas», «trado.cl». |

## Verificado contra la app

- En persona se paga antes del encuentro y queda «Pago retenido en escrow».
- `MeetingProposalPanel`: lugar, fecha y hora; «Encuentro Confirmado».
- El comprador ve «¿Recibiste el producto en persona?» y «Confirmar Recepción y Liberar Pago».
- Motivos de reclamo en la app: «Producto nunca llegó», «Producto distinto al acordado»,
  «Daños o fallas» (`CreateAppealDialog.tsx`). Con apelación abierta la plata no se libera.

## Cuidado al decirlo

- $200.000 está bajo el límite sin verificar ($250.000 por sala, `UNVERIFIED_LIMITS`). No subirlo.
- «Hasta que se resuelva», no «te devolvemos la plata»: si no se ponen de acuerdo en 48 h,
  decide el equipo con las pruebas de los dos.
- No decir «juntarse seguro»: Trado cuida el pago, no el encuentro.

Hashtags (5): #segundamano #compraventachile #iphonechile #metrodesantiago #santiagodechile
