-- Mercado Pago (and any payment processor) deducts a fee before the money
-- reaches the Trado account: the user's wallet is credited the GROSS amount,
-- but the bank only receives net = gross - fee. Record that fee per movement so
-- admin token accounting can reconcile the real bank balance against wallet
-- obligations (bank = deposits - mp_fees - withdrawals).
ALTER TABLE public.wallet_movements
  ADD COLUMN IF NOT EXISTS external_fee numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.wallet_movements.external_fee IS
  'Payment-processor fee (e.g. Mercado Pago) deducted before funds reach the Trado bank account. Wallet is credited the gross amount; this records the cost so admin accounting reconciles.';
