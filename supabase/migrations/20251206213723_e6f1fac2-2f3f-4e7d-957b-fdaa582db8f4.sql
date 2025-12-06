-- Drop the existing SELECT policy on ratings
DROP POLICY IF EXISTS "Users can view ratings for their transactions" ON public.ratings;

-- Create a new policy that allows viewing all ratings for users you have transactions with
CREATE POLICY "Users can view ratings for transaction participants"
ON public.ratings
FOR SELECT
USING (
  (rater_id = auth.uid()) 
  OR (rated_id = auth.uid()) 
  OR (transaction_id IN (
    SELECT transactions.id
    FROM transactions
    WHERE (transactions.seller_id = auth.uid()) OR (transactions.buyer_id = auth.uid())
  ))
  OR (rated_id IN (
    SELECT DISTINCT 
      CASE 
        WHEN transactions.seller_id = auth.uid() THEN transactions.buyer_id
        ELSE transactions.seller_id
      END
    FROM transactions
    WHERE (transactions.seller_id = auth.uid()) OR (transactions.buyer_id = auth.uid())
  ))
);