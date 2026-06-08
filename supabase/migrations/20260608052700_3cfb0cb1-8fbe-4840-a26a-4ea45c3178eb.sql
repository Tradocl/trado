CREATE OR REPLACE FUNCTION public.prevent_transaction_financial_tampering()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_seller boolean := auth.uid() = OLD.seller_id;
  is_buyer  boolean := auth.uid() = OLD.buyer_id;
  is_joining_seller_created boolean := false;
  is_joining_buyer_created boolean := false;
BEGIN
  IF public.is_admin_or_service() THEN
    RETURN NEW;
  END IF;

  is_joining_seller_created :=
    OLD.state = 'created'
    AND NEW.state = 'invited'
    AND COALESCE(OLD.initiator_role, 'seller') = 'seller'
    AND OLD.buyer_id IS NULL
    AND NEW.seller_id IS NOT DISTINCT FROM OLD.seller_id
    AND NEW.buyer_id = auth.uid()
    AND auth.uid() <> OLD.seller_id;

  is_joining_buyer_created :=
    OLD.state = 'created'
    AND NEW.state = 'invited'
    AND OLD.initiator_role = 'buyer'
    AND OLD.buyer_id IS NULL
    AND NEW.buyer_id IS NOT DISTINCT FROM OLD.seller_id
    AND NEW.seller_id = auth.uid()
    AND auth.uid() <> OLD.seller_id;

  IF NEW.amount IS DISTINCT FROM OLD.amount THEN
    RAISE EXCEPTION 'No autorizado a modificar amount';
  END IF;
  IF NEW.commission IS DISTINCT FROM OLD.commission THEN
    RAISE EXCEPTION 'No autorizado a modificar commission';
  END IF;

  IF NEW.state IS DISTINCT FROM OLD.state THEN
    IF is_joining_seller_created OR is_joining_buyer_created THEN
      NULL;
    ELSIF OLD.state = 'created' AND NEW.state = 'cancelled' AND OLD.buyer_id IS NULL AND is_seller THEN
      NULL;
    ELSIF OLD.state = 'funds_secured' AND NEW.state = 'in_delivery' AND is_seller THEN
      NULL;
    ELSIF OLD.state IN ('funds_secured','in_delivery') AND NEW.state = 'awaiting_buyer_review' AND (is_seller OR is_buyer) THEN
      NULL;
    ELSIF OLD.state IN ('in_delivery','awaiting_buyer_review','funds_secured') AND NEW.state = 'completed' AND is_buyer THEN
      NULL;
    ELSIF OLD.state IN ('in_delivery','awaiting_buyer_review') AND NEW.state = 'return_requested' AND is_buyer THEN
      NULL;
    ELSIF OLD.state = 'return_requested' AND NEW.state = 'return_in_progress' AND (is_seller OR is_buyer) THEN
      NULL;
    ELSIF NEW.state = 'in_dispute' AND (is_seller OR is_buyer) THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'No autorizado a modificar state (de % a %)', OLD.state, NEW.state;
    END IF;
  END IF;

  IF NEW.initiator_role IS DISTINCT FROM OLD.initiator_role THEN
    RAISE EXCEPTION 'No autorizado a modificar initiator_role';
  END IF;

  IF NOT (is_joining_seller_created OR is_joining_buyer_created) THEN
    IF NEW.seller_id IS DISTINCT FROM OLD.seller_id THEN
      RAISE EXCEPTION 'No autorizado a modificar seller_id';
    END IF;
    IF NEW.buyer_id IS DISTINCT FROM OLD.buyer_id THEN
      RAISE EXCEPTION 'No autorizado a modificar buyer_id';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;