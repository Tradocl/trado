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
> Última actualización: 2026-09-02

---

## 1. Qué es Trado

Fintech chilena de **transacciones protegidas con escrow** entre particulares.
El comprador deposita, Trado retiene los fondos, el vendedor entrega, el
comprador confirma y recién ahí se libera el pago menos la comisión. Si hay
conflicto, hay apelaciones con mediación.

- **Producción:** https://trado.cl (redirige a www)
- **Estado real:** pre-lanzamiento. 7 usuarios, 1 transacción (cancelada),
  $1.000 CLP de saldo total, 0 apelaciones. Nada de esto es volumen real todavía.
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
| Repo | https://github.com/Tradocl/trado |

**Proyecto Supabase:** `aekzrackrijuxvopqfbp`, cuenta **contacto@trado.cl**.
Ojo: no es la cuenta personal `josepabloacevedoolivares@gmail.com`, que ve otros
proyectos distintos. Para trabajar contra producción hay que
`npx supabase login` con la cuenta correcta, y **hay que hacerlo desde una
terminal real** porque la CLI rechaza el flujo interactivo en entornos sin TTY.
La sesión se ha caído sola al menos una vez; si aparecen 403 en cadena, es eso
y no un problema de permisos.

## 3. Modelo de negocio

### Comisión (tramos marginales)

Definida en [`src/lib/utils.ts`](src/lib/utils.ts) → `calculateFee`. Cada tramo
cobra su tasa **sólo sobre la parte del monto que cae dentro de él**, igual que
el impuesto a la renta. Eso la hace continua (nunca hay un escalón donde
convenga declarar menos) y decreciente.

| Tramo | Tasa marginal |
|---|---|
| hasta $400.000 | 5% |
| $400.000 – $1.150.000 | 3,5% |
| sobre $1.150.000 | 2,5% |

Mínimo $1.000 por operación. Redondeo a la decena.

| Monto | Comisión | Tasa efectiva |
|---|---|---|
| $200.000 | $10.000 | 5,00% |
| $400.000 | $20.000 | 5,00% |
| $1.000.000 | $41.000 | 4,10% |
| $2.000.000 | $67.500 | 3,38% |

- **`MAX_TRANSACTION_AMOUNT` = $2.000.000.** Sobre eso no se puede crear una
  transacción solo; hay que cotizar.
- **`CUSTOM_PRICING_FROM` = $1.000.000.** Desde ahí se *ofrece* precio a medida
  sin bloquear: el usuario puede seguir con el precio automático si prefiere.

### Margen real — importante

**Trado absorbe la comisión de MercadoPago (~3,19%).** El usuario deposita y se
le acredita el monto completo; el `mpFee` se registra en
`wallet_movements.external_fee` pero no se le descuenta. Entonces:

```
neto Trado = comisión cobrada − 3,19% (sólo si pagó con tarjeta)
```

| Monto | Medio | Comisión | Neto |
|---|---|---|---|
| $200.000 | tarjeta | $10.000 | **1,81%** |
| $600.000 | tarjeta | $27.000 | **1,31%** |
| $1.000.000 | tarjeta | $41.000 | **0,91%** |
| $1.500.000 | transferencia | $55.000 | **3,67%** |
| $2.000.000 | transferencia | $67.500 | **3,38%** |

**Hueco conocido:** entre $400.000 y $1.150.000 el usuario puede elegir tarjeta,
y ahí MercadoPago se come casi todo el margen (0,9%–1,3% neto). La palanca para
cerrarlo es bajar `FORCE_TRANSFER_AT` de $1.150.000 a ~$400.000, a costa de
fricción para el usuario. **Decisión pendiente del dueño.**

### Medios de pago

Se elige **al depositar en la billetera**, no al crear la transacción. Por eso
la comisión no puede depender del medio sin rediseñar cuándo se cobra.

- `OFFER_TRANSFER_AT` = $400.000 → se ofrece transferencia
- `FORCE_TRANSFER_AT` = $1.150.000 → transferencia obligatoria
- Por transferencia no hay costo de pasarela: el monto se acredita completo.

### Otros parámetros

- **Plazos de revisión** ([`auto-release-escrow`](supabase/functions/auto-release-escrow/index.ts)):
  72h producto con envío, 24h producto en persona, 24h servicio. Vencido el
  plazo sin confirmar, se libera solo al vendedor.
- **Apelaciones:** 48h de negociación directa, después media un admin. La
  comisión **nunca** se devuelve, ni en apelaciones ni en acuerdos mutuos.
- **Límites sin verificar** ([`src/lib/transaction-limits.ts`](src/lib/transaction-limits.ts)):
  $100.000 por transacción, $200.000 acumulado.
- **Retiros:** siempre manuales, los aprueba un admin. El RUT de la cuenta
  bancaria debe coincidir con el del perfil.

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
  (1.963 corridas, 0 exitosas)
- Secrets presentes: `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `RESEND_API_KEY`,
  `SITE_URL`, `SERVICE_ROLE_JWT`

### Roto o ausente

- **Push notifications nunca funcionaron.** Faltan `VAPID_PRIVATE_KEY`,
  `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` y `FIREBASE_SERVICE_ACCOUNT`. La función
  está desplegada pero no puede enviar nada. Hay UI que promete algo que no ocurre.
- **`support-chat`** sigue desplegada pero su código ya no está en el repo, y
  nunca tuvo `LOVABLE_API_KEY`, así que estaba muerta. Borrar del panel.
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

**Higiene**

- [ ] Borrar `support-chat` del panel de Supabase
- [ ] Configurar `VAPID_*` y `FIREBASE_SERVICE_ACCOUNT`, o quitar la UI de push
- [ ] `verify_jwt` de `send-test-emails`: el repo dice `false`, producción `true`
- [ ] Limpiar los `no-explicit-any` de las Edge Functions

**Producto**

- [ ] Pagos por hitos / abonos parciales (lo que pide tmuros)
- [ ] Precio por volumen para empresas recurrentes
