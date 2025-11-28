-- Rename the chat-images bucket to chat-files and update mime types
UPDATE storage.buckets 
SET 
  name = 'chat-files',
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic',
    'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
    'application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv'
  ],
  file_size_limit = 20971520  -- 20MB limit
WHERE id = 'chat-images';

-- Add file_type column to chat_messages to track what kind of file it is
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS file_type TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT;

-- Rename image_url to file_url for clarity
ALTER TABLE chat_messages 
RENAME COLUMN image_url TO file_url;