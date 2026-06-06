DROP POLICY IF EXISTS "Participants can update their transactions" ON public.transactions;

CREATE POLICY "Participants can update their transactions"
  ON public.transactions FOR UPDATE
  USING (auth.uid() = seller_id OR auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = seller_id OR auth.uid() = buyer_id);