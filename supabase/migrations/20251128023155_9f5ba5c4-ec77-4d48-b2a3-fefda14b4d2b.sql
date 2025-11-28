-- Add bank account fields for withdrawal requests
ALTER TABLE public.wallet_movements
ADD COLUMN IF NOT EXISTS bank_holder_name text,
ADD COLUMN IF NOT EXISTS bank_holder_rut text,
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS bank_account_type text,
ADD COLUMN IF NOT EXISTS bank_account_number text;

-- Allow admins to update any wallet so approvals correctly update balances
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'wallets' 
      AND policyname = 'Admins can update any wallet'
  ) THEN
    CREATE POLICY "Admins can update any wallet"
    ON public.wallets
    FOR UPDATE
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;