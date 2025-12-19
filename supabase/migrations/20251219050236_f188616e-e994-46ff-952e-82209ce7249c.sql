-- Fix 1: Remove overly permissive transaction partners profile policy
-- The application already uses get_safe_profile() RPC for secure access
-- This policy exposes all columns including sensitive PII to transaction partners
DROP POLICY IF EXISTS "Users can view transaction participants profiles" ON public.profiles;

-- Fix 2: Replace get_transaction_preview with a secured version that requires invite code validation
-- This prevents data scraping by requiring knowledge of the invite code
CREATE OR REPLACE FUNCTION public.get_transaction_preview(
  transaction_id uuid,
  invite_code_param text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  product_name text,
  product_description text,
  amount numeric,
  sale_type text,
  seller_name text,
  state text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seller_id_val uuid;
  seller_name_val text;
  tx_invite_code text;
BEGIN
  -- Get the transaction's invite code and seller_id
  SELECT t.seller_id, t.invite_code INTO seller_id_val, tx_invite_code
  FROM transactions t
  WHERE t.id = transaction_id;
  
  -- If transaction not found, return empty
  IF seller_id_val IS NULL THEN
    RETURN;
  END IF;
  
  -- Validate invite code if one was provided in the request OR if the transaction has an invite code
  -- This ensures users can't scrape transaction data without knowing the invite code
  IF tx_invite_code IS NOT NULL THEN
    IF invite_code_param IS NULL OR UPPER(invite_code_param) != UPPER(tx_invite_code) THEN
      RETURN; -- Return empty result if invite code doesn't match
    END IF;
  END IF;
  
  -- Get seller name from profiles
  SELECT COALESCE(p.nickname, p.full_name) INTO seller_name_val
  FROM profiles p
  WHERE p.id = seller_id_val;
  
  -- Return the public transaction data
  RETURN QUERY
  SELECT 
    t.id,
    t.product_name,
    t.product_description,
    t.amount,
    t.sale_type,
    seller_name_val as seller_name,
    t.state::text
  FROM transactions t
  WHERE t.id = transaction_id;
END;
$$;