-- Make admin movement-approval atomic and authorization-safe.
--
-- The client (Admin.tsx) previously did claim -> credit -> finalize as separate
-- writes under the admin's JWT (non-atomic; H1). The low-level credit_wallet_balance
-- helper is (correctly) revoked from authenticated, so the client can't call it
-- directly. This RPC wraps the whole approval in ONE transaction, guarded by an
-- admin-role check, and is safe to grant to authenticated.

CREATE OR REPLACE FUNCTION public.admin_approve_movement(p_movement_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_mov public.wallet_movements%ROWTYPE;
  v_delta numeric;
  v_new_balance numeric;
BEGIN
  IF v_caller IS NULL OR NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Lock the movement row; it must still be pending (idempotency).
  SELECT * INTO v_mov FROM public.wallet_movements
    WHERE id = p_movement_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Movimiento no encontrado';
  END IF;
  IF v_mov.status <> 'pending' THEN
    RAISE EXCEPTION 'Este movimiento ya fue procesado';
  END IF;
  IF v_mov.type NOT IN ('deposit', 'withdrawal') THEN
    RAISE EXCEPTION 'Tipo de movimiento no aprobable: %', v_mov.type;
  END IF;

  v_delta := CASE WHEN v_mov.type = 'deposit' THEN v_mov.amount ELSE -v_mov.amount END;

  -- Atomic balance change (row is locked for the duration of this transaction).
  UPDATE public.wallets
    SET balance = balance + v_delta,
        updated_at = now()
    WHERE id = v_mov.wallet_id
    RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Billetera no encontrada';
  END IF;
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Saldo insuficiente para aprobar el retiro';
  END IF;

  UPDATE public.wallet_movements
    SET status = 'approved',
        reviewed_by = v_caller,
        reviewed_at = now(),
        balance_after = v_new_balance
    WHERE id = p_movement_id;

  RETURN jsonb_build_object(
    'new_balance', v_new_balance,
    'type', v_mov.type,
    'amount', v_mov.amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_movement(uuid) TO authenticated;
