-- Allow admins to send messages in appeals
CREATE POLICY "Admins can send messages in appeals"
ON public.appeal_messages
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND
  user_id = auth.uid()
);