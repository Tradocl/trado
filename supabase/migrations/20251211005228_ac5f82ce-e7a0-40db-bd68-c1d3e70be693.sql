-- Create a function to get safe profile data for transaction partners
-- This only returns non-sensitive fields
CREATE OR REPLACE FUNCTION public.get_safe_profile(profile_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  nickname text,
  avatar_url text,
  reputation_score numeric,
  total_transactions integer,
  is_verified boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Create a function to mask bank account numbers (show only last 4 digits)
CREATE OR REPLACE FUNCTION public.mask_bank_account(account_number text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF account_number IS NULL OR length(account_number) < 4 THEN
    RETURN '****';
  END IF;
  RETURN repeat('*', length(account_number) - 4) || right(account_number, 4);
END;
$$;

-- Create a view for wallet movements that masks sensitive banking data
CREATE OR REPLACE VIEW public.wallet_movements_safe AS
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

-- Add RLS to the view (inherit from base table)
ALTER VIEW public.wallet_movements_safe SET (security_invoker = true);