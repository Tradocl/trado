-- Drop the view and recreate with proper security
DROP VIEW IF EXISTS public.wallet_movements_safe;

-- Recreate the view with proper security
CREATE VIEW public.wallet_movements_safe 
WITH (security_invoker = true)
AS
SELECT 
  id,
  wallet_id,
  amount,
  balance_after,
  type,
  status,
  description,
  transaction_id,
  created_at,
  reviewed_at,
  reviewed_by,
  -- Mask sensitive banking details
  bank_holder_name,
  public.mask_bank_account(bank_holder_rut) as bank_holder_rut,
  bank_name,
  bank_account_type,
  public.mask_bank_account(bank_account_number) as bank_account_number
FROM public.wallet_movements;

-- Grant access to the view
GRANT SELECT ON public.wallet_movements_safe TO authenticated;

-- Update profiles RLS policy to only expose non-sensitive fields for transaction partners
-- First drop the existing policy
DROP POLICY IF EXISTS "Users can view transaction participants profiles" ON public.profiles;

-- Create a more restrictive policy that uses the safe profile function
-- Since RLS is row-level (not column-level), we need to keep the policy but ensure 
-- the application uses get_safe_profile() function for transaction partner queries
-- The policy itself allows access but the function limits what's returned
CREATE POLICY "Users can view transaction participants profiles" 
ON public.profiles 
FOR SELECT 
USING (
  id IN (
    SELECT transactions.buyer_id FROM transactions WHERE transactions.seller_id = auth.uid()
    UNION
    SELECT transactions.seller_id FROM transactions WHERE transactions.buyer_id = auth.uid()
  )
);