-- Security fix (C1): commission was calculated in the browser and inserted verbatim
-- by the client (CreateTransaction.tsx). A crafted request could set commission to 0
-- or a negative value; settlement functions trust tx.commission, so a negative value
-- credits the seller MORE than the buyer escrowed — minting money.
--
-- Fix: recompute commission server-side from `amount` on every INSERT/UPDATE via a
-- trigger, ignoring whatever the client supplied. Mirrors the tiered formula in
-- src/lib/utils.ts (calculateOrderDetails):
--   amount <= 400000 : 5%, rounded to nearest 10, floor 1000, cap 20000
--   amount >  400000 : 20000 + 4% of the excess, rounded to nearest 10

CREATE OR REPLACE FUNCTION public.compute_trado_commission(p_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_fee numeric;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN 0;
  END IF;

  IF p_amount <= 400000 THEN
    v_fee := round((p_amount * 0.05) / 10) * 10;
    v_fee := greatest(v_fee, 1000);
    v_fee := least(v_fee, 20000);
  ELSE
    v_fee := round((20000 + (p_amount - 400000) * 0.04) / 10) * 10;
  END IF;

  RETURN v_fee;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_transaction_commission()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'El monto de la transacción debe ser mayor a 0';
  END IF;

  -- Server-side cap. The client also blocks this, but enforce it at the source.
  IF TG_OP = 'INSERT' AND NEW.amount > 2000000 THEN
    RAISE EXCEPTION 'Monto máximo por transacción: $2.000.000 CLP. Contacta a soporte para montos mayores.';
  END IF;

  -- Always overwrite the client-supplied commission with the authoritative value.
  NEW.commission := public.compute_trado_commission(NEW.amount);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_transaction_commission ON public.transactions;
CREATE TRIGGER trg_enforce_transaction_commission
  BEFORE INSERT OR UPDATE OF amount, commission ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_transaction_commission();

-- Defense in depth: reject any negative commission at the storage layer.
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_commission_nonneg;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_commission_nonneg CHECK (commission >= 0);
