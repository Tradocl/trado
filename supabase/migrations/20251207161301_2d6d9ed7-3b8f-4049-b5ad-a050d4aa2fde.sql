-- Allow admins to view all chat messages
CREATE POLICY "Admins can view all chat messages"
ON public.chat_messages
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to send chat messages
CREATE POLICY "Admins can send chat messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND user_id = auth.uid());