# Trado — Mapa de contexto

> **Para quien lea esto:** es el documento de arranque del proyecto. Si estás
> empezando una conversación nueva, lee esto primero y no vuelvas a descubrir
> desde cero lo que ya está aprendido acá.
>
> **Mantención:** este archivo se actualiza cuando cambia algo que él afirma.
> Si tocas comisiones, crons, autenticación de funciones, medios de pago o
> límites, actualiza la sección correspondiente **en el mismo commit**. Un mapa
> desactualizado es peor que no tener mapa: hace tomar decisiones con datos
> falsos, y en este proyecto eso ya pasó (ver *Errores caros*).
>
> Última actualización: 2026-09-24

---

## 1. Qué es Trado

Fintech chilena de **transacciones protegidas con escrow** entre particulares.
El comprador deposita, Trado retiene los fondos, el vendedor entrega, el
comprador confirma y recién ahí se libera el pago menos la comisión. Si hay
conflicto, hay apelaciones con mediación.

- **Producción:** https://trado.cl (redirige a www)
- **Estado real (2026-09-13):** 11 usuarios, 4 salas todas cerradas, **$0 en
  custodia**, sin disputas abiertas. Ya pasó por su primer ciclo completo con
  plata real: dos compras, dos disputas, acuerdo mutuo y reembolso total.
- **Esa primera operación real destapó tres bugs graves**, todos corregidos el
  2026-09-13 y documentados en [REVISION.md](REVISION.md): acuñación de dinero
  abierta a cualquiera, el sistema de comisiones neutralizado por un trigger, y
  el reembolso que movía plata antes de poder registrarla. Vale la pena leer esa
  sección antes de tocar el camino del dinero.
- **No está regulada por la CMF.** Los fondos quedan en una cuenta bancaria a
  nombre de Trado. No es custodia segregada ni supervisada. Esto **hay que
  decirlo de frente** a clientes empresariales; ver *Clientes y comercial*.

## 2. Stack e infraestructura

| Pieza | Detalle |
|---|---|
| Frontend | React 18 + Vite 5 + TypeScript, Tailwind, shadcn/ui |
| Hosting | Vercel, deploy automático desde `main` |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions en Deno) |
| Pagos | MercadoPago + transferencia bancaria manual |
| Emails | Resend, con plantillas propias en `_shared/email-templates/` |
| Móvil | Capacitor (Android) |
| Repo | https://github.com/Tradocl/trado (**público**) |
| Marketing | `Instagram/`: feed, reels, historias y logos, con el sistema que los genera en `_sistema/`. `Instagram/5 Documentos/` y `notas/` no se suben porque son internos |

**Proyecto Supabase:** `aekzrackrijuxvopqfbp`, cuenta **contacto@trado.cl**.
Hay un token personal de larga duración llamado "Claude" en la cuenta; si
aparecen 403 en cadena, exportar `SUPABASE_ACCESS_TOKEN` con él evita depender
de la sesión de la CLI, que se cae sola cada pocos minutos.
Ojo: no es la cuenta personal `josepabloacevedoolivares@gmail.com`, que ve otros
proyectos distintos. Para trabajar contra producción hay que
`npx supabase login` con la cuenta correcta, y **hay que hacerlo desde una
terminal real** porque la CLI rechaza el flujo interactivo en entornos sin TTY.
La sesión se ha caído sola al menos una vez; si aparecen 403 en cadena, es eso
y no un problema de permisos.

## 3. Modelo de negocio

### Comisión — dos tarifas según el medio de pago

Definida en [`src/lib/utils.ts`](src/lib/utils.ts) → `calculateFee(monto, medio)`.
**Trado absorbe el costo de la pasarela (~3,6%)**: el usuario deposita y se le
acredita el monto completo, el `mpFee` se registra en
`wallet_movements.external_fee` pero no se le descuenta. Por eso hay dos tarifas.

**Pasarela (tarjeta): 5% plano.** Sin tramos ni tope. No se escala hacia abajo
porque el procesador ya se lleva 3,6% y sólo queda ~1,4% neto: no hay de dónde
recortar.

**Transferencia: tramos marginales decrecientes.** Cada tramo cobra su tasa sólo
sobre la parte del monto que cae dentro de él, como el impuesto a la renta. Eso
la hace continua (nunca hay un escalón donde pagar un peso más salga
desproporcionado) y decreciente. Acá la pasarela no cobra nada, así que **lo
cobrado es lo ganado**.

| Tramo | Tasa marginal |
|---|---|
| hasta $400.000 | 3,5% |
| $400.000 – $1.150.000 | 3% |
| sobre $1.150.000 | 2,5% |

Mínimo $1.000 por operación, redondeo a la decena, en ambas tarifas.

| Monto | Tarjeta | Transferencia | Ahorra el usuario | Neto tarjeta | Neto transf. |
|---|---|---|---|---|---|
| $200.000 | $10.000 (5%) | $7.000 (3,50%) | $3.000 | 1,40% | **3,50%** |
| $400.000 | $20.000 (5%) | $14.000 (3,50%) | $6.000 | 1,40% | **3,50%** |
| $1.000.000 | $50.000 (5%) | $32.000 (3,20%) | $18.000 | 1,40% | **3,20%** |
| $2.000.000 | $100.000 (5%) | $57.750 (2,89%) | $42.250 | 1,40% | **2,89%** |

**La clave del diseño:** el descuento por transferencia no se paga con margen
propio. Es traspasar el costo de pasarela que se ahorra, así que el usuario paga
menos *y* Trado gana más (2,89% vs 1,40% en $2M). Por eso conviene empujar la
transferencia en montos altos, y por eso es obligatoria sobre $1.150.000.

- **`MAX_TRANSACTION_AMOUNT` = $2.000.000.** Sobre eso no se puede crear una
  transacción solo; hay que cotizar.
- **`CUSTOM_PRICING_FROM` = $1.000.000.** Desde ahí se *ofrece* precio a medida
  sin bloquear: el usuario puede seguir con el precio automático si prefiere.

### Decisión pendiente: qué tarifa se cobra realmente

`transactions.commission` se **congela al crear la transacción**
([CreateTransaction.tsx](src/pages/CreateTransaction.tsx)), pero el medio de pago
se elige después, al depositar en la billetera. Y los depósitos entran a un saldo
general, sin quedar atados a una transacción, así que en
`process-escrow-deposit` **no hay forma confiable de saber si esa plata entró por
tarjeta o por transferencia**.

**Resuelto (2026-09-02).** La comisión ya no se congela al crear la sala: se
fija en `process-escrow-deposit`, cuando se sabe con qué plata se está
financiando.

El saldo es fungible, así que `wallets.gateway_funded_balance` lleva cuánto
llegó por pasarela y no se ha gastado. Al financiar se consumen PRIMERO esos
pesos, que pagan 5% (cubriendo el ~3,6% que ya costaron), y el resto paga la
escala de transferencia. La comisión final es la mezcla proporcional
(`calculateBlendedFee`). La marca se agota al gastarse, y la plata que entra por
una venta o un reembolso nunca la lleva porque nunca pasó por la pasarela.

Sin esto había una fuga real: depositar $1.000.000 con tarjeta (Trado paga
$36.000) y pagar la sala a tarifa de transferencia ($32.000) dejaba −$4.000.

Ejemplo, cubierto por tests: quedan $685.000 marcados y el resto entró limpio.
Sala de $2.000.000 → 34,25% pasarela → comisión **$72.220**, entre los $57.750
de transferencia pura y los $100.000 de tarjeta pura.

**Los reembolsos restituyen la marca** (verificado en el código el 2026-09-24):
`process-return-refund`, `resolve-appeal` y `accept-mutual-resolution` llaman a
`restore_gateway_funded` en proporción a lo devuelto (`gatewayMarkToRestore` en
`_shared/pricing.ts`). Importa doble desde que la plata de tarjeta no se puede
retirar al banco: si un camino de reembolso no la restituyera, esa plata volvería
"limpia" y saldría al banco. **Todo camino nuevo que devuelva escrow al
comprador tiene que restituir la marca.** Las cancelaciones automáticas
(`expire-stale-transactions`) sólo tocan salas sin plata (`created`/`invited`).

### Medios de pago

Se elige **al depositar en la billetera**, no al crear la transacción. Por eso
la comisión no puede depender del medio sin rediseñar cuándo se cobra.

- `OFFER_TRANSFER_AT` = $400.000 → se ofrece transferencia
- `FORCE_TRANSFER_AT` = $1.150.000 → transferencia obligatoria
- Por transferencia no hay costo de pasarela: el monto se acredita completo.

**La transferencia no es instantánea.** Puede tomar hasta 24 horas hábiles en
acreditarse, y hasta entonces los fondos no están asegurados y el vendedor no
debería despachar. Es fricción real justo en las operaciones grandes, que son
las que obligan a transferencia. Está avisado en el FAQ, pero **debería
avisarse también en el flujo de pago**, no sólo ahí.

### Otros parámetros

- **Plazos de revisión** ([`auto-release-escrow`](supabase/functions/auto-release-escrow/index.ts)):
  72h producto con envío, 24h servicio, 24h producto digital. Vencido el plazo
  sin confirmar, se libera solo al vendedor.
  - **Qué barre el cron** (importante): envío se auto-libera desde
    `awaiting_buyer_review`, o sea **sólo después de que el comprador marca
    "recibido"** (received_at + 72h). Servicio y digital se auto-liberan desde
    `in_delivery` (shipped_at + 24h), porque no tienen paso de "recibido".
  - **Producto en persona NO se auto-libera:** su `shipped_at` es cuándo se
    aceptó la reunión, no la entrega, y el encuentro puede ser días después.
    Liberar por ese reloj pagaría antes del encuentro. Queda confirmación
    manual del comprador, y apelación si el comprador desaparece.
  - El cron **salta cualquier tx con apelación viva** (`apelacion_abierta`,
    `en_negociacion`, `pendiente_intervencion_plataforma`,
    `en_revision_plataforma`): esa plata la resuelve `resolve-appeal`, no el cron.
- **Tipos de venta** (`sale_type`, columna `text` sin CHECK):
  `producto_envio`, `producto_persona`, `producto_digital`, `servicio`. El
  digital (entrada / link / archivo) se agregó porque entradas y bienes
  digitales no calzaban en las opciones físicas y la gente elegía mal. Opera
  **igual que servicio**: sin tracking, el vendedor marca entregado y el
  comprador confirma. No requirió migración de BD (la columna es `text`). Sí
  obligó a tocar `auto-release-escrow` (una de las 6 de dinero) para que
  servicio y digital se liberen desde `in_delivery`; **ese deploy exige ventana
  sin escrow vivo + revalidar Fase 0** de [REVISION.md](REVISION.md).
- **Apelaciones:** 48h de negociación directa, después media un admin. La
  comisión **nunca** se devuelve, ni en apelaciones ni en acuerdos mutuos.
  `auto-escalate-appeals` (cron horario) escala al vencer las 48h y, **una vez al
  día a las 12:00 UTC**, manda a `ADMIN_ALERT_EMAIL` un resumen de las disputas que
  llevan más de 48h esperando decisión: mientras esperan, la plata sigue retenida.
  **No hay plazo comprometido para que el admin resuelva** (pendiente de negocio).
- **Devoluciones** (sólo antes de confirmar la recepción): el comprador la pide;
  si asume la culpa parte aceptada y él paga el envío de vuelta, si no el vendedor
  acepta (paga él) o rechaza (va a mediación del admin, que decide quién paga).
  Luego el comprador despacha, y al recibir el vendedor `process-return-refund`
  reembolsa. Estuvo roto hasta el 2026-09-24: el trigger prohibía todos los pasos
  y el admin no tenía permiso de escritura; lo repara
  `20260924010000_repara_devoluciones.sql`.
- **Límites sin verificar** ([`src/lib/escrow.ts`](src/lib/escrow.ts) →
  `UNVERIFIED_LIMITS`): **$250.000 por transacción, $500.000 acumulado**.
  Subidos el 2026-09-19 desde $100.000/$200.000, porque los tickets reales
  resultaron más grandes y dos compras de $100.000 ya topaban el acumulado,
  obligando a verificar en mitad de la operación.
  **Hasta esa fecha eran decorativos:** vivían sólo en el frontend y cualquiera
  que llamara la API directo los saltaba. Ahora los exige el trigger
  `enforce_unverified_limits()` en la base, que es la autoridad; el módulo de
  TypeScript es su espejo. El acumulado cuenta todo lo que no esté `cancelled`,
  no sólo lo completado: si contara sólo lo cerrado, se podrían abrir varias
  salas a la vez y superar el tope entre todas.
- **Retiros:** siempre manuales, los aprueba un admin. El RUT de la cuenta
  bancaria debe coincidir con el del perfil, y **el RUT del perfil no se puede
  cambiar una vez ingresado** (si se pudiera, quien robe una cuenta pondría su
  RUT y su banco).
- **La plata de tarjeta no sale al banco** (desde 2026-09-24). Lo que entró por
  MercadoPago y no se gastó en una sala completada (`gateway_funded_balance`)
  sólo puede **volver a la tarjeta**: si no, una tarjeta robada se convierte en
  efectivo con depósito → sala que no se completa → retiro. Retirable al banco =
  `saldo − plata de tarjeta − retiros pendientes`
  (`public.withdrawable_balance()`, espejo en `src/lib/wallet-rules.ts`). Lo
  exigen el trigger de inserción de retiros y `admin_approve_movement`. El
  usuario puede devolverse su plata de tarjeta él mismo desde la billetera
  ("Devolver a mi tarjeta" → `refund-mercadopago-deposit`, que ahora acepta al
  dueño además del admin y hace reembolsos parciales).

### Casillas internas

Sólo existen **`contacto@trado.cl`** y **`transacciones@trado.cl`**. `admin@trado.cl`
**no existe**, y durante meses cuatro funciones le escribieron ahí: esos avisos
rebotaron sin que nadie lo notara. Corregido el 2026-09-12.

El reparto es por si hace falta que alguien **haga** algo:

| Casilla | Qué recibe | Constante |
|---|---|---|
| `contacto@trado.cl` | Requiere acción: escalamientos de disputas, verificaciones por revisar, depósitos por transferencia y retiros por aprobar. Es la cuenta principal de admin. | `ADMIN_ALERT_EMAIL()` |
| `transacciones@trado.cl` | Flujo operativo, sólo seguimiento: salas que se abren, disputas que se abren. Volumen alto, no exige respuesta. | `OPS_ALERT_EMAIL()` |

Ambas se sobreescriben con los secrets `ADMIN_ALERT_EMAIL` y `OPS_ALERT_EMAIL`
sin tocar código. Están definidas en `_shared/email-templates/notification.ts`.

**Regla al agregar avisos internos:** nunca escribir la dirección a mano, usar la
constante. Y el aviso interno va **después** del correo al usuario y envuelto en
try/catch, para que un problema interno no le rompa la notificación a nadie.

## 4. Trampas del sistema (leer antes de tocar)

### Llaves de Supabase: dos formatos incompatibles

Supabase inyecta `SUPABASE_SERVICE_ROLE_KEY` en las Edge Functions en el
**formato nuevo** (`sb_secret_...`, 41 chars), pero el **gateway sólo acepta el
JWT legacy** (`eyJ...`, 219 chars) en el header `Authorization`: al otro
responde `Invalid API key` antes de llegar a tu código.

Como `requireServiceRole` compara `token === env`, **jamás podían coincidir** en
una llamada servidor-a-servidor. Las funciones rechazaban a sus propios cron
jobs con 403. Por eso existe el secret **`SERVICE_ROLE_JWT`** (el JWT legacy),
que [`_shared/auth.ts`](supabase/functions/_shared/auth.ts) acepta además del
inyectado. **No borrar ese secret.**

El prefijo `SUPABASE_` es reservado: `supabase secrets set` lo rechaza.

### verify_jwt y el header Authorization

Con `verify_jwt = true` el gateway **reemplaza** el header `Authorization`, así
que la función ya no ve el token original y `requireServiceRole` falla. Las
funciones llamadas por cron deben ir con `--no-verify-jwt` y autovalidarse
internamente. Están así: `auto-release-escrow`, `expire-stale-transactions`,
`auto-escalate-appeals`.

### Cron jobs

Los 3 jobs (`cron.job`) llaman Edge Functions vía `net.http_post`, leyendo la
URL y la llave desde **Vault**, no desde `current_setting('app.*')`:

```sql
(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
```

`service_role_key` guarda el **JWT legacy**, no el `sb_secret_`.

| Job | Horario | Qué hace |
|---|---|---|
| `auto-release-escrow` | `0 * * * *` | Libera escrow vencido el plazo de revisión |
| `auto-escalate-appeals` | `15 * * * *` | Escala apelaciones sin acuerdo a los admins |
| `expire-stale-transactions` | `30 * * * *` | Cancela transacciones sin movimiento (72h) |

Para diagnosticar: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC`
y las respuestas HTTP en `net._http_response`.

### Modelo de seguridad de la base (desde 2026-09-24)

Una auditoría encontró que un vendedor podía cobrarse el escrow sin entregar
(editando `sale_type`/`shipped_at` para que el cron liberara) y que las partes
de una disputa podían falsificar y re-aceptar propuestas de acuerdo, acreditando
plata que no existía. Se corrigió con la migración
`20260924000000_cierra_huecos_escrow.sql`. Reglas que quedaron:

- **Lista de lo permitido, no de lo prohibido.** En `transactions`, `appeals` y
  `appeal_mutual_proposals` un usuario común sólo puede cambiar las columnas que
  la app escribe; cualquier otra lanza `No autorizado a modificar: <columna>`.
  **Si agregas una columna que el navegador tenga que escribir, súmala a la
  lista del trigger correspondiente** o la app va a fallar.
- **Las fechas las pone el servidor.** `shipped_at`, `received_at`,
  `dispute_opened_at` y `cancelled_at` se fijan con `now()` en la transición de
  estado; lo que mande el navegador se ignora. `negotiation_deadline` también (48h).
- Un usuario ya no puede poner una sala en `completed` (sólo `confirm-delivery`),
  ni reabrir una cerrada con `in_dispute`, ni borrar `appeal_status`.
- Las propuestas de acuerdo son inmutables: sólo se rechazan o retiran.
  `accept-mutual-resolution` y `resolve-appeal` verifican que la apelación sea de
  esa sala, que la sala tenga escrow y que `blocked_balance` alcance, porque
  `release_blocked_balance` recorta en cero en vez de fallar.
- **Admins con 2FA obligatorio.** `is_admin_mfa()` exige `aal2`; las políticas de
  escritura de admin, `admin_approve_movement`, `is_admin_or_service()` y las
  funciones `resolve-appeal`/`refund-mercadopago-deposit` lo piden. El panel
  `/admin*` pasa por `AdminMfaGate`, que enrola o pide el código. Un admin sin
  2FA se comporta como usuario común.
- **Perfil de la contraparte:** ya no se lee la fila de `profiles` (tenía banco,
  RUT, dirección, documentos). Los nombres se piden con la RPC
  `get_profile_names` vía `src/lib/profile-names.ts`.
- Bucket `chat-images` **privado**: el chat muestra adjuntos con URL firmada
  (`src/lib/chat-files.ts`).
- Calificaciones: una por persona y sala, sólo con la sala `completed`.
- Cambiar la contraseña exige sesión reciente
  (`security_update_password_require_reauthentication`).
- Encabezados de seguridad en `vercel.json` (anti-clickjacking, HSTS, nosniff).

### wallet_movements no tiene user_id

Se filtra por **`wallet_id`**. Hay que resolver primero la wallet del usuario.
Filtrar por `user_id` no sólo falla en runtime: también hace explotar a
TypeScript con `TS2589 Type instantiation is excessively deep`, porque intenta
resolver la columna inexistente contra las relaciones de la tabla. **Si ves ese
error, sospecha de una columna que no existe antes que del compilador.**

### types.ts es generado

`src/integrations/supabase/types.ts` se regenera con
`npx supabase gen types typescript --project-id aekzrackrijuxvopqfbp`.
Si agregas una RPC en una migración y no regeneras, `tsc` falla. Ya pasó con
`admin_approve_movement`.

## 5. Estado operativo

### Funciona

- Sitio, rutas SPA, variables de entorno en Vercel
- Base de datos activa; **RLS correcta** — verificado que un anónimo no lee
  `transactions`, `wallets`, `wallet_movements`, `appeals`, `audit_logs`,
  `user_roles` ni `profiles`
- 31 Edge Functions desplegadas
- Los 3 crons, arreglados el 2026-09-02 tras **75 días caídos**
  (1.963 corridas, 0 exitosas). Verificado: corridas programadas consecutivas
  en `succeeded`.
- Comisión por origen del dinero, desplegada y verificada el 2026-09-02
- Secrets presentes: `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `RESEND_API_KEY`,
  `SITE_URL`, `SERVICE_ROLE_JWT`

### Roto o ausente

- **Push notifications nunca funcionaron.** Faltan `VAPID_PRIVATE_KEY`,
  `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` y `FIREBASE_SERVICE_ACCOUNT`. La función
  está desplegada pero no puede enviar nada. Hay UI que promete algo que no ocurre.
- **Sin monitoreo de errores** (Sentry o equivalente). Los bugs se descubren
  cuando alguien reclama.
- **Nunca se probó un flujo real de punta a punta** con dinero: registro →
  depósito → transacción → confirmación → retiro.

### Calidad

- Tests: `npm test` (vitest). Cubren la aritmética de comisión en
  `src/lib/utils.test.ts`. **El resto del sistema no tiene tests.**
- CI: `.github/workflows/ci.yml` corre `tsc`, tests y build en push a `main` y PRs.
- Lint: ~177 errores, casi todos `no-explicit-any` en catch de Edge Functions.
  Cosmético.
- `Verification` y otras páginas usan import dinámico para librerías pesadas
  (`heic2any` pesa 1,2MB y sólo hace falta para fotos HEIC de iPhone).

## 6. Errores caros ya cometidos

Están acá para no repetirlos.

1. **Trabajar sobre un clon local atrasado.** El repo local estuvo 13 commits
   detrás de `origin/main` sin que nadie lo notara. Todo el análisis hecho sobre
   esa base fue inválido: se concluyó que producción tenía código no versionado
   ("deriva") cuando en realidad estaba todo en GitHub, sin bajar.
   **Siempre `git fetch` antes de analizar o concluir algo.**

2. **Citar la comisión de memoria.** Se le dijo a un cliente empresarial que la
   comisión tenía tope de $20.000 (~1% en $2M) cuando el modelo real daba
   $84.000 (4,2%). **Los números de precio se leen del código, siempre.**

3. **Casi sobrescribir `main` con un merge desde una rama vieja.** El push fue
   rechazado por GitHub y eso salvó dos meses de trabajo. **No forzar pushes.**

## 7. Clientes y comercial

### Caso abierto: tmuros.cl (Jorge Adriazola)

Empresa de estructuras para casas. Preguntó por regulación CMF y por dónde
quedan los fondos. Se le respondió con transparencia que no hay regulación CMF.

**Su problema real, en sus palabras:** sus clientes abonan por avance de obra y
no tienen cómo saber dónde está su plata; y a él los abonos le entran a la
cuenta de la empresa y se mezclan con el flujo operacional, al punto de tener
que pedir líneas de crédito. Dijo textual: *"es un desorden pero más es la
desconfianza del cliente"*.

**El calce es real** en confianza y trazabilidad. **La brecha también:** Trado
no soporta pagos por hitos ni abonos parciales — es un monto, una liberación.
Él además mencionó estar armando su propia plataforma y que "le falta esta
parte", así que puede ser integración y no sólo cliente.

Sus montos superan `MAX_TRANSACTION_AMOUNT`, así que cae en precio a medida y en
transferencia obligatoria. Hay reunión por Zoom pendiente.

**Corrección pendiente:** si se le envió el número viejo de comisión, hay que
corregirlo antes de la reunión.

## 8. Comandos útiles

```bash
npm run dev            # desarrollo
npm test               # tests
npm run build          # build de producción
npx tsc --noEmit -p tsconfig.app.json

npx supabase login                                    # desde terminal real
npx supabase db query "SELECT 1" --linked
npx supabase functions deploy <slug> --no-verify-jwt --project-ref aekzrackrijuxvopqfbp
npx supabase functions download <slug> --project-ref aekzrackrijuxvopqfbp
npx supabase secrets list --project-ref aekzrackrijuxvopqfbp
npx supabase gen types typescript --project-id aekzrackrijuxvopqfbp > src/integrations/supabase/types.ts
```

## 9. Pendientes

**Antes de traer un cliente grande**

- [ ] Probar un flujo real de punta a punta con montos chicos
- [ ] Decidir el hueco de margen entre $400.000 y $1.150.000
- [ ] Monitoreo de errores
- [ ] Tests de las transiciones de estado del escrow

**Seguridad**

- [ ] Los 3 admins deben enrolar su 2FA (se les pide al entrar a `/admin`)
- [ ] Captcha en el registro (requiere cuenta de hCaptcha o Turnstile)
- [ ] Protección de contraseñas filtradas (HIBP): requiere plan Pro
- [ ] Monitoreo de errores (Sentry o equivalente)

**Higiene**

- [ ] Configurar `VAPID_*` y `FIREBASE_SERVICE_ACCOUNT`, o quitar la UI de push
- [ ] `verify_jwt` de `send-test-emails`: el repo dice `false`, producción `true`
- [ ] Limpiar los `no-explicit-any` de las Edge Functions

**Producto**

- [ ] Avisar la demora de hasta 24h de la transferencia dentro del flujo de pago,
      no sólo en el FAQ
- [ ] Mostrar ambos precios al crear la transacción, con el ahorro destacado
- [ ] Pagos por hitos / abonos parciales (lo que pide tmuros)
- [ ] Precio por volumen para empresas recurrentes
