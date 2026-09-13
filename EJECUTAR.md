# Guion de ejecución — arreglos preparados

> Todo está escrito, probado y commiteado. **Nada desplegado.** Este archivo es
> el guion para ejecutarlo cuando se dé la orden.
>
> Preparado el 2026-09-12. Contexto en [REVISION.md](REVISION.md).

---

## Antes de empezar

```bash
export SUPABASE_ACCESS_TOKEN="<token de contacto@trado.cl>"
cd "C:/Users/josep/trado lovable/trado"
git fetch origin
npx supabase projects list   # tiene que aparecer aekzrackrijuxvopqfbp
```

---

## Bloque A — Seguridad y precio (se puede ejecutar YA)

**No toca ninguna de las seis funciones congeladas.** Son permisos de base de
datos y un trigger; el escrow vivo no se ve afectado.

Rama: `fix/permisos-y-comision-autoritativa`

### A1. Fotografiar el estado actual, para poder comparar después

```sql
SELECT p.proname,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('credit_wallet_balance','credit_wallet_balance_with_origin',
                    'release_blocked_balance','lock_escrow_balance',
                    'consume_gateway_funded','restore_gateway_funded',
                    'admin_approve_movement','get_safe_profile',
                    'get_transaction_preview','find_transaction_by_invite_code',
                    'generate_invite_code')
ORDER BY 1;
```

### A2. Aplicar la migración

```bash
git checkout fix/permisos-y-comision-autoritativa
npx supabase db query --file supabase/migrations/20260913000000_cierra_acunacion_y_comision_autoritativa.sql --linked
```

### A3. Verificar que cerró lo que tenía que cerrar

Repetir A1. Las **seis primeras** tienen que quedar en `false/false`. Las
**cinco últimas** tienen que seguir en `true` para `authenticated`: son las que
llama el frontend y romperlas deja el panel admin inservible.

### A4. Verificar que la comisión ahora la manda el servidor

```sql
SELECT prosrc LIKE '%is_admin_or_service%' AS exime_al_servidor
FROM pg_proc WHERE proname = 'enforce_transaction_commission';
-- tiene que dar true

SELECT public.compute_trado_commission(1000000);  -- 50000 (5% plano)
SELECT public.compute_trado_commission(2000000);  -- 100000
SELECT public.compute_trado_commission(5000);     -- 1000 (mínimo)
```

### A5. Probar de verdad que el agujero se cerró

Con la anon key del bundle público, esto **tiene que fallar**:

```bash
curl -s -X POST "https://aekzrackrijuxvopqfbp.supabase.co/rest/v1/rpc/credit_wallet_balance" \
  -H "apikey: <anon key>" -H "Content-Type: application/json" \
  -d '{"p_wallet_id":"00000000-0000-0000-0000-000000000000","p_delta":0}'
```

Esperado: error de permisos. Si devuelve otra cosa, **no se cerró**.

### A6. Desplegar el frontend

```bash
git checkout main && git merge --ff-only fix/permisos-y-comision-autoritativa
npm test && npm run build && git push origin main
```

Sólo cambia `GATEWAY_COST_RATE`, que se usa para mostrar margen. Sin riesgo.

### A7. Auditar si alguien ya lo explotó

```sql
SELECT w.id, w.balance, w.blocked_balance,
       coalesce((SELECT sum(m.amount) FROM wallet_movements m
                 WHERE m.wallet_id = w.id AND m.status = 'approved'), 0) AS segun_movimientos
FROM wallets w
WHERE w.balance + w.blocked_balance <> coalesce(
        (SELECT sum(m.amount) FROM wallet_movements m
         WHERE m.wallet_id = w.id AND m.status = 'approved'), 0);
```

Saldo sin movimientos que lo respalden = dinero que apareció de la nada.

---

## Bloque B — Marca de origen en reembolsos (requiere escrow vacío)

Rama: `fix/marca-origen-en-reembolsos`

**Bloqueado hasta que cierren las dos salas de WWE.** Toca
`process-return-refund`, `resolve-appeal` y `accept-mutual-resolution`, que son
justo las que correrían si esas disputas terminan en devolución.

### B1. Confirmar que no queda escrow vivo

```sql
SELECT count(*) FROM transactions
WHERE state IN ('funds_secured','in_delivery','awaiting_buyer_review','return_in_progress');
-- tiene que dar 0
```

### B2. Desplegar

```bash
git checkout fix/marca-origen-en-reembolsos && git rebase origin/main
npm test && npm run build
for f in process-return-refund resolve-appeal accept-mutual-resolution; do
  npx supabase functions deploy $f --project-ref aekzrackrijuxvopqfbp
done
```

### B3. Verificar

Las tres tienen que responder **401** sin auth (cargan bien; un 500 sería error
de módulo). Después mergear a `main`.

---

## Bloque C — Pendientes que necesitan decisión tuya

No están escritos porque dependen de algo que sólo tú puedes responder.

- **Push notifications.** Faltan `VAPID_*` y `FIREBASE_SERVICE_ACCOUNT`. ¿Se
  configuran o se quita la UI que promete algo que no ocurre?
- **Comisión en devoluciones.** Hoy `process-return-refund` le descuenta la
  comisión al comprador aunque el vendedor haya sido el que falló. ¿Es lo que
  quieres?
- **Reconciliar MercadoPago.** Sobran entre $3.551 y $9.742 sin explicar. Hay
  que mirar Actividad en MP contra los IDs `178657433684`, `177685509347`,
  `164141332409`.
- **Rebotes a `admin@trado.cl`.** Revisar los logs de Resend: puede haber
  retiros y verificaciones que nadie atendió porque el aviso nunca llegó.
- **HaveIBeenPwned** en Auth: se activa desde el panel, sin código.

---

## Orden recomendado

1. **Bloque A completo, cuanto antes.** El agujero de acuñación está abierto
   ahora mismo y no depende del escrow vivo.
2. Bloque C, las decisiones, mientras esperas que cierren las salas.
3. Bloque B apenas el escrow quede en cero.
4. Recién ahí, las fases 2 a 6 de [REVISION.md](REVISION.md).
