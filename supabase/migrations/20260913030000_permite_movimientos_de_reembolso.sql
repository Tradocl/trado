-- wallet_movements no permitía el tipo 'refund'.
--
-- refund-mercadopago-deposit inserta type='refund' después de que Mercado Pago
-- ya procesó la devolución. La restricción sólo aceptaba deposit, withdrawal,
-- escrow_lock, escrow_release y commission, así que el insert siempre falló y
-- la función NUNCA funcionó desde que existe.
--
-- Lo peligroso es el orden: Mercado Pago devuelve la plata ANTES de ese insert.
-- Resultado: el dinero sale de verdad, pero la billetera del usuario queda sin
-- descontar y el depósito sin marcar como reembolsado. Si después pide un
-- retiro, se le paga dos veces.
--
-- Ocurrió el 2026-09-13 con la operación 177685509347: Mercado Pago devolvió
-- $100.000 y Trado siguió mostrando el saldo completo.

ALTER TABLE public.wallet_movements
  DROP CONSTRAINT IF EXISTS wallet_movements_type_check;

ALTER TABLE public.wallet_movements
  ADD CONSTRAINT wallet_movements_type_check
  CHECK (type = ANY (ARRAY[
    'deposit'::text,
    'withdrawal'::text,
    'escrow_lock'::text,
    'escrow_release'::text,
    'commission'::text,
    'refund'::text
  ]));
