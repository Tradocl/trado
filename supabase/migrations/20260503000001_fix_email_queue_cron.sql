-- Remove the broken process-email-queue cron (used wrong auth method)
-- Lovable will re-create it with vault-based auth via setup_email_infra
SELECT cron.unschedule('process-email-queue');

-- Clear any stuck rate-limit cooldown in email_send_state
UPDATE public.email_send_state SET retry_after_until = NULL WHERE id = 1;
