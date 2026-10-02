-- Cuadratura Mercado Pago <-> Trado cada 30 minutos (reconcile-mercadopago).
-- Acredita pagos de Trado aprobados en MP que el webhook no registró y avisa de
-- las diferencias. Mismo formato que los demás crons (URL y clave en Vault).
SELECT cron.schedule(
  'reconcile-mercadopago',
  '5,35 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/reconcile-mercadopago?dias=30',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
