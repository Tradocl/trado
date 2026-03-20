-- Secure the wallet_movements_safe view by revoking anon access
REVOKE ALL ON public.wallet_movements_safe FROM anon;
REVOKE ALL ON public.wallet_movements_safe FROM public;
GRANT SELECT ON public.wallet_movements_safe TO authenticated;

-- Create a security definer function to get own bank details
CREATE OR REPLACE FUNCTION public.get_own_bank_details(_user_id uuid)
RETURNS TABLE(
  bank_holder_name text,
  bank_holder_rut text,
  bank_name text,
  bank_account_type text,
  bank_account_number text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.bank_holder_name,
    p.bank_holder_rut,
    p.bank_name,
    p.bank_account_type,
    p.bank_account_number
  FROM public.profiles p
  WHERE p.id = _user_id
    AND _user_id = auth.uid()
$$;