-- Límites de usuario no verificado, ahora exigidos por la base.
--
-- Hasta hoy vivían SÓLO en el frontend (src/lib/transaction-limits.ts). Eran
-- decorativos: cualquiera que llamara /rest/v1/transactions directo con su
-- propia anon key los saltaba completos. Para una fintech ese límite es parte
-- del control de riesgo, no una sugerencia de interfaz.
--
-- Valores subidos el 2026-09-19 tras ver los tickets reales:
--   por transacción   $100.000 -> $250.000
--   acumulado         $200.000 -> $500.000
--
-- Con los viejos, dos compras de $100.000 ya topaban el acumulado y obligaban a
-- verificar en mitad de la operación, que es el peor momento para pedir papeles.
--
-- ⚠️ ESPEJO de UNVERIFIED_LIMITS en src/lib/transaction-limits.ts.

CREATE OR REPLACE FUNCTION public.unverified_limit_per_transaction()
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path = public
AS $$ SELECT 250000::numeric $$;

CREATE OR REPLACE FUNCTION public.unverified_limit_accumulated()
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path = public
AS $$ SELECT 500000::numeric $$;

-- to_char usa el separador de la locale y salía "$250,000" con coma, que en
-- Chile se lee mal. Esto fuerza el punto como separador de miles.
CREATE OR REPLACE FUNCTION public.formato_clp(p_monto numeric)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public
AS $fn$ SELECT replace(to_char(round(p_monto), 'FM999G999G999'), ',', '.') $fn$;

CREATE OR REPLACE FUNCTION public.enforce_unverified_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creador uuid;
  v_verificado boolean;
  v_acumulado numeric;
  v_tope_tx numeric := public.unverified_limit_per_transaction();
  v_tope_acum numeric := public.unverified_limit_accumulated();
BEGIN
  -- El servidor y los admins no pasan por acá: mueven plata en nombre de la
  -- plataforma, no como usuarios.
  IF public.is_admin_or_service() THEN
    RETURN NEW;
  END IF;

  v_creador := COALESCE(auth.uid(), NEW.seller_id, NEW.buyer_id);
  IF v_creador IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(is_verified, false) INTO v_verificado
  FROM public.profiles WHERE id = v_creador;

  -- Verificado no tiene tope.
  IF COALESCE(v_verificado, false) THEN
    RETURN NEW;
  END IF;

  IF NEW.amount > v_tope_tx THEN
    RAISE EXCEPTION
      'Sin verificar identidad el máximo por transacción es $%. Verifica tu identidad para montos mayores.',
      public.formato_clp(v_tope_tx);
  END IF;

  -- Cuenta todo lo que no esté cancelado, no sólo lo completado: si contara
  -- sólo lo cerrado, se podrían abrir varias salas a la vez y superar el tope
  -- entre todas sin que ninguna lo supere por sí sola.
  SELECT COALESCE(sum(amount), 0) INTO v_acumulado
  FROM public.transactions
  WHERE state <> 'cancelled'
    AND (seller_id = v_creador OR buyer_id = v_creador)
    AND id IS DISTINCT FROM NEW.id;

  IF v_acumulado + NEW.amount > v_tope_acum THEN
    RAISE EXCEPTION
      'Sin verificar identidad el límite acumulado es $%. Llevas $% en operaciones activas. Verifica tu identidad para continuar.',
      public.formato_clp(v_tope_acum),
      public.formato_clp(v_acumulado);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_unverified_limits ON public.transactions;

CREATE TRIGGER trg_enforce_unverified_limits
  BEFORE INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_unverified_limits();

REVOKE EXECUTE ON FUNCTION public.enforce_unverified_limits() FROM PUBLIC, anon, authenticated;
