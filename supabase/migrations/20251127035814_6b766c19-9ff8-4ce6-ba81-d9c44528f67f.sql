-- Create storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', false);

-- Create RLS policies for verification documents bucket
CREATE POLICY "Users can upload their own verification documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'verification-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own verification documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own verification documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'verification-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own verification documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'verification-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add verification document fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN verification_document_url TEXT,
ADD COLUMN verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'in_review', 'approved', 'rejected')),
ADD COLUMN verification_submitted_at TIMESTAMP WITH TIME ZONE;