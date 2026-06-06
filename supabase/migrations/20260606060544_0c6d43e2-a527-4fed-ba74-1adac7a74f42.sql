
-- 1. Tighten transactions buyer-join policy
DROP POLICY IF EXISTS "Authenticated users can join as buyer when slot is empty" ON public.transactions;

CREATE POLICY "Authenticated users can join as buyer when slot is empty"
ON public.transactions
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND buyer_id IS NULL
  AND state = 'created'::transaction_state
)
WITH CHECK (
  buyer_id = auth.uid()
  AND state = 'created'::transaction_state
);

-- 2. Tighten wallet_movements INSERT policy with type restriction
DROP POLICY IF EXISTS "Users can create own wallet movements" ON public.wallet_movements;

CREATE POLICY "Users can create own wallet movements"
ON public.wallet_movements
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.wallets w
    WHERE w.id = wallet_movements.wallet_id AND w.user_id = auth.uid()
  )
  AND type = 'withdrawal'
  AND status = 'pending'
);

-- 3. Tighten return_requests UPDATE policy + add trigger guarding sensitive cols
DROP POLICY IF EXISTS "Transaction participants can update return requests" ON public.return_requests;

CREATE POLICY "Transaction participants can update return requests"
ON public.return_requests
FOR UPDATE
TO authenticated
USING (
  transaction_id IN (
    SELECT id FROM public.transactions
    WHERE seller_id = auth.uid() OR buyer_id = auth.uid()
  )
)
WITH CHECK (
  transaction_id IN (
    SELECT id FROM public.transactions
    WHERE seller_id = auth.uid() OR buyer_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.prevent_return_request_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx_seller uuid;
  tx_buyer uuid;
BEGIN
  IF public.is_admin_or_service() THEN
    RETURN NEW;
  END IF;

  SELECT seller_id, buyer_id INTO tx_seller, tx_buyer
  FROM public.transactions WHERE id = NEW.transaction_id;

  -- Immutable fields for everyone (only backend/admin may change)
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'No autorizado a modificar status de la devolución';
  END IF;
  IF NEW.shipped_at IS DISTINCT FROM OLD.shipped_at THEN
    RAISE EXCEPTION 'No autorizado a modificar shipped_at';
  END IF;
  IF NEW.received_at IS DISTINCT FROM OLD.received_at THEN
    RAISE EXCEPTION 'No autorizado a modificar received_at';
  END IF;
  IF COALESCE(NEW.responsibility_type,'') IS DISTINCT FROM COALESCE(OLD.responsibility_type,'') THEN
    RAISE EXCEPTION 'No autorizado a modificar responsibility_type';
  END IF;
  IF COALESCE(NEW.shipping_paid_by,'') IS DISTINCT FROM COALESCE(OLD.shipping_paid_by,'') THEN
    RAISE EXCEPTION 'No autorizado a modificar shipping_paid_by';
  END IF;
  IF COALESCE(NEW.admin_notes,'') IS DISTINCT FROM COALESCE(OLD.admin_notes,'') THEN
    RAISE EXCEPTION 'No autorizado a modificar admin_notes';
  END IF;
  IF NEW.mediated_by IS DISTINCT FROM OLD.mediated_by THEN
    RAISE EXCEPTION 'No autorizado a modificar mediated_by';
  END IF;
  IF NEW.mediated_at IS DISTINCT FROM OLD.mediated_at THEN
    RAISE EXCEPTION 'No autorizado a modificar mediated_at';
  END IF;
  IF NEW.requester_id IS DISTINCT FROM OLD.requester_id THEN
    RAISE EXCEPTION 'No autorizado a modificar requester_id';
  END IF;
  IF NEW.transaction_id IS DISTINCT FROM OLD.transaction_id THEN
    RAISE EXCEPTION 'No autorizado a modificar transaction_id';
  END IF;

  -- seller_response can only be set by the seller
  IF COALESCE(NEW.seller_response,'') IS DISTINCT FROM COALESCE(OLD.seller_response,'') THEN
    IF auth.uid() IS DISTINCT FROM tx_seller THEN
      RAISE EXCEPTION 'Solo el vendedor puede responder a la devolución';
    END IF;
  END IF;

  -- tracking_number / carrier only by buyer (who ships back) — and only via backend ideally
  IF COALESCE(NEW.tracking_number,'') IS DISTINCT FROM COALESCE(OLD.tracking_number,'')
     OR COALESCE(NEW.carrier,'') IS DISTINCT FROM COALESCE(OLD.carrier,'') THEN
    IF auth.uid() IS DISTINCT FROM tx_buyer THEN
      RAISE EXCEPTION 'Solo el comprador puede registrar datos de envío de devolución';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_return_request_tampering_trg ON public.return_requests;
CREATE TRIGGER prevent_return_request_tampering_trg
BEFORE UPDATE ON public.return_requests
FOR EACH ROW EXECUTE FUNCTION public.prevent_return_request_tampering();
