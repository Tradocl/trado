CREATE OR REPLACE FUNCTION public.prevent_transaction_financial_tampering()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- Permitir al creador cancelar la sala mientras nadie se haya unido
    IF OLD.state = 'created'
       AND NEW.state = 'cancelled'
       AND OLD.buyer_id IS NULL
       AND auth.uid() = OLD.seller_id THEN
      -- permitido
      NULL;
    ELSE
      RAISE EXCEPTION 'No autorizado a modificar state';
    END IF;
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
$function$;