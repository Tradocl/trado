-- Add RLS to the wallet_movements_safe view
-- First, drop and recreate the view with security_invoker = true
DROP VIEW IF EXISTS public.wallet_movements_safe;

CREATE VIEW public.wallet_movements_safe 
WITH (security_invoker = true)
AS
SELECT 
  wm.id,
  wm.wallet_id,
  wm.transaction_id,
  wm.type,
  wm.amount,
  wm.balance_after,
  wm.description,
  wm.status,
  wm.created_at,
  wm.reviewed_at,
  wm.reviewed_by,
  wm.bank_name,
  wm.bank_account_type,
  wm.bank_holder_name,
  -- Mask sensitive fields
  public.mask_bank_account(wm.bank_account_number) as bank_account_number,
  public.mask_bank_account(wm.bank_holder_rut) as bank_holder_rut
FROM public.wallet_movements wm;