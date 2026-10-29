# Reel «Freelance · contratas» (serie segmentada): borrador para grabar

Para: quien **contrata** un trabajo y paga antes (logo, fotos de un evento, edición, clases, página web).
(El que hace el trabajo tiene su propio reel: [freelance-cobras.md](freelance-cobras.md).)
Tipo de sala: `servicio`. ~35 s.

**Idea:** te piden el adelanto antes de empezar, y una vez pagado no tienes cómo apurar
a nadie ni cómo recuperar la plata.

| # | Toma | Lo que dices | Lo que pasa en pantalla |
|---|---|---|---|
| 1 | hook | «Le pagaste el adelanto al diseñador… y hace dos semanas que no te contesta.» | Tu fondo real. Comprobante «Adelanto 50 %» que sale de ti; doble check y 👻 con grillos. |
| 2 | excusas | «"Mañana te lo mando." "Estoy con mucha pega." Y el logo no llega nunca.» | `Chat` «Diseñador»: las excusas caen una tras otra con tonos que suben. Calendario que pasa semanas. |
| 3 | distinto | «O te llega algo que no tiene nada que ver con lo que pediste. Y ya pagaste.» | Cambias de lado. Tarjeta «Lo que pediste» vs. «Lo que llegó» (un dibujo torpe); píldora «Ya pagado». |
| 4 | trado | «Con Trado, pagas en Trado y la plata queda retenida. El que hace el trabajo ve que está ahí, pero no la recibe todavía.» | `Esquema` tú – Trado – proveedor. Píldora «Pago retenido en escrow ✓». |
| 5 | revisas | «Cuando te lo entrega, lo revisas. Si está bien, confirmas y se libera el pago.» | Llega el archivo; botón «Confirmar y Liberar Pago» → ✓. |
| 6 | reclamo | «¿No lo hizo? ¿No es lo que acordaron? Lo reportas, y la plata no se mueve hasta que se resuelva.» | Píldoras de la app que caen: «Servicio no realizado» · «Servicio distinto al acordado» · «Trabajo deficiente». |
| 7 | cierre | «Paga por un trabajo sin pagarlo a ciegas. En trado.cl» | Tarjeta final azul: «trado», «Paga cuando te lo entreguen», «trado.cl». |

## Verificado contra la app

- En una sala de servicio los roles se llaman «Cliente» y «Proveedor»; el cliente paga antes
  («Tus fondos estarán protegidos hasta que confirmes el servicio»).
- El proveedor marca «Marcar Servicio como Realizado»; el cliente ve «¿El servicio fue
  realizado correctamente?» y «Confirmar y Liberar Pago».
- Motivos de reclamo de servicio (`CreateAppealDialog.tsx`): «Servicio no realizado»,
  «Servicio distinto al acordado», «Trabajo deficiente», «Incumplimiento del acuerdo».

## Cuidado al decirlo

- **El reloj de 24 h**: desde que el proveedor marca el servicio como realizado, el cliente
  tiene 24 h para confirmar o reportar; si no hace nada, se libera solo
  (`REVIEW_HOURS.servicio`). Este reel no lo menciona para no complicarlo, pero el caption
  sí debe decirlo: «Tienes 24 horas para revisar desde que te avisan que está listo».
- «Hasta que se resuelva», no «te devolvemos la plata»: 48 h para ponerse de acuerdo y después
  decide el equipo con las pruebas de los dos.
- El adelanto «50 %» es solo la imagen del problema: en Trado se retiene el total acordado en la sala.

Hashtags (5): #emprendedoreschile #pymeschile #disenografico #freelancechile #comprasegura
