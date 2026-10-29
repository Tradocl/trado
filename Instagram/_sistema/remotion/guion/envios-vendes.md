# Reel «Envíos · vendes» (serie segmentada): borrador para grabar

Para: emprendedores que **venden** por Instagram o WhatsApp y despachan por courier. (El que compra tiene su propio reel: [envios-compras.md](envios-compras.md).)
Tipo de sala: `producto_envio`. ~38 s. (El post 16 ya habló de envíos desde el comprador;
este es el lado del que vende.)

**Idea:** al emprendedor que recién parte lo frena la desconfianza: el cliente nuevo no le
quiere transferir, y él tampoco quiere enviar sin cobrar.

| # | Toma | Lo que dices | Lo que pasa en pantalla |
|---|---|---|---|
| 1 | hook | «Si tienes un emprendimiento, seguro te han escrito esto: "¿Y cómo sé que no eres estafa?"» | Tu fondo real. `Chat` «Cliente nuevo» con esa frase en grande. |
| 2 | perder | «Y ahí pierdes la venta. Porque tú tampoco vas a enviar sin que te paguen.» | Carrito 🛒 que se vacía; píldora «Venta perdida». |
| 3 | trado | «Con Trado, tu cliente paga en Trado y la plata queda retenida. No te la tiene que transferir a ti.» | `Esquema` cliente – Trado – tú. Píldora «Pago retenido en escrow ✓». |
| 4 | envio | «Tú envías por courier y dejas el número de seguimiento en la sala.» | 📦 que sale en camión; tarjeta «Courier · N° de seguimiento» que se pega a la `Sala`. |
| 5 | recibe | «Tu cliente lo recibe, lo marca como recibido, tiene 72 horas para revisar, y se libera el pago.» | Botón «Marcar como Recibido» → reloj de 72 h → «Pago liberado». |
| 6 | duda | «¿Y si dice que no le llegó nada? La plata sigue retenida, y el seguimiento queda en la sala para que el equipo revise el caso.» | Chat «No me llegó nada 😠» → la `Sala` con el seguimiento y la apelación. Píldora «En revisión». |
| 7 | cierre | «Véndele a quien no te conoce. En trado.cl» | Tarjeta final azul: «trado», «Véndele a quien no te conoce», «trado.cl». |

La toma 6 responde la pregunta que hizo un seguidor en el post 16.

## Verificado contra la app

- Para marcar como enviado son obligatorios courier y «Número de seguimiento *» (`Transaction.tsx`).
- El comprador ve «¿Recibiste el producto?» y «Marcar como Recibido»; desde ahí corren las
  **72 h** de revisión (`REVIEW_HOURS.producto_envio`). En envío el pago **no** se libera solo
  mientras el comprador no marque recibido (no está en `IN_DELIVERY_AUTORELEASE_TYPES`).
- Si reclama, se abre una apelación: 48 h para que se pongan de acuerdo
  (`APPEAL_NEGOTIATION_HOURS`) y después decide el equipo de Trado. La plata no se mueve mientras tanto.

## Cuidado al decirlo

- No decir «siempre gana el vendedor» ni «el comprador no puede mentir»: el equipo revisa
  las pruebas de los dos lados. Lo que sí es cierto es que el reclamo no es automático: hay
  seguimiento y alguien lo revisa.
- «Tiene 72 horas para revisar, y se libera el pago» está simplificado: se libera cuando
  confirma, o solo si en esas 72 h no reporta nada.

Hashtags (5): #emprendedoreschile #ventasporinstagram #pymeschile #enviosatodochile #ecommercechile
