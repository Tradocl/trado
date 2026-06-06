-- Defense-in-depth: the "Participants can update their transactions" UPDATE
-- policy had a USING clause but no WITH CHECK, so at the RLS layer alone a
-- participant could rewrite a row's seller_id/buyer_id to a transaction they
-- are not part of. Integrity was enforced only by the
-- prevent_transaction_financial_tampering trigger. Add a matching WITH CHECK so
-- the policy itself rejects reassigning a transaction away from its participants.
--
-- This does NOT affect the separate "Authenticated users can join as buyer when
-- slot is empty" policy, which keeps its own USING/WITH CHECK for the join flow.

DROP POLICY IF EXISTS "Participants can update their transactions" ON public.transactions;

CREATE POLICY "Participants can update their transactions"
  ON public.transactions FOR UPDATE
  USING (auth.uid() = seller_id OR auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = seller_id OR auth.uid() = buyer_id);
