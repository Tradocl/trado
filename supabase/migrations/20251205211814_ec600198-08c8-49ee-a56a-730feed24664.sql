-- Add columns for return mediation system
ALTER TABLE public.return_requests 
ADD COLUMN IF NOT EXISTS responsibility_type TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS seller_response TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS shipping_paid_by TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS mediated_by UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS mediated_at TIMESTAMPTZ DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.return_requests.responsibility_type IS 'seller_fault or buyer_fault';
COMMENT ON COLUMN public.return_requests.seller_response IS 'pending, accepted, rejected';
COMMENT ON COLUMN public.return_requests.shipping_paid_by IS 'buyer or seller';
COMMENT ON COLUMN public.return_requests.mediated_by IS 'Admin who mediated the dispute';

-- Add new transaction state for return disputes
-- Note: This requires updating the enum if not already present