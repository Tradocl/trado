-- Update RLS policies for the appeal-evidence bucket
-- First, drop any existing policies for this bucket
DROP POLICY IF EXISTS "Appeal participants can upload evidence" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload appeal evidence" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Allow authenticated users who are participants in the appeal to upload evidence
CREATE POLICY "Appeal participants can upload evidence"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'appeal-evidence' 
  AND (storage.foldername(name))[1] IN (
    SELECT a.id::text
    FROM appeals a
    JOIN transactions t ON t.id = a.transaction_id
    WHERE t.seller_id = auth.uid() OR t.buyer_id = auth.uid()
  )
);

-- Allow anyone to view public evidence (since bucket is public)
CREATE POLICY "Anyone can view appeal evidence"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'appeal-evidence');