-- Fix 1: Require authentication to view joinable transactions
DROP POLICY IF EXISTS "Anyone can view joinable transactions" ON public.transactions;

CREATE POLICY "Authenticated users can view joinable transactions" 
ON public.transactions 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND state = 'created'::transaction_state 
  AND buyer_id IS NULL
);

-- Fix 2: Restrict ratings visibility to transaction participants only
DROP POLICY IF EXISTS "Users can view all ratings" ON public.ratings;

CREATE POLICY "Users can view ratings for their transactions" 
ON public.ratings 
FOR SELECT 
USING (
  -- User can see ratings if they are the rater
  rater_id = auth.uid()
  -- Or if they are the rated person
  OR rated_id = auth.uid()
  -- Or if they are a participant in the transaction
  OR transaction_id IN (
    SELECT id FROM transactions 
    WHERE seller_id = auth.uid() OR buyer_id = auth.uid()
  )
);

-- Also need to update "Anyone can join as buyer when slot is empty" to require auth
DROP POLICY IF EXISTS "Anyone can join as buyer when slot is empty" ON public.transactions;

CREATE POLICY "Authenticated users can join as buyer when slot is empty" 
ON public.transactions 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND buyer_id IS NULL 
  AND state = 'created'::transaction_state
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND buyer_id IS NULL 
  AND state = 'created'::transaction_state
);