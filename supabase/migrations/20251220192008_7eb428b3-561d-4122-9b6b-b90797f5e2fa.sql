-- Fix 1: Update get_safe_profile function to add access control checks
-- Only allow viewing profiles if:
-- 1. User is viewing their own profile
-- 2. User has a transaction relationship with the profile
-- 3. User is an admin

CREATE OR REPLACE FUNCTION public.get_safe_profile(profile_id uuid)
RETURNS TABLE(
  id uuid, 
  full_name text, 
  nickname text, 
  avatar_url text, 
  reputation_score numeric, 
  total_transactions integer, 
  is_verified boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Access control: Only allow if user has relationship with this profile
  IF NOT (
    -- User is viewing their own profile
    profile_id = auth.uid()
    -- Or user has a transaction with this profile (as buyer or seller)
    OR EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE (t.seller_id = auth.uid() AND t.buyer_id = profile_id)
         OR (t.buyer_id = auth.uid() AND t.seller_id = profile_id)
    )
    -- Or user is an admin
    OR has_role(auth.uid(), 'admin')
  ) THEN
    -- Return empty result set if no access
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.nickname,
    p.avatar_url,
    p.reputation_score,
    p.total_transactions,
    p.is_verified
  FROM public.profiles p
  WHERE p.id = profile_id;
END;
$$;

-- Fix 2: Drop and recreate ratings policy to only allow viewing ratings from shared transactions
-- Remove the problematic clause that exposes all ratings of transaction partners

DROP POLICY IF EXISTS "Users can view ratings for transaction participants" ON public.ratings;

CREATE POLICY "Users can view ratings from their transactions"
ON public.ratings FOR SELECT
USING (
  -- User can see ratings if they are the rater
  rater_id = auth.uid()
  -- Or if they are the rated person
  OR rated_id = auth.uid()
  -- Or if they are a participant in THE SPECIFIC TRANSACTION being rated
  OR transaction_id IN (
    SELECT transactions.id
    FROM transactions
    WHERE (transactions.seller_id = auth.uid()) 
       OR (transactions.buyer_id = auth.uid())
  )
);