# Plan de revisión de Trado

> Preparado el 2026-09-12 para ejecutar después. Lee
> [CONTEXTO.md](CONTEXTO.md) antes de empezar.
>
> **El contexto cambió:** ya hay $200.000 de terceros en custodia y 2 disputas
> abiertas. Esto dejó de ser pre-lanzamiento. Las fases están ordenadas por
> riesgo, no por comodidad: la 0 es bloqueante y la 1 es lo que ya sabemos que
> está roto.

---

## Fase 0 — Confirmar que lo vivo está sano (bloqueante)

Antes de tocar una línea. Si algo acá falla, se arregla eso primero.

- [ ] `git fetch` y confirmar que el clon local no está atrasado
- [ ] Estado de las salas vivas y que la contabilidad cuadre:
  ```sql
  SELECT w.id, w.balance, w.blocked_balance, w.gateway_funded_balance,
         (SELECT coalesce(sum(t.amount),0) FROM transactions t
          WHERE t.buyer_id = w.user_id
            AND t.state IN ('funds_secured','in_delivery','awaiting_buyer_review','return_in_progress'))
         AS escrow_esperado
  FROM wallets w WHERE w.blocked_balance > 0;
  ```
  `blocked_balance` tiene que ser **exactamente** igual a `escrow_esperado`.
- [ ] Los 3 cron jobs en `succeeded` en sus últimas corridas:
  ```sql
  SELECT j.jobname, d.status, d.start_time FROM cron.job_run_details d
  JOIN cron.job j ON j.jobid=d.jobid
  WHERE d.start_time > now() - interval '6 hours' ORDER BY d.start_time DESC;
  ```
- [ ] Disputas abiertas y su plazo: si alguna pasó `negotiation_deadline` sin
      escalar, el cron no está haciendo su trabajo.

**Regla mientras haya escrow vivo:** no desplegar `confirm-delivery`,
`auto-release-escrow`, `process-return-refund`, `resolve-appeal`,
`accept-mutual-resolution` ni `process-escrow-deposit`. Son las seis que mueven
plata. Todo lo demás se puede tocar.

## Fase 1 — Lo que ya sabemos que está roto

Nada de esto hay que investigarlo: está diagnosticado y esperando.

- [ ] **Desplegar la rama `fix/marca-origen-en-reembolsos`.** Restituye la marca
      de origen del dinero en los tres caminos de devolución. Sin esto, un
      reembolso "lava" el origen y la siguiente sala cobra tarifa barata sobre
      plata que entró por tarjeta. Es pérdida de margen, no riesgo para el
      usuario. **Requiere que no haya escrow vivo.**
- [ ] **Push notifications nunca funcionaron.** Faltan `VAPID_PRIVATE_KEY`,
      `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` y `FIREBASE_SERVICE_ACCOUNT`. Hoy hay
      UI que promete algo que no ocurre: o se configuran, o se quita la UI.
- [ ] **`GATEWAY_COST_RATE` está mal.** Dice 3,6% y MercadoPago cobró **3,08%**
      real ($3.080 sobre $100.000, medido el 2026-09-12). Estás subestimando tu
      propio margen. Corregir en `src/lib/utils.ts` y en
      `supabase/functions/_shared/pricing.ts` (son espejo, cambiar los dos).
- [ ] **Avisar la demora de la transferencia en el flujo de pago.** Hoy sólo
      está en el FAQ. Hay dos depósitos por transferencia cancelados
      ($1.000.000 y $1.500.000) que pueden ser justo esa fricción.
- [ ] **Mostrar ambos precios al crear la sala.** `calculateOrderDetails` ya
      devuelve `gatewayFee`, `transferFee` y `savings`. Falta la pantalla.

## Fase 2 — Reconciliar la plata

- [ ] **Cuadrar MercadoPago contra Trado.** El panel mostraba $204.551 y Trado
      registró 3 pagos por $201.000 brutos ($194.809 netos). Sobran entre
      $3.551 y $9.742 según si MP ya descontó comisiones. Entrar a **Actividad**
      en MP y comparar contra estos IDs:
      `178657433684`, `177685509347`, `164141332409`.
      Cualquier pago aprobado fuera de esa lista es **dinero de un usuario que
      no se acreditó**, y hay que acreditarlo a mano.
- [ ] **Revisar los logs de Resend** por rebotes a `admin@trado.cl`. Esa casilla
      no existe y cuatro funciones le escribieron durante meses: escalamientos,
      verificaciones, depósitos por transferencia y retiros. Puede haber
      solicitudes reales que nadie atendió.
- [ ] **Los dos depósitos por transferencia cancelados.** ¿Alguien intentó
      transferir y abandonó, o transfirió y nadie lo aprobó porque el aviso
      rebotaba? Es plata grande y vale saber cuál de las dos.

## Fase 3 — Probar lo que nunca se probó

Los usuarios ya ejercitaron sin querer la parte de depósito y creación de sala,
y el sistema de comisiones respondió correcto. Falta el resto.

- [ ] **Flujo completo de punta a punta** con montos chicos y cuentas propias:
      registro → depósito → crear sala → unirse → asegurar fondos → entrega →
      confirmar → **retiro a cuenta bancaria**. El retiro es el tramo que nunca
      se ha corrido entero.
- [ ] **Devolución completa**, incluyendo que la marca de origen se restituya
      (después de desplegar la Fase 1).
- [ ] **Apelación con mediación de admin**, resolviendo por `resolve-appeal`.
      Verificar que el comprador reciba el monto correcto: hoy el camino de
      devolución le descuenta comisión aunque el vendedor sea el que falló.
      **Decidir si eso es lo que quieres.**
- [ ] **Transferencia bancaria** como medio de depósito, extremo a extremo.
- [ ] **Correos:** confirmar que llegan a `contacto@` y `transacciones@`, y que
      los de auth (registro, recuperación) siguen entregando.

## Fase 4 — Auditoría de seguridad y dinero

- [ ] **RLS de nuevo.** Se verificó el 2026-09-02 y estaba impecable, pero desde
      entonces hubo migraciones. Reprobar que un anónimo no lea `transactions`,
      `wallets`, `wallet_movements`, `appeals`, `audit_logs`, `user_roles` ni
      `profiles`.
- [ ] **Revisar las 6 funciones del dinero** buscando condiciones de carrera.
      Ya aparecieron y se arreglaron dos (doble liberación de escrow, lost
      update en billeteras); conviene mirar el resto con la misma lupa.
- [ ] **Confirmar que toda función servidor-a-servidor valida.**
      `auto-escalate-appeals` estuvo abierta a cualquiera que supiera la URL.
      Revisar que ninguna otra quedó igual.
- [ ] **Descargar las 31 funciones y comparar contra el repo.** Cerrar cualquier
      deriva antes de que vuelva a morder.
- [ ] **Los secrets:** que `SERVICE_ROLE_JWT` siga existiendo (sin él los crons
      vuelven a fallar) y revocar el token personal "Claude" cuando no se use.

## Fase 5 — Calidad e infraestructura

- [ ] **Monitoreo de errores** (Sentry o equivalente). Hoy los bugs se descubren
      cuando alguien reclama, y eso ya no es aceptable con plata real adentro.
- [ ] **Tests de las transiciones de escrow.** Sólo está cubierta la aritmética
      de comisión. La máquina de estados, que es donde se pierde plata, no.
- [ ] **Los ~177 errores de lint**, casi todos `no-explicit-any` en catch de
      Edge Functions. Cosmético, al final de la fila.
- [ ] **Chunks pesados** en el bundle.

## Fase 6 — Producto pendiente

- [ ] **Pagos por hitos / abonos parciales.** Es lo que pidió tmuros y hoy no
      existe: es un monto, una liberación.
- [ ] **Precio por volumen** para empresas recurrentes.
- [ ] **Corregirle la comisión a Jorge (tmuros)** si se le envió el número
      viejo. La cifra real para $2.000.000 depende del medio de pago y sale de
      `calculateFee`, **nunca de memoria**.

---

## Cómo ejecutar esto

Una fase por sesión, empezando siempre por la 0. No mezclar fases: la gracia
del orden es que si algo se rompe, se sabe qué lo rompió.

Después de cada cambio en el camino del dinero, reprobar la Fase 0 completa
antes de seguir.
