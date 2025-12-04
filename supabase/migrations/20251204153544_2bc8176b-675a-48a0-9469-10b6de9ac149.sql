-- Create table for meeting proposals (in-person deliveries)
CREATE TABLE public.meeting_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  proposer_id UUID NOT NULL REFERENCES auth.users(id),
  proposed_location TEXT NOT NULL,
  proposed_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_proposals ENABLE ROW LEVEL SECURITY;

-- Policy: Transaction participants can view meeting proposals
CREATE POLICY "Transaction participants can view proposals"
ON public.meeting_proposals
FOR SELECT
USING (
  transaction_id IN (
    SELECT id FROM transactions
    WHERE seller_id = auth.uid() OR buyer_id = auth.uid()
  )
);

-- Policy: Transaction participants can create proposals
CREATE POLICY "Transaction participants can create proposals"
ON public.meeting_proposals
FOR INSERT
WITH CHECK (
  transaction_id IN (
    SELECT id FROM transactions
    WHERE seller_id = auth.uid() OR buyer_id = auth.uid()
  )
  AND proposer_id = auth.uid()
);

-- Policy: Transaction participants can update proposals
CREATE POLICY "Transaction participants can update proposals"
ON public.meeting_proposals
FOR UPDATE
USING (
  transaction_id IN (
    SELECT id FROM transactions
    WHERE seller_id = auth.uid() OR buyer_id = auth.uid()
  )
);

-- Enable realtime for meeting proposals
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_proposals;