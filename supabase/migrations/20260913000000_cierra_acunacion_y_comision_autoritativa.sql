-- ============================================================================
-- C1 — Cierra la acuñación de dinero por cualquiera
-- ============================================================================
--
-- credit_wallet_balance(wallet_id, delta) es SECURITY DEFINER, no tiene ninguna
-- guarda interna, y el rol anon podía ejecutarla vía /rest/v1/rpc. La anon key
-- está en el bundle público del frontend, así que el camino
--   acreditarse saldo arbitrario -> pedir retiro
-- estaba abierto a cualquiera.
--
-- Las migraciones anteriores intentaron cerrarlo con
--   REVOKE ALL ON FUNCTION ... FROM anon, authenticated;
-- y eso NUNCA funcionó: Postgres otorga EXECUTE a PUBLIC por defecto en toda
-- función nueva, y revocar de anon/authenticated no quita ese grant — ambos
-- roles lo siguen heredando de PUBLIC. Hay que revocar de PUBLIC.
--
-- Estas seis las llaman sólo las Edge Functions con service_role, que no pasa
-- por estos permisos. Revocarlas no rompe nada del frontend.

REVOKE EXECUTE ON FUNCTION public.credit_wallet_balance(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.credit_wallet_balance_with_origin(uuid, numeric, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_blocked_balance(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lock_escrow_balance(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_gateway_funded(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restore_gateway_funded(uuid, numeric) FROM PUBLIC, anon, authenticated;

-- NO se tocan las que el frontend llama con el JWT del usuario:
--   admin_approve_movement (se autochequea admin por dentro)
--   get_safe_profile, get_transaction_preview
--   find_transaction_by_invite_code, generate_invite_code

-- ============================================================================
-- C2 — Una sola autoridad para el precio
-- ============================================================================
--
-- trg_enforce_transaction_commission sobreescribía commission en CADA insert y
-- update, sin eximir a service_role. Eso pisaba lo que calcula
-- process-escrow-deposit, así que las dos tarifas (tarjeta vs transferencia) y
-- la mezcla por origen del dinero no se estaban aplicando nunca.
--
-- El reparto de autoridad que queda:
--
--   INSERT (cliente crea la sala)  -> manda el trigger. El cliente no puede
--                                     inventarse una comisión.
--   UPDATE desde service_role      -> manda la Edge Function. Es la única que
--                                     sabe con qué plata se financió.
--   UPDATE desde cualquier otro    -> manda el trigger.
--
-- El trigger deja de ser la autoridad y pasa a ser el piso de seguridad, que es
-- el rol que le corresponde.

CREATE OR REPLACE FUNCTION public.enforce_transaction_commission()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public   -- antes era mutable (lint 0011)
AS $$
BEGIN
  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'El monto de la transacción debe ser mayor a 0';
  END IF;

  IF TG_OP = 'INSERT' AND NEW.amount > 2000000 THEN
    RAISE EXCEPTION 'Monto máximo por transacción: $2.000.000 CLP. Contacta a soporte para montos mayores.';
  END IF;

  -- process-escrow-deposit fija la comisión definitiva al asegurar los fondos,
  -- mezclando tarifa de tarjeta y de transferencia según el origen del saldo.
  -- Sólo el servidor puede hacerlo; para todos los demás se recalcula.
  IF TG_OP = 'UPDATE' AND public.is_admin_or_service() THEN
    RETURN NEW;
  END IF;

  NEW.commission := public.compute_trado_commission(NEW.amount);

  RETURN NEW;
END;
$$;

-- La cotización inicial pasa a ser la tarifa de tarjeta: 5% plano, mínimo
-- $1.000, sin tope. Es el caso más caro, así que si después se financia con
-- plata limpia la comisión sólo puede BAJAR. Al revés sería mostrarle al
-- usuario un precio y cobrarle más.
--
-- Espejo de GATEWAY_RATE en src/lib/utils.ts y en
-- supabase/functions/_shared/pricing.ts. Si cambia una, cambian las tres.
CREATE OR REPLACE FUNCTION public.compute_trado_commission(p_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public   -- antes era mutable (lint 0011)
AS $$
DECLARE
  v_fee numeric;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN 0;
  END IF;

  v_fee := round((p_amount * 0.05) / 10) * 10;
  RETURN greatest(v_fee, 1000);
END;
$$;

-- ============================================================================
-- C3 — search_path mutable en el trigger de push
-- ============================================================================

ALTER FUNCTION public.update_push_subscription_timestamp() SET search_path = public;
