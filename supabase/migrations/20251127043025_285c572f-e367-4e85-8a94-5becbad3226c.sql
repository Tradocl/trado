-- Allow users to crear movimientos de su propia billetera (depósitos/retiros pendientes)
CREATE POLICY "Users can create own wallet movements"
ON public.wallet_movements
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.wallets w
    WHERE w.id = wallet_id
      AND w.user_id = auth.uid()
  )
);
