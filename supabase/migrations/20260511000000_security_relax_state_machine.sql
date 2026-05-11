-- URGENT FIX: previous security migration (20260510230000) was too strict
-- and blocked legitimate user actions:
--   - handleJoin (sets buyer_id, state)
--   - handleMarkAsShipped (state)
--   - handleMarkAsReceived (state)
--   - handleCancelTransaction (state)
--   - handleOpenDispute (state)
--   - return request flows (state)
--   - editing pending withdrawals (amount, bank fields)
--
-- This migration replaces the triggers with state-machine logic that
-- allows specific transitions while still blocking financial tampering.

-- ============================================================================
-- Transactions: replace function with state-machine that allows legitimate transitions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.prevent_transaction_financial_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid;
  is_participant boolean;
BEGIN
  IF public.is_admin_or_service() THEN
    RETURN NEW;
  END IF;

  caller := auth.uid();
  is_participant := (caller = OLD.seller_id OR caller = OLD.buyer_id);

  -- Financial fields are ALWAYS immutable for non-admin users
  IF NEW.amount IS DISTINCT FROM OLD.amount THEN
    RAISE EXCEPTION 'No autorizado a modificar amount';
  END IF;

  IF NEW.commission IS DISTINCT FROM OLD.commission THEN
    RAISE EXCEPTION 'No autorizado a modificar commission';
  END IF;

  IF NEW.initiator_role IS DISTINCT FROM OLD.initiator_role THEN
    RAISE EXCEPTION 'No autorizado a modificar initiator_role';
  END IF;

  -- seller_id / buyer_id: only allow filling NULL → a value (the join flow)
  IF NEW.seller_id IS DISTINCT FROM OLD.seller_id THEN
    IF OLD.seller_id IS NOT NULL THEN
      RAISE EXCEPTION 'No autorizado a cambiar seller_id de una transacción ya asignada';
    END IF;
    -- New value must be the caller (you can only put yourself as seller)
    IF NEW.seller_id <> caller THEN
      RAISE EXCEPTION 'Solo puedes unirte como vendedor a ti mismo';
    END IF;
  END IF;

  IF NEW.buyer_id IS DISTINCT FROM OLD.buyer_id THEN
    IF OLD.buyer_id IS NOT NULL THEN
      RAISE EXCEPTION 'No autorizado a cambiar buyer_id de una transacción ya asignada';
    END IF;
    IF NEW.buyer_id <> caller THEN
      RAISE EXCEPTION 'Solo puedes unirte como comprador a ti mismo';
    END IF;
  END IF;

  -- State transitions: block end states that move money (only edge functions do these)
  IF NEW.state IS DISTINCT FROM OLD.state THEN
    -- Terminal/money-moving states are forbidden for users
    IF NEW.state IN ('completed', 'refunded', 'resolved') THEN
      RAISE EXCEPTION 'No autorizado a marcar transacción como % directamente', NEW.state;
    END IF;

    -- Only participants of the transaction can change state
    IF NOT is_participant AND OLD.buyer_id IS NOT NULL AND OLD.seller_id IS NOT NULL THEN
      RAISE EXCEPTION 'Solo participantes pueden modificar el estado';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- Wallet movements: allow full edit of own PENDING rows.
-- Bank RUT match is still enforced via the INSERT trigger.
-- Once status moves away from pending, fields are locked.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.prevent_wallet_movement_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid;
  is_owner boolean;
BEGIN
  IF public.is_admin_or_service() THEN
    RETURN NEW;
  END IF;

  caller := auth.uid();
  SELECT EXISTS(
    SELECT 1 FROM public.wallets
    WHERE id = OLD.wallet_id AND user_id = caller
  ) INTO is_owner;

  IF NOT is_owner THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- If the movement is no longer pending, nothing can change
  IF OLD.status <> 'pending' THEN
    RAISE EXCEPTION 'No puedes modificar un movimiento que ya no está pendiente';
  END IF;

  -- For pending rows, allow edits except: changing wallet_id, type, or balance_after
  IF NEW.wallet_id IS DISTINCT FROM OLD.wallet_id THEN
    RAISE EXCEPTION 'No autorizado a cambiar la billetera del movimiento';
  END IF;

  IF NEW.type IS DISTINCT FROM OLD.type THEN
    RAISE EXCEPTION 'No autorizado a cambiar el tipo del movimiento';
  END IF;

  IF NEW.balance_after IS DISTINCT FROM OLD.balance_after THEN
    RAISE EXCEPTION 'No autorizado a cambiar balance_after';
  END IF;

  -- Status transitions: only allow staying pending or moving to cancelled
  IF NEW.status NOT IN ('pending', 'cancelled') THEN
    RAISE EXCEPTION 'Solo puedes mantener pendiente o cancelar';
  END IF;

  -- Re-validate bank RUT match if user changed bank_holder_rut on a withdrawal
  IF NEW.type = 'withdrawal' AND NEW.bank_holder_rut IS NOT NULL
     AND NEW.bank_holder_rut IS DISTINCT FROM OLD.bank_holder_rut THEN
    DECLARE
      wallet_owner uuid;
      owner_rut text;
      normalized_owner_rut text;
      normalized_bank_rut text;
    BEGIN
      SELECT user_id INTO wallet_owner FROM public.wallets WHERE id = NEW.wallet_id;
      SELECT rut INTO owner_rut FROM public.profiles WHERE id = wallet_owner;
      normalized_owner_rut := UPPER(REGEXP_REPLACE(COALESCE(owner_rut, ''), '[.\-\s]', '', 'g'));
      normalized_bank_rut := UPPER(REGEXP_REPLACE(NEW.bank_holder_rut, '[.\-\s]', '', 'g'));
      IF normalized_owner_rut <> normalized_bank_rut THEN
        RAISE EXCEPTION 'El RUT bancario debe coincidir con el RUT de tu perfil';
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$;
