-- Audit fixes: addresses findings #3, #8 from full flow audit
--   #3 Fintoc webhook race condition causing duplicate deposits
--   #8 Dispute reason was being thrown away

-- ============================================================================
-- #3: Add a dedicated session_id column on wallet_movements for true idempotency
-- ============================================================================
ALTER TABLE public.wallet_movements
  ADD COLUMN IF NOT EXISTS external_session_id text;

CREATE UNIQUE INDEX IF NOT EXISTS wallet_movements_external_session_id_uniq
  ON public.wallet_movements (external_session_id)
  WHERE external_session_id IS NOT NULL;

-- ============================================================================
-- #8: Persist the dispute reason so admins can see WHY a dispute was opened
-- ============================================================================
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS dispute_reason text;
