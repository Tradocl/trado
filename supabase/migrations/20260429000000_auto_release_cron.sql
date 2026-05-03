-- Add received_at column to track when buyer marked as received
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS received_at timestamptz;

-- Enable pg_cron extension (requires superuser, Supabase supports it)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule auto-release check every hour
SELECT cron.schedule(
  'auto-release-escrow',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/auto-release-escrow',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
