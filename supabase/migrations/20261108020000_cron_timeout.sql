-- net.http_post espera 5 s por defecto. El 2026-11-08 auto-release-escrow marcó
-- 2 de 24 corridas con timed_out (arranque en frío de la Edge Function): pg_net
-- deja de esperar y la corrida queda sin respuesta registrada. Se sube a 15 s en
-- los cuatro jobs. Idempotente: no toca un job que ya tenga timeout.
SELECT cron.alter_job(
  job_id := j.jobid,
  command := replace(j.command, 'net.http_post(', 'net.http_post(timeout_milliseconds := 15000, ')
)
FROM cron.job j
WHERE j.jobname IN ('auto-release-escrow', 'auto-escalate-appeals', 'expire-stale-transactions', 'reconcile-mercadopago')
  AND j.command LIKE '%net.http_post(%'
  AND j.command NOT LIKE '%timeout_milliseconds%';
