-- Allow users to view transactions that are available to join (created state, no buyer yet)
CREATE POLICY "Anyone can view joinable transactions"
ON public.transactions
FOR SELECT
USING (
  state = 'created' AND buyer_id IS NULL
);