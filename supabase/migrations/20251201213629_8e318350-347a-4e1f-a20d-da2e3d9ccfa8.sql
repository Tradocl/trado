-- Make appeal-evidence bucket public for easier access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'appeal-evidence';