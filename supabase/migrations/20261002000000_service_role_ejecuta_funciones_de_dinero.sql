-- ============================================================================
-- Devuelve a service_role el permiso de ejecutar las funciones de dinero
-- ============================================================================
--
-- 20260913000000 les quitó EXECUTE a PUBLIC para cerrar la acuñación desde el
-- frontend, asumiendo que "service_role no pasa por estos permisos". Es falso:
-- service_role se salta RLS, pero NO los grants de EXECUTE, y heredaba el
-- permiso justamente de PUBLIC. Desde ese día las Edge Functions recibían
-- "permission denied for function ..." en cada paso que mueve saldo:
--
--   mercadopago-webhook        credit_wallet_balance_with_origin  (depósitos con tarjeta)
--   process-escrow-deposit     consume/restore_gateway_funded     (financiar la sala)
--   confirm-delivery, auto-release-escrow, resolve-appeal,
--   accept-mutual-resolution, process-return-refund
--                              credit_wallet_balance, release_blocked_balance,
--                              restore_gateway_funded             (liberar / devolver)
--   refund-mercadopago-deposit credit_wallet_balance, consume_gateway_funded
--
-- Se detectó el 2026-10-02: el pago MP 181036601005 llegó al webhook y falló
-- al acreditar (el movimiento se revirtió solo, así que no quedó plata a medias).
--
-- Sólo se otorga a service_role. anon y authenticated siguen sin poder
-- llamarlas, que era el objetivo de la migración del 13.

GRANT EXECUTE ON FUNCTION public.credit_wallet_balance(uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.credit_wallet_balance_with_origin(uuid, numeric, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_blocked_balance(uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.lock_escrow_balance(uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_gateway_funded(uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.restore_gateway_funded(uuid, numeric) TO service_role;
