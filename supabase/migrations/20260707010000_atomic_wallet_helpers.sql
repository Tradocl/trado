-- Security fix (H2): wallet crediting/blocking used read-modify-write
-- (read balance in JS, compute, write back). Two concurrent settlements on the
-- SAME wallet (e.g. a seller with two sales completing at once, or an MP deposit
-- racing an escrow release) overwrite each other -> lost update -> money vanishes.
--
-- These helpers do the arithmetic inside a single UPDATE. Postgres takes a
-- row-level lock for the duration of the UPDATE, so `balance = balance + delta`
-- is atomic and concurrent calls serialize instead of clobbering each other.

-- Credit (or debit, with a negative delta) a wallet's available balance.
-- Returns the resulting balance. Rejects a debit that would go negative.
CREATE OR REPLACE FUNCTION public.credit_wallet_balance(
  p_wallet_id uuid,
  p_delta numeric
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
      updated_at = now()
  WHERE id = p_wallet_id
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet % not found', p_wallet_id;
  END IF;

  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance for wallet %', p_wallet_id;
  END IF;

  RETURN v_new_balance;
END;
$$;

-- Release blocked (escrow) funds from a wallet, flooring at 0 so a stale/duplicate
-- release can never drive blocked_balance negative. Returns the resulting blocked_balance.
CREATE OR REPLACE FUNCTION public.release_blocked_balance(
  p_wallet_id uuid,
  p_amount numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_blocked numeric;
BEGIN
  UPDATE public.wallets
  SET blocked_balance = greatest(0, coalesce(blocked_balance, 0) - p_amount),
      updated_at = now()
  WHERE id = p_wallet_id
  RETURNING blocked_balance INTO v_new_blocked;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet % not found', p_wallet_id;
  END IF;

  RETURN v_new_blocked;
END;
$$;

-- Move available -> blocked atomically (escrow lock). Fails if available balance
-- is insufficient. Returns the resulting available balance.
CREATE OR REPLACE FUNCTION public.lock_escrow_balance(
  p_wallet_id uuid,
  p_amount numeric
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
  SET balance = balance - p_amount,
      blocked_balance = coalesce(blocked_balance, 0) + p_amount,
      updated_at = now()
  WHERE id = p_wallet_id
    AND balance >= p_amount
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient balance or wallet % not found', p_wallet_id;
  END IF;

  RETURN v_new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_wallet_balance(uuid, numeric) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.release_blocked_balance(uuid, numeric) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.lock_escrow_balance(uuid, numeric) FROM anon, authenticated;
