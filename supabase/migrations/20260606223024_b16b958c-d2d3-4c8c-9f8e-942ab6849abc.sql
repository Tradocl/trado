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
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    RAISE EXCEPTION 'No autorizado a modificar is_verified';
  END IF;
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF NOT (
      (OLD.verification_status IS NULL OR OLD.verification_status = '' OR OLD.verification_status = 'pending' OR OLD.verification_status = 'rejected')
      AND NEW.verification_status = 'in_review'
    ) THEN
      RAISE EXCEPTION 'No autorizado a modificar verification_status';
    END IF;
  END IF;
  IF NEW.reputation_score IS DISTINCT FROM OLD.reputation_score THEN
    RAISE EXCEPTION 'No autorizado a modificar reputation_score';
  END IF;
  IF NEW.total_transactions IS DISTINCT FROM OLD.total_transactions THEN
    RAISE EXCEPTION 'No autorizado a modificar total_transactions';
  END IF;
  RETURN NEW;
END;
$$;