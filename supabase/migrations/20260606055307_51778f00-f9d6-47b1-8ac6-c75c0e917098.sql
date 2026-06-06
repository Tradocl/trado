ALTER TABLE public.wallet_movements ADD COLUMN IF NOT EXISTS external_session_id text;
CREATE UNIQUE INDEX IF NOT EXISTS wallet_movements_external_session_id_uniq ON public.wallet_movements (external_session_id) WHERE external_session_id IS NOT NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS dispute_reason text;