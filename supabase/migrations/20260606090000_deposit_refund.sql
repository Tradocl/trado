-- Support full refunds of un-used Mercado Pago deposits. When a user regrets a
-- deposit (and has not spent it), we refund the original MP payment instead of
-- a bank withdrawal: MP returns the money to the original method AND reintegrates
-- the processing fee to Trado, so there is no loss. Mark the deposit as refunded
-- so it cannot be refunded twice and is hidden from the refundable list.
ALTER TABLE public.wallet_movements
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;
