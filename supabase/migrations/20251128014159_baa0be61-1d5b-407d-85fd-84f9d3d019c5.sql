-- Create chat messages table for transactions
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow transaction participants to view messages
CREATE POLICY "Transaction participants can view messages"
ON public.chat_messages
FOR SELECT
USING (
  transaction_id IN (
    SELECT id FROM public.transactions 
    WHERE seller_id = auth.uid() OR buyer_id = auth.uid()
  )
);

-- Allow transaction participants to send messages
CREATE POLICY "Transaction participants can send messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  transaction_id IN (
    SELECT id FROM public.transactions 
    WHERE seller_id = auth.uid() OR buyer_id = auth.uid()
  )
  AND user_id = auth.uid()
);

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;