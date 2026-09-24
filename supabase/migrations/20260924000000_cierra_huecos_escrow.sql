-- Cierra los huecos de la auditoría del 2026-09-24.
--
-- Todos se confirmaron contra la base real con una simulación revertida:
--   1. Un vendedor podía cambiar sale_type/shipped_at/received_at de su sala y
--      hacer que el cron le liberara el escrow en menos de una hora sin entregar.
--   2. Las partes podían editar cualquier campo de una propuesta de acuerdo
--      (proponente, estado, montos) y aceptarse a sí mismas, o re-aceptarla.
--   3. Una sala completada podía volver a in_dispute.
--   4. Se aceptaban retiros con monto negativo.
--   5. El RUT del perfil se podía cambiar, anulando el control de RUT en retiros.
--   6. La contraparte leía el perfil completo (banco, RUT, dirección, documentos).
--   7. Las calificaciones no tenían tope por transacción.
--   8. Los admins operaban sin segundo factor.
-- Además: la plata que entró por tarjeta y no se gastó en una sala completada
-- sólo puede volver a la tarjeta; ya no se puede retirar al banco.
--
-- Regla general: para usuarios comunes cada tabla sensible pasa a una LISTA DE
-- LO PERMITIDO. Lo que la app no escribe, el usuario no lo puede escribir.

-- ---------------------------------------------------------------------------
-- 0. Admin con segundo factor
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin_mfa()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND public.has_role(auth.uid(), 'admin')
     AND coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

COMMENT ON FUNCTION public.is_admin_mfa() IS
  'Admin que confirmó su segundo factor en esta sesión. Requerido para toda acción de admin que escribe.';

-- Los disparadores tratan como "servidor" al service_role y al admin CON 2FA.
-- Un admin sin 2FA se comporta como usuario común.
CREATE OR REPLACE FUNCTION public.is_admin_or_service()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT auth.role()) = 'service_role' THEN
    RETURN TRUE;
  END IF;
  RETURN public.is_admin_mfa();
END;
$$;

ALTER POLICY "Admins can update any wallet" ON public.wallets
  USING (public.is_admin_mfa());
ALTER POLICY "Admins can update movements" ON public.wallet_movements
  USING (public.is_admin_mfa());
ALTER POLICY "Admins can insert roles" ON public.user_roles
  WITH CHECK (public.is_admin_mfa());
ALTER POLICY "Admins can delete roles" ON public.user_roles
  USING (public.is_admin_mfa());
ALTER POLICY "Admins can update any profile" ON public.profiles
  USING (public.is_admin_mfa());
ALTER POLICY "Admins can update all appeals" ON public.appeals
  USING (public.is_admin_mfa());
ALTER POLICY "Admins can create decisions" ON public.appeal_decisions
  WITH CHECK (public.is_admin_mfa() AND admin_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 1. Transacciones
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_transaction_financial_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_seller boolean := auth.uid() = OLD.seller_id;
  is_buyer  boolean := auth.uid() = OLD.buyer_id;
  is_joining_seller_created boolean := false;
  is_joining_buyer_created boolean := false;
  -- Lo único que la app escribe en una sala. Las fechas se aceptan en el
  -- payload pero las fija el servidor más abajo.
  permitidas text[] := ARRAY[
    'state', 'buyer_id', 'seller_id', 'tracking_number', 'carrier',
    'dispute_reason', 'appeal_status', 'shipped_at', 'received_at',
    'dispute_opened_at', 'cancelled_at', 'updated_at'
  ];
  con_escrow text[] := ARRAY[
    'funds_secured', 'in_delivery', 'awaiting_buyer_review',
    'return_requested', 'return_in_progress', 'in_dispute'
  ];
  cambiadas text;
BEGIN
  IF public.is_admin_or_service() THEN
    RETURN NEW;
  END IF;

  SELECT string_agg(n.key, ', ')
    INTO cambiadas
  FROM jsonb_each(to_jsonb(NEW)) n
  WHERE NOT n.key = ANY (permitidas)
    AND n.value IS DISTINCT FROM (to_jsonb(OLD) -> n.key);
  IF cambiadas IS NOT NULL THEN
    RAISE EXCEPTION 'No autorizado a modificar: %', cambiadas;
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

  IF NEW.state IS DISTINCT FROM OLD.state THEN
    IF is_joining_seller_created OR is_joining_buyer_created THEN
      NULL;
    ELSIF OLD.state = 'created' AND NEW.state = 'cancelled' AND OLD.buyer_id IS NULL AND is_seller THEN
      NULL;
    ELSIF OLD.state = 'funds_secured' AND NEW.state = 'in_delivery' AND is_seller THEN
      NULL;
    ELSIF OLD.state IN ('funds_secured','in_delivery') AND NEW.state = 'awaiting_buyer_review' AND (is_seller OR is_buyer) THEN
      NULL;
    -- "completed" ya NO lo puede poner un usuario: lo hace confirm-delivery,
    -- que además le paga al vendedor. Ponerlo a mano sólo dejaba el escrow
    -- congelado.
    ELSIF OLD.state IN ('in_delivery','awaiting_buyer_review') AND NEW.state = 'return_requested' AND is_buyer THEN
      NULL;
    ELSIF OLD.state = 'return_requested' AND NEW.state = 'return_in_progress' AND (is_seller OR is_buyer) THEN
      NULL;
    -- Disputa sólo mientras haya plata retenida: una sala cerrada no se reabre.
    ELSIF NEW.state = 'in_dispute' AND OLD.state::text = ANY (con_escrow) AND (is_seller OR is_buyer) THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'No autorizado a modificar state (de % a %)', OLD.state, NEW.state;
    END IF;
  END IF;

  IF NOT (is_joining_seller_created OR is_joining_buyer_created) THEN
    IF NEW.seller_id IS DISTINCT FROM OLD.seller_id THEN
      RAISE EXCEPTION 'No autorizado a modificar seller_id';
    END IF;
    IF NEW.buyer_id IS DISTINCT FROM OLD.buyer_id THEN
      RAISE EXCEPTION 'No autorizado a modificar buyer_id';
    END IF;
  END IF;

  -- Las fechas que usa el cron para liberar pagos las pone el servidor, en el
  -- momento real de la transición. Antes el navegador mandaba la que quisiera.
  NEW.shipped_at := CASE WHEN NEW.state = 'in_delivery' AND OLD.state IS DISTINCT FROM 'in_delivery'
                         THEN now() ELSE OLD.shipped_at END;
  NEW.received_at := CASE WHEN NEW.state = 'awaiting_buyer_review' AND OLD.state IS DISTINCT FROM 'awaiting_buyer_review'
                          THEN now() ELSE OLD.received_at END;
  NEW.dispute_opened_at := CASE WHEN NEW.state = 'in_dispute' AND OLD.state IS DISTINCT FROM 'in_dispute'
                                THEN now() ELSE OLD.dispute_opened_at END;
  NEW.cancelled_at := CASE WHEN NEW.state = 'cancelled' AND OLD.state IS DISTINCT FROM 'cancelled'
                           THEN now() ELSE OLD.cancelled_at END;

  -- El seguimiento del envío lo carga sólo el vendedor.
  IF (NEW.tracking_number IS DISTINCT FROM OLD.tracking_number
      OR NEW.carrier IS DISTINCT FROM OLD.carrier) AND NOT is_seller THEN
    RAISE EXCEPTION 'Sólo el vendedor puede registrar el seguimiento';
  END IF;

  -- El motivo de disputa se escribe sólo al abrirla.
  IF NEW.dispute_reason IS DISTINCT FROM OLD.dispute_reason
     AND NOT (NEW.state = 'in_dispute' AND OLD.state IS DISTINCT FROM 'in_dispute') THEN
    RAISE EXCEPTION 'No autorizado a modificar dispute_reason';
  END IF;

  -- appeal_status: la app sólo abre una apelación o la manda a mediación. Lo que
  -- NO puede es borrarla: con eso el cron volvía a liberar la plata en disputa.
  IF NEW.appeal_status IS DISTINCT FROM OLD.appeal_status THEN
    IF NOT (OLD.state::text = ANY (con_escrow)) THEN
      RAISE EXCEPTION 'No hay fondos retenidos en esta transacción';
    ELSIF NEW.appeal_status = 'apelacion_abierta'
          AND (OLD.appeal_status IS NULL OR OLD.appeal_status IN ('no_hay_apelacion','cerrada',
               'resuelta_a_favor_comprador','resuelta_a_favor_vendedor','resuelta_parcial')) THEN
      NULL;
    ELSIF NEW.appeal_status = 'pendiente_intervencion_plataforma'
          AND (OLD.appeal_status IS NULL OR OLD.appeal_status IN ('no_hay_apelacion','apelacion_abierta','en_negociacion')) THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'No autorizado a modificar appeal_status (de % a %)', OLD.appeal_status, NEW.appeal_status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Apelaciones
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_appeal_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state text;
  permitidas text[] := ARRAY['status', 'escalated_at', 'reason_description', 'updated_at'];
  cambiadas text;
BEGIN
  IF public.is_admin_or_service() THEN
    RETURN NEW;
  END IF;

  SELECT state::text INTO v_state FROM public.transactions WHERE id = NEW.transaction_id;

  IF TG_OP = 'INSERT' THEN
    IF v_state IS NULL OR v_state NOT IN ('funds_secured','in_delivery','awaiting_buyer_review',
                                          'return_requested','return_in_progress','in_dispute') THEN
      RAISE EXCEPTION 'Sólo se puede apelar mientras hay fondos retenidos';
    END IF;
    IF NEW.status NOT IN ('apelacion_abierta', 'pendiente_intervencion_plataforma') THEN
      RAISE EXCEPTION 'Estado inicial de apelación no permitido: %', NEW.status;
    END IF;
    -- El plazo de negociación lo fija el servidor (48h, APPEAL_NEGOTIATION_HOURS).
    NEW.negotiation_deadline := now() + interval '48 hours';
    NEW.escalated_at := CASE WHEN NEW.status = 'pendiente_intervencion_plataforma' THEN now() ELSE NULL END;
    RETURN NEW;
  END IF;

  SELECT string_agg(n.key, ', ')
    INTO cambiadas
  FROM jsonb_each(to_jsonb(NEW)) n
  WHERE NOT n.key = ANY (permitidas)
    AND n.value IS DISTINCT FROM (to_jsonb(OLD) -> n.key);
  IF cambiadas IS NOT NULL THEN
    RAISE EXCEPTION 'No autorizado a modificar: %', cambiadas;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF (OLD.status = 'apelacion_abierta' AND NEW.status = 'en_negociacion')
       OR (OLD.status IN ('apelacion_abierta','en_negociacion') AND NEW.status = 'pendiente_intervencion_plataforma')
       OR (OLD.status IN ('apelacion_abierta','en_negociacion','pendiente_intervencion_plataforma')
           AND NEW.status = 'en_revision_plataforma') THEN
      NULL;
    ELSE
      -- Resolver o cerrar una apelación lo hacen sólo las funciones de servidor.
      RAISE EXCEPTION 'No autorizado a cambiar la apelación de % a %', OLD.status, NEW.status;
    END IF;
  END IF;

  NEW.escalated_at := CASE WHEN NEW.status = 'pendiente_intervencion_plataforma'
                             AND OLD.status IS DISTINCT FROM 'pendiente_intervencion_plataforma'
                           THEN now() ELSE OLD.escalated_at END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_appeal_changes_trg ON public.appeals;
CREATE TRIGGER guard_appeal_changes_trg
  BEFORE INSERT OR UPDATE ON public.appeals
  FOR EACH ROW EXECUTE FUNCTION public.guard_appeal_changes();

-- ---------------------------------------------------------------------------
-- 3. Propuestas de acuerdo mutuo
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_mutual_proposal_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appeal_status text;
BEGIN
  IF public.is_admin_or_service() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT status::text INTO v_appeal_status FROM public.appeals WHERE id = NEW.appeal_id;
    IF v_appeal_status IS NULL OR v_appeal_status NOT IN ('apelacion_abierta','en_negociacion') THEN
      RAISE EXCEPTION 'La apelación no está en negociación';
    END IF;
    IF NEW.proposer_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Sólo puedes proponer a tu nombre';
    END IF;
    IF NEW.buyer_amount < 0 OR NEW.seller_amount < 0 THEN
      RAISE EXCEPTION 'Los montos no pueden ser negativos';
    END IF;
    NEW.status := 'pending';
    NEW.responded_at := NULL;
    RETURN NEW;
  END IF;

  -- Una propuesta es inmutable. Lo único que una parte puede hacer es
  -- rechazarla o retirarla; aceptarla lo hace accept-mutual-resolution.
  IF NEW.appeal_id IS DISTINCT FROM OLD.appeal_id
     OR NEW.proposer_id IS DISTINCT FROM OLD.proposer_id
     OR NEW.buyer_amount IS DISTINCT FROM OLD.buyer_amount
     OR NEW.seller_amount IS DISTINCT FROM OLD.seller_amount
     OR NEW.message IS DISTINCT FROM OLD.message
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Una propuesta no se puede editar';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (OLD.status = 'pending' AND NEW.status IN ('rejected', 'cancelled')) THEN
      RAISE EXCEPTION 'No autorizado a cambiar la propuesta de % a %', OLD.status, NEW.status;
    END IF;
    NEW.responded_at := now();
  ELSE
    NEW.responded_at := OLD.responded_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_mutual_proposal_changes_trg ON public.appeal_mutual_proposals;
CREATE TRIGGER guard_mutual_proposal_changes_trg
  BEFORE INSERT OR UPDATE ON public.appeal_mutual_proposals
  FOR EACH ROW EXECUTE FUNCTION public.guard_mutual_proposal_changes();

-- ---------------------------------------------------------------------------
-- 4. Retiros: monto positivo y la plata de tarjeta no sale al banco
-- ---------------------------------------------------------------------------

-- Lo que se puede retirar al banco: saldo libre menos lo que entró por tarjeta
-- y no se gastó en una sala completada, menos retiros ya pedidos.
-- La plata de tarjeta sólo vuelve a la tarjeta (refund-mercadopago-deposit).
CREATE OR REPLACE FUNCTION public.withdrawable_balance(p_wallet_id uuid, p_exclude_movement uuid DEFAULT NULL)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(0,
           w.balance
           - LEAST(COALESCE(w.gateway_funded_balance, 0), w.balance)
           - COALESCE((SELECT sum(m.amount) FROM public.wallet_movements m
                        WHERE m.wallet_id = w.id AND m.type = 'withdrawal' AND m.status = 'pending'
                          AND m.id IS DISTINCT FROM p_exclude_movement), 0))
  FROM public.wallets w
  WHERE w.id = p_wallet_id
$$;

REVOKE EXECUTE ON FUNCTION public.withdrawable_balance(uuid, uuid) FROM PUBLIC;

ALTER TABLE public.wallet_movements
  DROP CONSTRAINT IF EXISTS wallet_movements_amount_sign;
ALTER TABLE public.wallet_movements
  ADD CONSTRAINT wallet_movements_amount_sign
  CHECK (type NOT IN ('withdrawal', 'deposit') OR amount > 0);

CREATE OR REPLACE FUNCTION public.enforce_wallet_movement_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_disponible numeric;
BEGIN
  IF public.is_admin_or_service() THEN
    RETURN NEW;
  END IF;
  -- Regular users may only create withdrawal requests; everything else must come
  -- from backend edge functions (escrow, deposits, refunds, etc.).
  IF NEW.type <> 'withdrawal' THEN
    RAISE EXCEPTION 'No autorizado a crear movimientos de tipo %', NEW.type;
  END IF;
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Solo se permiten retiros en estado pending';
  END IF;
  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'El monto del retiro debe ser mayor a 0';
  END IF;
  IF coalesce(trim(NEW.bank_holder_rut), '') = '' OR coalesce(trim(NEW.bank_account_number), '') = '' THEN
    RAISE EXCEPTION 'Faltan los datos de la cuenta bancaria';
  END IF;

  -- FOR UPDATE: dos retiros pedidos a la vez no pueden reservar el mismo saldo.
  SELECT user_id INTO v_owner FROM public.wallets WHERE id = NEW.wallet_id FOR UPDATE;
  IF v_owner IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  v_disponible := public.withdrawable_balance(NEW.wallet_id);
  IF NEW.amount > v_disponible THEN
    RAISE EXCEPTION 'Puedes retirar hasta $%. La plata que depositaste con tarjeta y no usaste en una compra sólo se puede devolver a tu tarjeta.',
      public.formato_clp(v_disponible);
  END IF;
  RETURN NEW;
END;
$$;

-- El RUT de la cuenta tiene que existir (antes un retiro sin RUT se saltaba el control).
CREATE OR REPLACE FUNCTION public.enforce_withdrawal_bank_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wallet_owner uuid;
  owner_rut text;
BEGIN
  IF public.is_admin_or_service() THEN
    RETURN NEW;
  END IF;
  IF NEW.type = 'withdrawal' THEN
    SELECT user_id INTO wallet_owner FROM public.wallets WHERE id = NEW.wallet_id;
    SELECT rut INTO owner_rut FROM public.profiles WHERE id = wallet_owner;
    IF owner_rut IS NULL OR trim(owner_rut) = '' THEN
      RAISE EXCEPTION 'Completa tu RUT antes de solicitar retiros';
    END IF;
    IF UPPER(REGEXP_REPLACE(owner_rut, '[.\-\s]', '', 'g'))
       <> UPPER(REGEXP_REPLACE(coalesce(NEW.bank_holder_rut, ''), '[.\-\s]', '', 'g')) THEN
      RAISE EXCEPTION 'El RUT de la cuenta bancaria debe coincidir con el RUT de tu perfil';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Aprobar exige 2FA y, para retiros, la misma regla de la plata de tarjeta.
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
  v_retirable numeric;
BEGIN
  IF v_caller IS NULL OR NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF NOT public.is_admin_mfa() THEN
    RAISE EXCEPTION 'Esta acción requiere verificación en dos pasos';
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
  IF v_mov.amount IS NULL OR v_mov.amount <= 0 THEN
    RAISE EXCEPTION 'Monto inválido';
  END IF;

  IF v_mov.type = 'withdrawal' THEN
    PERFORM 1 FROM public.wallets WHERE id = v_mov.wallet_id FOR UPDATE;
    v_retirable := public.withdrawable_balance(v_mov.wallet_id, v_mov.id);
    IF v_mov.amount > v_retirable THEN
      RAISE EXCEPTION 'Sólo hay $% retirables al banco. El resto entró con tarjeta y sólo se puede reembolsar a la tarjeta.',
        public.formato_clp(v_retirable);
    END IF;
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

-- Huella del bug del reembolso: billeteras con marca de tarjeta mayor al saldo.
UPDATE public.wallets
SET gateway_funded_balance = GREATEST(LEAST(gateway_funded_balance, balance), 0)
WHERE gateway_funded_balance > balance;

-- ---------------------------------------------------------------------------
-- 5. Perfiles: RUT fijo y datos privados fuera del alcance de la contraparte
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
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
  IF COALESCE(NEW.verification_result_email_status, '') IS DISTINCT FROM COALESCE(OLD.verification_result_email_status, '') THEN
    RAISE EXCEPTION 'No autorizado a modificar verification_result_email_status';
  END IF;
  IF NEW.verification_result_email_sent_at IS DISTINCT FROM OLD.verification_result_email_sent_at THEN
    RAISE EXCEPTION 'No autorizado a modificar verification_result_email_sent_at';
  END IF;
  IF COALESCE(NEW.verification_result_email_key, '') IS DISTINCT FROM COALESCE(OLD.verification_result_email_key, '') THEN
    RAISE EXCEPTION 'No autorizado a modificar verification_result_email_key';
  END IF;
  IF NEW.reputation_score IS DISTINCT FROM OLD.reputation_score THEN
    RAISE EXCEPTION 'No autorizado a modificar reputation_score';
  END IF;
  IF NEW.total_transactions IS DISTINCT FROM OLD.total_transactions THEN
    RAISE EXCEPTION 'No autorizado a modificar total_transactions';
  END IF;
  -- El RUT se ingresa una vez (la app ya lo bloquea). Si se pudiera cambiar,
  -- quien robe una cuenta pondría su RUT y su banco y retiraría la plata.
  IF coalesce(trim(OLD.rut), '') <> '' AND NEW.rut IS DISTINCT FROM OLD.rut THEN
    RAISE EXCEPTION 'El RUT no se puede cambiar. Si hay un error, escríbenos a contacto@trado.cl';
  END IF;
  -- Verificado, el nombre queda atado al documento.
  IF OLD.is_verified AND NEW.full_name IS DISTINCT FROM OLD.full_name THEN
    RAISE EXCEPTION 'Tu nombre quedó verificado con tu documento y no se puede cambiar';
  END IF;
  RETURN NEW;
END;
$$;

-- La contraparte ya no lee la fila completa (banco, RUT, dirección, documentos).
DROP POLICY IF EXISTS "Users can view transaction participants profiles" ON public.profiles;

-- En su lugar, sólo lo que se muestra en pantalla.
CREATE OR REPLACE FUNCTION public.get_profile_names(p_ids uuid[])
RETURNS TABLE (id uuid, full_name text, nickname text, avatar_url text,
               reputation_score numeric, is_verified boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.nickname, p.avatar_url, p.reputation_score, p.is_verified
  FROM public.profiles p
  WHERE p.id = ANY (p_ids)
    AND auth.uid() IS NOT NULL
    AND (
      p.id = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(p.id, 'admin')
      OR EXISTS (
        SELECT 1 FROM public.transactions t
        WHERE (t.seller_id = auth.uid() AND t.buyer_id = p.id)
           OR (t.buyer_id = auth.uid() AND t.seller_id = p.id)
      )
    )
$$;

REVOKE EXECUTE ON FUNCTION public.get_profile_names(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_names(uuid[]) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Calificaciones: una por persona y sala, y sólo con la sala completada
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS ratings_one_per_rater_per_tx
  ON public.ratings (transaction_id, rater_id);

ALTER POLICY "Users can create ratings for their transactions" ON public.ratings
  WITH CHECK (
    auth.uid() = rater_id
    AND EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = ratings.transaction_id
        AND t.state = 'completed'
        AND ((t.seller_id = auth.uid() AND t.buyer_id = ratings.rated_id)
          OR (t.buyer_id = auth.uid() AND t.seller_id = ratings.rated_id))
    )
  );

-- ---------------------------------------------------------------------------
-- 7. Imágenes del chat: privadas (se leen con URL firmada)
-- ---------------------------------------------------------------------------

UPDATE storage.buckets SET public = false WHERE id = 'chat-images';

DROP POLICY IF EXISTS "Admins can view chat images" ON storage.objects;
CREATE POLICY "Admins can view chat images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'chat-images' AND public.has_role(auth.uid(), 'admin'));
