# Reel «Envíos · compras» (serie segmentada): borrador para grabar

Para: quien **compra** a tiendas chicas de Instagram o WhatsApp y recibe por courier.
(El que vende tiene su propio reel: [envios-vendes.md](envios-vendes.md).)
Tipo de sala: `producto_envio`. ~35 s. Distinto del post 16: allá el miedo era la distancia,
acá es la tienda que no conoces.

**Idea:** encontraste justo lo que querías en una tienda chica, pero no tienes cómo saber si
es real antes de transferir.

| # | Toma | Lo que dices | Lo que pasa en pantalla |
|---|---|---|---|
| 1 | hook | «Encontraste la zapatilla que buscabas, en una tienda de Instagram que no conoces.» | Tu fondo real. `Publicacion` (diseño nuestro): «Zapatillas · $59.990 · Envíos a todo Chile». |
| 2 | dudas | «Tiene pocos seguidores, los comentarios están cerrados y te piden transferencia.» | Píldoras que caen una tras otra con tonos que suben: «312 seguidores» · «Comentarios desactivados» · «Solo transferencia». |
| 3 | miedo | «¿Transfieres y esperas que te llegue algo?» | Cambias de lado. Comprobante que sale de ti; caja que nunca llega (punto suspensivo que no termina). |
| 4 | trado | «Con Trado, pagas en Trado y la plata queda retenida, no en la cuenta de la tienda.» | `Esquema` tú – Trado – tienda. Píldora «Pago retenido en escrow ✓». |
| 5 | seguimiento | «La tienda tiene que enviarlo por courier con número de seguimiento. Y lo ves en la sala.» | Camión con 📦; tarjeta «Courier · N° de seguimiento» que se pega a la `Sala`. |
| 6 | revisas | «Cuando llega, lo marcas como recibido y tienes 72 horas para revisarlo. ¿No era lo que pediste? Lo reportas y la plata no se mueve.» | Botón «Marcar como Recibido» → reloj de 72 h; píldora «Producto distinto al acordado». |
| 7 | cierre | «Cómprale a cualquier tienda sin tener que confiar. En trado.cl» | Tarjeta final azul: «trado», «Cómprale a quien no conoces», «trado.cl». |

## Verificado contra la app

- Para marcar como enviado, courier y «Número de seguimiento *» son obligatorios (`Transaction.tsx`).
- El comprador ve «¿Recibiste el producto?» y «Marcar como Recibido»; desde ahí corren las
  **72 h** (`REVIEW_HOURS.producto_envio`). Mientras no lo marque, el pago no se libera solo.
- Motivos de reclamo: «Producto nunca llegó», «Producto distinto al acordado», «Daños o fallas».

## Cuidado al decirlo

- Para usar Trado la tienda tiene que aceptar crear la sala (o unirse a la que creas tú). El
  caption debe decirlo: «Pídele a la tienda que te venda por Trado: crea la sala y mándale el link».
- «La plata no se mueve» hasta que se resuelva; no prometer devolución automática.
- Producto genérico, sin marca de zapatillas a la vista.

Hashtags (5): #comprasonline #comprasegura #tiendasonline #compraventachile #estafasonline
