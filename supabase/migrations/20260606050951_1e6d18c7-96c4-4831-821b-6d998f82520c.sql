
-- 1. Storage: remove overly-permissive policies
DROP POLICY IF EXISTS "Anyone can view appeal evidence" ON storage.objects;
DROP POLICY IF EXISTS "Appeal participants can upload evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Transaction participants can upload chat files" ON storage.objects;

-- Replace chat-files upload with a path-scoped policy (first folder = transaction id)
CREATE POLICY "Transaction participants can upload chat files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-files'
  AND auth.uid() IN (
    SELECT seller_id FROM public.transactions
      WHERE id::text = (storage.foldername(name))[1]
    UNION
    SELECT buyer_id FROM public.transactions
      WHERE id::text = (storage.foldername(name))[1]
  )
);

-- 2. Ratings: enforce participant + counterparty
DROP POLICY IF EXISTS "Users can create ratings for their transactions" ON public.ratings;
CREATE POLICY "Users can create ratings for their transactions"
ON public.ratings FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = rater_id
  AND EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = transaction_id
      AND (
        (t.seller_id = auth.uid() AND t.buyer_id = rated_id)
        OR (t.buyer_id = auth.uid() AND t.seller_id = rated_id)
      )
  )
);

-- 3. Wallet movements: block direct user inserts of non-withdrawal types
CREATE OR REPLACE FUNCTION public.enforce_wallet_movement_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin_or_service() THEN
    RETURN NEW;
  END IF;
  -- Regular users may only create withdrawal requests; everything else must come
  -- from backend edge functions (escrow, deposits, refunds, etc.).
  IF NEW.type <> 'withdrawal' THEN
    RAISE EXCEPTION 'No autorizado a crear movimientos de tipo %', NEW.type;
  END IF;
  -- Must start as pending; balance_after must reflect a debit, validated server-side.
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Solo se permiten retiros en estado pending';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_wallet_movement_insert ON public.wallet_movements;
CREATE TRIGGER trg_enforce_wallet_movement_insert
BEFORE INSERT ON public.wallet_movements
FOR EACH ROW EXECUTE FUNCTION public.enforce_wallet_movement_insert();

-- 4. Profiles: add WITH CHECK on user update (trigger already prevents privilege escalation;
--    WITH CHECK ensures user can only update their own row)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. Transactions: remove broad joinable visibility
DROP POLICY IF EXISTS "Authenticated users can view joinable transactions" ON public.transactions;

-- Provide a controlled lookup by invite code so the join flow keeps working
CREATE OR REPLACE FUNCTION public.find_transaction_by_invite_code(_invite_code text)
RETURNS TABLE(id uuid, seller_id uuid, buyer_id uuid, sale_type text, state text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  IF _invite_code IS NULL OR length(_invite_code) < 4 THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT t.id, t.seller_id, t.buyer_id, t.sale_type, t.state::text
  FROM public.transactions t
  WHERE t.invite_code = upper(_invite_code)
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.find_transaction_by_invite_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_transaction_by_invite_code(text) TO authenticated;
