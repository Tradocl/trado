-- Allow admins to view all verification documents
CREATE POLICY "Admins can view all verification documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'verification-documents' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to download all verification documents  
CREATE POLICY "Admins can download all verification documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'verification-documents'
  AND has_role(auth.uid(), 'admin'::app_role)
);