# Reel «Desde donde quieras» (post 16): guion final

Lo que quedó publicado, tal como se dijo en la grabación (prueba-2). El borrador
original tenía otro texto; los subtítulos siguen al audio, no al borrador.

Duración: ~42 s · 9:16 · subtítulos palabra por palabra · código en `src/reels/DesdeDondeQuieras.tsx`.

**Idea:** encuentras lo que buscabas, pero el vendedor está lejos y no lo conoces.
Trado no es otro marketplace: se suma a donde ya compras y vendes y se pone al medio del pago.

| # | Toma | Lo que dices | Lo que pasa en pantalla |
|---|---|---|---|
| 1 | hook | «Lo encontraste, el precio perfecto, pero el vendedor está en Arica.» | Tu fondo real. Un feed corre sobre tu cabeza y frena en una bici ($180.000); se marcan el precio y «📍 Arica»; mapa Arica–Santiago con ruta dudosa y la píldora «≈ 2.000 km». |
| 2 | duda | «Y ahí es donde empieza la duda. ¿Cómo lo hago si no es en persona? ¿Pago y rezo para que me llegue? ¿Y qué pasa si me llega una piedra? ¿O envío y rezo para que me paguen?» | «?» gigante y «la duda». Sales de cuadro: chat con «Vendedor · Arica» («Transfiéreme y te lo mando 😉»), comprobante de transferencia y 🙏. Vuelves y te cae una piedra en la cabeza (dibujada, `Piedra` en `piezas/efectos.tsx`). Cierra con el lado del vendedor: chat con «Comprador · Punta Arenas», visto y 👻 con grillos. |
| 3 | mira | «Mira, ahí está tu producto después de haberlo pagado.» | Cae una caja 📦, se abre con destello y sale la piedra; píldora «Pagado: $180.000 ✓». |
| 4 | nomkt | «Trado no es un Marketplace. Sigues comprando y vendiendo donde ya lo haces. En WhatsApp, Instagram, Facebook.» | «trado», «marketplace» tachado, «🛍️ Compras» / «🏷️ Vendes» / «donde ya estás». Tres tarjetas con el nombre de cada app (sin logos), con sonidos que suben como escalera, y confeti. En el audio se escapó «Marketplace» en vez de «WhatsApp» y no se pudo regrabar: la tarjeta y el subtítulo dicen WhatsApp. |
| 5 | medio | «Nosotros nos ponemos al medio. Pagas en Trado. El vendedor envía el producto. El comprador al recibirlo, revisa y libera el pago.» | Esquema comprador – Trado – vendedor que se arma paso a paso con cada frase; tú te mueves de lado a lado. |
| 6 | cierre | «Y así da lo mismo dónde esté el producto. Compra y vende donde quieras.» | Mapa de Chile con rutas entre ciudades de norte a sur y «desde donde quieras». |
| 7 | trado | «En trado.cl» | Tarjeta final azul: «trado», «Compra y vende desde donde quieras.», píldora «trado.cl». Sales de cuadro. |

Tramos usados de `video.mp4` y el centro de la cara de cada toma: ver la tabla al inicio
de `src/reels/DesdeDondeQuieras.tsx`.

Verificado contra la app: pago retenido («Pago retenido en escrow»), el vendedor envía,
el comprador revisa (72 h en envíos) y libera. Las apps se nombran, no se muestran.
