-- Make chat-files and appeal-evidence buckets private
UPDATE storage.buckets SET public = false WHERE id = 'chat-files';
UPDATE storage.buckets SET public = false WHERE id = 'appeal-evidence';

-- Drop existing policies if any and create new ones for chat-files
DROP POLICY IF EXISTS "Transaction participants can view chat files" ON storage.objects;
DROP POLICY IF EXISTS "Transaction participants can upload chat files" ON storage.objects;

-- Create RLS policies for chat-files bucket
CREATE POLICY "Transaction participants can view chat files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-files' AND
  (
    EXISTS (
      SELECT 1 FROM public.chat_messages cm
      JOIN public.transactions t ON cm.transaction_id = t.id
      WHERE cm.file_url LIKE '%' || storage.objects.name || '%'
      AND (t.seller_id = auth.uid() OR t.buyer_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Transaction participants can upload chat files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-files' AND auth.uid() IS NOT NULL
);

-- Drop existing policies if any and create new ones for appeal-evidence
DROP POLICY IF EXISTS "Appeal participants can view evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Appeal participants can upload evidence files" ON storage.objects;

-- Create RLS policies for appeal-evidence bucket
CREATE POLICY "Appeal participants can view evidence files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'appeal-evidence' AND
  (
    EXISTS (
      SELECT 1 FROM public.appeal_evidence ae
      JOIN public.appeals a ON ae.appeal_id = a.id
      JOIN public.transactions t ON a.transaction_id = t.id
      WHERE ae.file_url LIKE '%' || storage.objects.name || '%'
      AND (t.seller_id = auth.uid() OR t.buyer_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Appeal participants can upload evidence files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'appeal-evidence' AND auth.uid() IS NOT NULL
);