ALTER TABLE public.wallet_movements ADD COLUMN IF NOT EXISTS external_fee numeric NOT NULL DEFAULT 0;
ALTER TABLE public.wallet_movements ADD COLUMN IF NOT EXISTS refunded_at timestamptz;
UPDATE public.wallet_movements
SET external_fee = ROUND(amount * 0.038)
WHERE type='deposit' AND status='approved' AND external_fee=0 AND description ILIKE '%Mercado Pago%';