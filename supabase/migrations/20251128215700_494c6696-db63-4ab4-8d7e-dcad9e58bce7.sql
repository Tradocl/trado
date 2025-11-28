-- Allow users to cancel their own pending wallet movements
CREATE POLICY "Users can cancel own pending movements"
ON wallet_movements
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM wallets
    WHERE wallets.id = wallet_movements.wallet_id
    AND wallets.user_id = auth.uid()
  )
  AND status = 'pending'
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM wallets
    WHERE wallets.id = wallet_movements.wallet_id
    AND wallets.user_id = auth.uid()
  )
  AND status IN ('pending', 'cancelled')
);