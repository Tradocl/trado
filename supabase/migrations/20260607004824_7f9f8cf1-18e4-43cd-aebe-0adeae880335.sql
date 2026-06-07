CREATE OR REPLACE FUNCTION public.prevent_transaction_financial_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_seller boolean := auth.uid() = OLD.seller_id;
  is_buyer  boolean := auth.uid() = OLD.buyer_id;
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
    -- Vendedor puede cancelar sala vacía
    IF OLD.state = 'created' AND NEW.state = 'cancelled' AND OLD.buyer_id IS NULL AND is_seller THEN
      NULL;
    -- Vendedor marca producto como enviado / en entrega
    ELSIF OLD.state = 'funds_secured' AND NEW.state = 'in_delivery' AND is_seller THEN
      NULL;
    -- Vendedor pasa a esperar revisión del comprador (entrega marcada)
    ELSIF OLD.state IN ('funds_secured','in_delivery') AND NEW.state = 'awaiting_buyer_review' AND is_seller THEN
      NULL;
    -- Comprador confirma recepción → completada
    ELSIF OLD.state IN ('in_delivery','awaiting_buyer_review','funds_secured') AND NEW.state = 'completed' AND is_buyer THEN
      NULL;
    -- Comprador solicita devolución
    ELSIF OLD.state IN ('in_delivery','awaiting_buyer_review') AND NEW.state = 'return_requested' AND is_buyer THEN
      NULL;
    -- Vendedor/comprador avanzan devolución
    ELSIF OLD.state = 'return_requested' AND NEW.state = 'return_in_progress' AND (is_seller OR is_buyer) THEN
      NULL;
    -- Disputa: cualquiera de las partes puede abrirla
    ELSIF NEW.state = 'in_dispute' AND (is_seller OR is_buyer) THEN
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