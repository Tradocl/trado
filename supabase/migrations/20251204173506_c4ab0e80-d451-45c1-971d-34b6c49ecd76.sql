-- Add blocked_balance column to wallets table
ALTER TABLE public.wallets 
ADD COLUMN blocked_balance numeric DEFAULT 0.00;

-- Update existing wallets to set blocked_balance to 0
UPDATE public.wallets SET blocked_balance = 0.00 WHERE blocked_balance IS NULL;