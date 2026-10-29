# Reel «Freelance» (serie segmentada): borrador para grabar

Para: quien cobra después de trabajar (diseño, fotos, edición, clases, desarrollo, arreglos).
Tipo de sala: `servicio`. ~35 s.

**Idea:** el problema del freelance no es conseguir el trabajo, es cobrarlo.

| # | Toma | Lo que dices | Lo que pasa en pantalla |
|---|---|---|---|
| 1 | hook | «Si eres freelance, esto te pasó: entregaste el trabajo… y el cliente te dejó en visto.» | Tu fondo real. Archivo «logo_final_v7.png» que sale volando de ti; doble check azul y 👻 con grillos. |
| 2 | excusas | «"Te pago el viernes." "Esta semana sin falta." "Uy, se me pasó."» | `Chat` «Cliente»: las tres excusas caen una tras otra, con tonos que suben. Un calendario que pasa de viernes a viernes. |
| 3 | adelanto | «Y si pides todo por adelantado, el cliente se asusta y se va con otro.» | Cambias de lado. Chat: «¿100 % antes? mmm…» → «escribiendo…» → se va. |
| 4 | trado | «Con Trado, el cliente paga antes de que empieces, y la plata queda retenida. Tú ves que está ahí y trabajas tranquilo.» | `Esquema` cliente – Trado – tú. Píldora «Pago retenido en escrow ✓» sobre tu cabeza. |
| 5 | cobro | «Terminas, marcas el servicio como realizado, y el cliente tiene 24 horas para revisar. Si no dice nada, el pago se libera solo.» | Botón «Marcar Servicio como Realizado» (diseño nuestro) → reloj de 24 h que corre → «Pago liberado». |
| 6 | cierre | «Diseño, fotos, edición, clases: lo que hagas. Cobra lo que trabajas, en trado.cl» | Palabras que caen en escalera (diseño · fotos · edición · clases). Tarjeta final azul: «trado», «Cobra lo que trabajas», «trado.cl». |

## Verificado contra la app

- En una sala de servicio los roles se llaman «Cliente» y «Proveedor».
- El cliente paga antes («Tus fondos estarán protegidos hasta que confirmes el servicio»).
- El proveedor ve «¿Has completado el servicio?» y el botón «Marcar Servicio como Realizado».
- El cliente ve «Confirmar y Liberar Pago». Si no confirma ni reporta, se libera solo a las
  **24 h** (`REVIEW_HOURS.servicio`, `IN_DELIVERY_AUTORELEASE_TYPES`).

## Cuidado al decirlo

«Si no dice nada, el pago se libera solo» es cierto; «siempre te pagan» no: el cliente puede
reportar dentro de las 24 h y ahí se abre una apelación (48 h para que se pongan de acuerdo y
después decide el equipo). No prometer que el cliente «no puede reclamar».

Hashtags (5): #freelancechile #trabajoindependiente #disenografico #creativoschile #freelancer
