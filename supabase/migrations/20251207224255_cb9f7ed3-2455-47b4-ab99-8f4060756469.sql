-- Add nickname and card color fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS nickname TEXT,
ADD COLUMN IF NOT EXISTS dashboard_color TEXT DEFAULT 'primary';