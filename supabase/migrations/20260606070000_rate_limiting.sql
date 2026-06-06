-- ============================================================================
-- Rate limiting infrastructure
-- Per-minute fixed-window counter keyed by (identifier, action).
-- Only SECURITY DEFINER functions and service_role touch this table.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  identifier   text        NOT NULL,
  action       text        NOT NULL,
  window_start timestamptz NOT NULL,
  count        integer     NOT NULL DEFAULT 1,
  PRIMARY KEY (identifier, action, window_start)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policies: regular users cannot read or write this table.
-- service_role bypasses RLS; SECURITY DEFINER functions run as owner.

-- Returns TRUE if the call is allowed, FALSE if the per-minute cap is exceeded.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _identifier     text,
  _action         text,
  _max_per_minute integer
) RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _window  timestamptz := date_trunc('minute', now());
  _current integer;
BEGIN
  INSERT INTO public.rate_limits (identifier, action, window_start, count)
  VALUES (_identifier, _action, _window, 1)
  ON CONFLICT (identifier, action, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO _current;

  RETURN _current <= _max_per_minute;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer) TO service_role;

-- ============================================================================
-- Add anti-enumeration rate limit to invite-code lookup
-- (10 attempts / minute / user). Function becomes VOLATILE because it writes
-- to rate_limits via check_rate_limit.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.find_transaction_by_invite_code(_invite_code text)
RETURNS TABLE(id uuid, seller_id uuid, buyer_id uuid, sale_type text, state text)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  IF _invite_code IS NULL OR length(_invite_code) < 4 THEN
    RETURN;
  END IF;

  IF NOT public.check_rate_limit(auth.uid()::text, 'find_invite_code', 10) THEN
    RAISE EXCEPTION 'rate_limit_exceeded'
      USING HINT = 'Demasiados intentos. Espera un minuto.';
  END IF;

  RETURN QUERY
  SELECT t.id, t.seller_id, t.buyer_id, t.sale_type, t.state::text
  FROM public.transactions t
  WHERE t.invite_code = upper(_invite_code)
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.find_transaction_by_invite_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_transaction_by_invite_code(text) TO authenticated;
