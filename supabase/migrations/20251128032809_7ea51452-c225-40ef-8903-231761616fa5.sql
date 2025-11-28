-- Allow users to join as buyer when buyer_id is null
CREATE POLICY "Anyone can join as buyer when slot is empty"
ON public.transactions
FOR UPDATE
USING (buyer_id IS NULL AND state = 'created')
WITH CHECK (buyer_id IS NULL AND state = 'created');