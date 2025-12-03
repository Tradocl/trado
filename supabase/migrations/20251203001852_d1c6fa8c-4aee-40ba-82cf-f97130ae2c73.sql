
-- Create table for mutual resolution proposals
CREATE TABLE public.appeal_mutual_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id uuid NOT NULL REFERENCES appeals(id) ON DELETE CASCADE,
  proposer_id uuid NOT NULL,
  buyer_amount numeric NOT NULL,
  seller_amount numeric NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending', -- pending, accepted, rejected
  responded_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appeal_mutual_proposals ENABLE ROW LEVEL SECURITY;

-- Make admin_id nullable in appeal_decisions for mutual resolutions
ALTER TABLE public.appeal_decisions ALTER COLUMN admin_id DROP NOT NULL;

-- Add column to track if resolution was mutual
ALTER TABLE public.appeal_decisions ADD COLUMN is_mutual_agreement boolean DEFAULT false;

-- RLS Policies for appeal_mutual_proposals
CREATE POLICY "Appeal participants can view proposals"
ON public.appeal_mutual_proposals
FOR SELECT
USING (
  appeal_id IN (
    SELECT a.id FROM appeals a
    JOIN transactions t ON a.transaction_id = t.id
    WHERE t.seller_id = auth.uid() OR t.buyer_id = auth.uid()
  )
);

CREATE POLICY "Appeal participants can create proposals"
ON public.appeal_mutual_proposals
FOR INSERT
WITH CHECK (
  appeal_id IN (
    SELECT a.id FROM appeals a
    JOIN transactions t ON a.transaction_id = t.id
    WHERE t.seller_id = auth.uid() OR t.buyer_id = auth.uid()
  )
  AND proposer_id = auth.uid()
);

CREATE POLICY "Appeal participants can update proposals"
ON public.appeal_mutual_proposals
FOR UPDATE
USING (
  appeal_id IN (
    SELECT a.id FROM appeals a
    JOIN transactions t ON a.transaction_id = t.id
    WHERE t.seller_id = auth.uid() OR t.buyer_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all proposals"
ON public.appeal_mutual_proposals
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for proposals
ALTER PUBLICATION supabase_realtime ADD TABLE public.appeal_mutual_proposals;
