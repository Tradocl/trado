-- Add new transaction states for review period
ALTER TYPE transaction_state ADD VALUE IF NOT EXISTS 'awaiting_buyer_review';
ALTER TYPE transaction_state ADD VALUE IF NOT EXISTS 'return_requested';
ALTER TYPE transaction_state ADD VALUE IF NOT EXISTS 'return_in_progress';

-- Create sale_type enum
DO $$ BEGIN
  CREATE TYPE sale_type AS ENUM ('servicio', 'producto_persona', 'producto_envio');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add sale_type and shipped_at columns to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS sale_type text DEFAULT 'producto_envio';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS shipped_at timestamp with time zone;

-- Create return_requests table for managing product returns
CREATE TABLE IF NOT EXISTS return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES transactions(id) NOT NULL,
  requester_id uuid NOT NULL,
  reason text NOT NULL,
  reason_description text,
  tracking_number text,
  carrier text,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  shipped_at timestamp with time zone,
  received_at timestamp with time zone
);

-- Enable RLS on return_requests
ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for return_requests
CREATE POLICY "Transaction participants can view return requests"
ON return_requests FOR SELECT
USING (
  transaction_id IN (
    SELECT id FROM transactions 
    WHERE seller_id = auth.uid() OR buyer_id = auth.uid()
  )
);

CREATE POLICY "Buyers can create return requests"
ON return_requests FOR INSERT
WITH CHECK (
  requester_id = auth.uid() AND
  transaction_id IN (
    SELECT id FROM transactions WHERE buyer_id = auth.uid()
  )
);

CREATE POLICY "Transaction participants can update return requests"
ON return_requests FOR UPDATE
USING (
  transaction_id IN (
    SELECT id FROM transactions 
    WHERE seller_id = auth.uid() OR buyer_id = auth.uid()
  )
);

-- Admins can view all return requests
CREATE POLICY "Admins can view all return requests"
ON return_requests FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));