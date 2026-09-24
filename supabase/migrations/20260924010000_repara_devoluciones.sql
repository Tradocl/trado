-- Repara el flujo de devoluciones, que estaba roto por los dos lados.
--
-- 1. Comprador y vendedor: la app cambia return_requests.status desde el
--    navegador (aceptar, rechazar, marcar el envío de vuelta) y el trigger
--    prevent_return_request_tampering prohibía TODO cambio de status a usuarios.
--    Ningún paso de una devolución podía avanzar.
-- 2. Admin: la mediación actualiza return_requests y transactions, pero no había
--    política de UPDATE de admin en ninguna de las dos. La decisión "se guardaba"
--    afectando cero filas, sin error.
--
-- Mismo patrón que 20260924000000: el usuario puede dar exactamente los pasos
-- que la app da, sólo quien le corresponde, y nada más.

CREATE OR REPLACE FUNCTION public.prevent_return_request_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx_seller uuid;
  tx_buyer uuid;
  tx_state text;
BEGIN
  IF public.is_admin_or_service() THEN
    RETURN NEW;
  END IF;

  SELECT seller_id, buyer_id, state::text INTO tx_seller, tx_buyer, tx_state
  FROM public.transactions WHERE id = NEW.transaction_id;

  -- ----- Crear la solicitud (ReturnRequestDialog)
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS DISTINCT FROM tx_buyer OR NEW.requester_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Sólo el comprador puede pedir una devolución';
    END IF;
    IF tx_state NOT IN ('in_delivery', 'awaiting_buyer_review') THEN
      RAISE EXCEPTION 'La devolución se pide antes de confirmar la recepción';
    END IF;
    -- Si el comprador asume la culpa, la devolución parte aceptada y él paga el
    -- envío. Si no, queda pendiente de la respuesta del vendedor. Nada más:
    -- antes se podía crear ya "enviada" y saltarse al vendedor.
    IF NEW.responsibility_type = 'buyer_fault' THEN
      NEW.status := 'accepted';
      NEW.seller_response := 'accepted';
      NEW.shipping_paid_by := 'buyer';
    ELSE
      NEW.status := 'pending';
      NEW.seller_response := 'pending';
      NEW.shipping_paid_by := NULL;
    END IF;
    NEW.tracking_number := NULL;
    NEW.carrier := NULL;
    NEW.shipped_at := NULL;
    NEW.received_at := NULL;
    NEW.admin_notes := NULL;
    NEW.mediated_by := NULL;
    NEW.mediated_at := NULL;
    RETURN NEW;
  END IF;

  -- ----- Cambios: lo que nunca cambia un usuario
  IF NEW.requester_id IS DISTINCT FROM OLD.requester_id
     OR NEW.transaction_id IS DISTINCT FROM OLD.transaction_id
     OR NEW.reason IS DISTINCT FROM OLD.reason
     OR NEW.reason_description IS DISTINCT FROM OLD.reason_description
     OR COALESCE(NEW.responsibility_type,'') IS DISTINCT FROM COALESCE(OLD.responsibility_type,'')
     OR NEW.received_at IS DISTINCT FROM OLD.received_at
     OR NEW.mediated_by IS DISTINCT FROM OLD.mediated_by
     OR NEW.mediated_at IS DISTINCT FROM OLD.mediated_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'No autorizado a modificar la devolución';
  END IF;

  -- ----- Vendedor acepta (ReturnSellerResponsePanel): él paga el envío de vuelta.
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    IF auth.uid() IS DISTINCT FROM tx_seller THEN
      RAISE EXCEPTION 'Sólo el vendedor puede aceptar la devolución';
    END IF;
    NEW.seller_response := 'accepted';
    NEW.shipping_paid_by := 'seller';
    NEW.admin_notes := OLD.admin_notes;
    NEW.tracking_number := OLD.tracking_number;
    NEW.carrier := OLD.carrier;
    NEW.shipped_at := OLD.shipped_at;
    RETURN NEW;
  END IF;

  -- ----- Vendedor rechaza: pasa a mediación con su motivo en admin_notes.
  IF OLD.status = 'pending' AND NEW.status = 'disputed' THEN
    IF auth.uid() IS DISTINCT FROM tx_seller THEN
      RAISE EXCEPTION 'Sólo el vendedor puede rechazar la devolución';
    END IF;
    NEW.seller_response := 'rejected';
    NEW.shipping_paid_by := OLD.shipping_paid_by;
    NEW.tracking_number := OLD.tracking_number;
    NEW.carrier := OLD.carrier;
    NEW.shipped_at := OLD.shipped_at;
    RETURN NEW;
  END IF;

  -- ----- Comprador despacha de vuelta (ReturnStatusPanel).
  IF OLD.status = 'accepted' AND NEW.status = 'shipped' THEN
    IF auth.uid() IS DISTINCT FROM tx_buyer THEN
      RAISE EXCEPTION 'Sólo el comprador registra el envío de vuelta';
    END IF;
    IF coalesce(trim(NEW.tracking_number), '') = '' OR coalesce(trim(NEW.carrier), '') = '' THEN
      RAISE EXCEPTION 'Falta el número de seguimiento o la empresa de envío';
    END IF;
    NEW.shipped_at := now();
    NEW.seller_response := OLD.seller_response;
    NEW.shipping_paid_by := OLD.shipping_paid_by;
    NEW.admin_notes := OLD.admin_notes;
    RETURN NEW;
  END IF;

  -- ----- Cualquier otro cambio de estado lo hace el servidor o un admin
  --       (recibir y reembolsar es process-return-refund; mediar es el panel).
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'No autorizado a cambiar la devolución de % a %', OLD.status, NEW.status;
  END IF;
  IF COALESCE(NEW.seller_response,'') IS DISTINCT FROM COALESCE(OLD.seller_response,'')
     OR COALESCE(NEW.shipping_paid_by,'') IS DISTINCT FROM COALESCE(OLD.shipping_paid_by,'')
     OR COALESCE(NEW.admin_notes,'') IS DISTINCT FROM COALESCE(OLD.admin_notes,'')
     OR COALESCE(NEW.tracking_number,'') IS DISTINCT FROM COALESCE(OLD.tracking_number,'')
     OR COALESCE(NEW.carrier,'') IS DISTINCT FROM COALESCE(OLD.carrier,'')
     OR NEW.shipped_at IS DISTINCT FROM OLD.shipped_at THEN
    RAISE EXCEPTION 'No autorizado a modificar la devolución';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_return_request_tampering_trg ON public.return_requests;
CREATE TRIGGER prevent_return_request_tampering_trg
  BEFORE INSERT OR UPDATE ON public.return_requests
  FOR EACH ROW EXECUTE FUNCTION public.prevent_return_request_tampering();

-- La mediación del admin (AdminReturnRoom / AdminAppeal) necesita poder escribir.
DROP POLICY IF EXISTS "Admins can update return requests" ON public.return_requests;
CREATE POLICY "Admins can update return requests" ON public.return_requests
  FOR UPDATE TO authenticated
  USING (public.is_admin_mfa())
  WITH CHECK (public.is_admin_mfa());

DROP POLICY IF EXISTS "Admins can update transactions" ON public.transactions;
CREATE POLICY "Admins can update transactions" ON public.transactions
  FOR UPDATE TO authenticated
  USING (public.is_admin_mfa())
  WITH CHECK (public.is_admin_mfa());
