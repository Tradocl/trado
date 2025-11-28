-- Create storage bucket for chat images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-images',
  'chat-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Allow transaction participants to upload images
CREATE POLICY "Transaction participants can upload chat images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'chat-images' AND
  auth.uid() IN (
    SELECT seller_id FROM transactions 
    WHERE id::text = (storage.foldername(name))[1]
    UNION
    SELECT buyer_id FROM transactions 
    WHERE id::text = (storage.foldername(name))[1]
  )
);

-- Allow transaction participants to view images
CREATE POLICY "Transaction participants can view chat images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'chat-images' AND
  auth.uid() IN (
    SELECT seller_id FROM transactions 
    WHERE id::text = (storage.foldername(name))[1]
    UNION
    SELECT buyer_id FROM transactions 
    WHERE id::text = (storage.foldername(name))[1]
  )
);

-- Allow users to delete their own uploaded images
CREATE POLICY "Users can delete their own chat images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'chat-images' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Add image_url column to chat_messages table
ALTER TABLE chat_messages
ADD COLUMN image_url text;