-- Security hardening: prevent privilege escalation via direct table updates
-- Fixes:
--   #1 Users could inflate own wallet balance (RLS without column restriction)
--   #3 Users could self-approve their KYC verification
--   #4 Transaction parties could tamper with amount/commission/state/initiator_role
--   #5 Pending wallet movements could be edited (amount, bank fields)
--   #9 Verification storage bucket lacked size/MIME limits
--
-- Bypass model: service_role (edge functions) and admin role can always update.
-- Regular users have specific allowed transitions only.

-- ============================================================================
-- Helper: detect if current caller is admin or service_role
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin_or_service()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT auth.role()) = 'service_role' THEN
    RETURN TRUE;
  END IF;
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') THEN
    RETURN TRUE;
  END IF;
  RETURN FALSE;
END;
$$;

-- ============================================================================
-- #1: Wallets — drop the user UPDATE policy entirely.
-- Balance mutations MUST go through edge functions (which use service_role).
-- ============================================================================
DROP POLICY IF EXISTS "Users can update own wallet" ON public.wallets;

-- ============================================================================
-- #3: Profiles — prevent users from self-verifying or inflating reputation.
-- Allowed user actions:
--   - Submit KYC (verification_status: NULL/empty → 'in_review')
-- Blocked for non-admin/non-service:
--   - Setting is_verified, jumping verification_status, reputation_score, etc.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin_or_service() THEN
    RETURN NEW;
  END IF;

  -- is_verified can only be set by admin/service
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    RAISE EXCEPTION 'No autorizado a modificar is_verified';
  END IF;

  -- verification_status: only allow first transition to 'in_review'
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF NOT (
      (OLD.verification_status IS NULL OR OLD.verification_status = '' OR OLD.verification_status = 'rejected')
      AND NEW.verification_status = 'in_review'
    ) THEN
      RAISE EXCEPTION 'No autorizado a modificar verification_status';
    END IF;
  END IF;

  -- Reputation and counters are derived/admin-only
  IF NEW.reputation_score IS DISTINCT FROM OLD.reputation_score THEN
    RAISE EXCEPTION 'No autorizado a modificar reputation_score';
  END IF;

  IF NEW.total_transactions IS DISTINCT FROM OLD.total_transactions THEN
    RAISE EXCEPTION 'No autorizado a modificar total_transactions';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation_trg ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- ============================================================================
-- #4: Transactions — prevent users from changing financial fields.
-- State transitions, amount, commission, parties, initiator_role must only
-- be modified by edge functions (service_role) or admin.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.prevent_transaction_financial_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin_or_service() THEN
    RETURN NEW;
  END IF;

  IF NEW.amount IS DISTINCT FROM OLD.amount THEN
    RAISE EXCEPTION 'No autorizado a modificar amount';
  END IF;

  IF NEW.commission IS DISTINCT FROM OLD.commission THEN
    RAISE EXCEPTION 'No autorizado a modificar commission';
  END IF;

  IF NEW.state IS DISTINCT FROM OLD.state THEN
    RAISE EXCEPTION 'No autorizado a modificar state';
  END IF;

  IF NEW.initiator_role IS DISTINCT FROM OLD.initiator_role THEN
    RAISE EXCEPTION 'No autorizado a modificar initiator_role';
  END IF;

  IF NEW.seller_id IS DISTINCT FROM OLD.seller_id THEN
    RAISE EXCEPTION 'No autorizado a modificar seller_id';
  END IF;

  IF NEW.buyer_id IS DISTINCT FROM OLD.buyer_id THEN
    RAISE EXCEPTION 'No autorizado a modificar buyer_id';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_transaction_financial_tampering_trg ON public.transactions;
CREATE TRIGGER prevent_transaction_financial_tampering_trg
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_transaction_financial_tampering();

-- ============================================================================
-- #5: Wallet movements — restrict UPDATE to only canceling pending rows.
-- No financial or bank field changes allowed for regular users.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.prevent_wallet_movement_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin_or_service() THEN
    RETURN NEW;
  END IF;

  IF NEW.amount IS DISTINCT FROM OLD.amount THEN
    RAISE EXCEPTION 'No autorizado a modificar amount del movimiento';
  END IF;

  IF NEW.wallet_id IS DISTINCT FROM OLD.wallet_id THEN
    RAISE EXCEPTION 'No autorizado a modificar wallet_id del movimiento';
  END IF;

  IF NEW.type IS DISTINCT FROM OLD.type THEN
    RAISE EXCEPTION 'No autorizado a modificar type del movimiento';
  END IF;

  IF NEW.balance_after IS DISTINCT FROM OLD.balance_after THEN
    RAISE EXCEPTION 'No autorizado a modificar balance_after';
  END IF;

  IF COALESCE(NEW.bank_holder_name, '') IS DISTINCT FROM COALESCE(OLD.bank_holder_name, '')
     OR COALESCE(NEW.bank_holder_rut, '') IS DISTINCT FROM COALESCE(OLD.bank_holder_rut, '')
     OR COALESCE(NEW.bank_name, '') IS DISTINCT FROM COALESCE(OLD.bank_name, '')
     OR COALESCE(NEW.bank_account_type, '') IS DISTINCT FROM COALESCE(OLD.bank_account_type, '')
     OR COALESCE(NEW.bank_account_number, '') IS DISTINCT FROM COALESCE(OLD.bank_account_number, '') THEN
    RAISE EXCEPTION 'No autorizado a modificar datos bancarios del movimiento';
  END IF;

  -- Status: only allow pending -> cancelled
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (OLD.status = 'pending' AND NEW.status = 'cancelled') THEN
      RAISE EXCEPTION 'Solo puedes cancelar movimientos pendientes';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_wallet_movement_tampering_trg ON public.wallet_movements;
CREATE TRIGGER prevent_wallet_movement_tampering_trg
  BEFORE UPDATE ON public.wallet_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_wallet_movement_tampering();

-- Also enforce on INSERT: bank_holder_rut must match the profile's rut.
CREATE OR REPLACE FUNCTION public.enforce_withdrawal_bank_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wallet_owner uuid;
  owner_rut text;
  normalized_owner_rut text;
  normalized_bank_rut text;
BEGIN
  IF public.is_admin_or_service() THEN
    RETURN NEW;
  END IF;

  IF NEW.type = 'withdrawal' AND NEW.bank_holder_rut IS NOT NULL THEN
    SELECT user_id INTO wallet_owner FROM public.wallets WHERE id = NEW.wallet_id;
    SELECT rut INTO owner_rut FROM public.profiles WHERE id = wallet_owner;

    IF owner_rut IS NULL THEN
      RAISE EXCEPTION 'Completa tu RUT antes de solicitar retiros';
    END IF;

    normalized_owner_rut := UPPER(REGEXP_REPLACE(owner_rut, '[.\-\s]', '', 'g'));
    normalized_bank_rut := UPPER(REGEXP_REPLACE(NEW.bank_holder_rut, '[.\-\s]', '', 'g'));

    IF normalized_owner_rut <> normalized_bank_rut THEN
      RAISE EXCEPTION 'El RUT de la cuenta bancaria debe coincidir con el RUT de tu perfil';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_withdrawal_bank_owner_trg ON public.wallet_movements;
CREATE TRIGGER enforce_withdrawal_bank_owner_trg
  BEFORE INSERT ON public.wallet_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_withdrawal_bank_owner();

-- ============================================================================
-- #9: Storage bucket — set size and MIME type limits for KYC uploads.
-- ============================================================================
UPDATE storage.buckets
SET
  file_size_limit = 10485760,  -- 10 MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
WHERE id = 'verification-documents';
