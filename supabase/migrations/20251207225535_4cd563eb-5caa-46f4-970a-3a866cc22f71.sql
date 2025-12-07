-- Add dashboard background image and theme preference columns
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS dashboard_background_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS dashboard_theme TEXT DEFAULT 'system';