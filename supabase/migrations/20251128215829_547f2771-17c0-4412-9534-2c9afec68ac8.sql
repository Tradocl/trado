-- Add 'cancelled' to the allowed status values for wallet_movements
ALTER TABLE wallet_movements 
DROP CONSTRAINT IF EXISTS wallet_movements_status_check;

ALTER TABLE wallet_movements 
ADD CONSTRAINT wallet_movements_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));