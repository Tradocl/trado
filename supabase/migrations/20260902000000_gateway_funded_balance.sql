-- Origen del saldo, para cobrar la comisión correcta en cada sala.
--
-- El saldo de la billetera es fungible: una vez adentro no se distingue qué
-- peso entró por tarjeta y cuál por transferencia. Eso importa porque la
-- comisión depende del medio: la tarjeta paga 5% (Trado ya le pagó ~3,6% a
-- MercadoPago) y la transferencia paga la escala barata (3,5%/3%/2,5%), donde
-- lo cobrado es lo ganado.
--
-- Sin esta marca, cualquiera podía depositar con tarjeta y pagar la sala a
-- tarifa de transferencia, dejando a Trado bajo costo:
--   deposita $1.000.000 con tarjeta -> Trado paga $36.000 a MercadoPago
--   paga la sala a tarifa transferencia -> Trado cobra $32.000
--   resultado: -$4.000
--
-- gateway_funded_balance lleva cuánto del saldo actual llegó por pasarela y
-- todavía no se ha gastado. Al financiar una sala se consumen PRIMERO esos
-- pesos, que pagan tarifa de tarjeta. La marca se agota al gastarse, y la plata
-- que entra por una venta o un reembolso nunca la lleva porque nunca pasó por
-- la pasarela.

ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS gateway_funded_balance numeric(12,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.wallets.gateway_funded_balance IS
  'Parte del saldo que entró por pasarela de pago y aún no se gasta. Se consume primero al financiar una sala y paga tarifa de tarjeta.';

-- Cuánta plata marcada consumió cada sala, para poder devolver la marca si la
-- transacción se cancela y el dinero vuelve al saldo disponible.
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS gateway_funded_used numeric(12,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.transactions.gateway_funded_used IS
  'Pesos con marca de pasarela consumidos al asegurar fondos. Se restituyen a la billetera si la sala se cancela.';

-- El saldo marcado nunca puede superar al saldo real ni ser negativo.
ALTER TABLE public.wallets
  DROP CONSTRAINT IF EXISTS wallets_gateway_funded_range;

ALTER TABLE public.wallets
  ADD CONSTRAINT wallets_gateway_funded_range
  CHECK (gateway_funded_balance >= 0);

-- Backfill conservador: el saldo existente se marca como de pasarela.
-- Hasta hoy prácticamente todo entró por MercadoPago, y errar hacia la tarifa
-- cara evita cobrar de menos sobre plata que ya costó comisión de procesador.
UPDATE public.wallets
SET gateway_funded_balance = COALESCE(balance, 0)
WHERE gateway_funded_balance = 0
  AND COALESCE(balance, 0) > 0;

-- Acreditar marcando el origen, en la misma transacción que el saldo.
-- Hacerlo en dos UPDATE separados dejaría una ventana donde el saldo ya subió
-- pero la marca no, y una sala financiada justo ahí pagaría tarifa barata sobre
-- plata de tarjeta.
CREATE OR REPLACE FUNCTION public.credit_wallet_balance_with_origin(
  p_wallet_id uuid,
  p_delta numeric,
  p_from_gateway boolean
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance numeric;
BEGIN
  UPDATE public.wallets
  SET balance = balance + p_delta,
      gateway_funded_balance = gateway_funded_balance
        + CASE WHEN p_from_gateway THEN p_delta ELSE 0 END,
      updated_at = now()
  WHERE id = p_wallet_id
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet % no existe', p_wallet_id;
  END IF;

  RETURN v_new_balance;
END;
$$;

-- Consumir marca al financiar una sala. Devuelve cuántos pesos marcados se
-- usaron, que es lo que define la mezcla de tarifas de esa sala.
CREATE OR REPLACE FUNCTION public.consume_gateway_funded(
  p_wallet_id uuid,
  p_amount numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used numeric;
BEGIN
  -- FOR UPDATE: dos salas financiadas a la vez no pueden consumir la misma marca.
  SELECT LEAST(gateway_funded_balance, GREATEST(p_amount, 0))
  INTO v_used
  FROM public.wallets
  WHERE id = p_wallet_id
  FOR UPDATE;

  IF v_used IS NULL THEN
    RAISE EXCEPTION 'Wallet % no existe', p_wallet_id;
  END IF;

  UPDATE public.wallets
  SET gateway_funded_balance = gateway_funded_balance - v_used,
      updated_at = now()
  WHERE id = p_wallet_id;

  RETURN v_used;
END;
$$;

-- Devolver la marca cuando una sala se cancela y la plata vuelve al saldo.
CREATE OR REPLACE FUNCTION public.restore_gateway_funded(
  p_wallet_id uuid,
  p_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(p_amount, 0) <= 0 THEN
    RETURN;
  END IF;

  UPDATE public.wallets
  SET gateway_funded_balance = LEAST(
        gateway_funded_balance + p_amount,
        GREATEST(balance, 0)
      ),
      updated_at = now()
  WHERE id = p_wallet_id;
END;
$$;

-- Sólo servidor: nunca desde el navegador.
REVOKE ALL ON FUNCTION public.credit_wallet_balance_with_origin(uuid, numeric, boolean) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_gateway_funded(uuid, numeric) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.restore_gateway_funded(uuid, numeric) FROM anon, authenticated;
