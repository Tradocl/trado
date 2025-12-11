-- Fix search_path for mask_bank_account function
CREATE OR REPLACE FUNCTION public.mask_bank_account(account_number text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF account_number IS NULL OR length(account_number) < 4 THEN
    RETURN '****';
  END IF;
  RETURN repeat('*', length(account_number) - 4) || right(account_number, 4);
END;
$$;