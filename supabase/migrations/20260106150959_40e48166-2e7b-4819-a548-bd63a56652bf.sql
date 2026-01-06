-- Add profile_completed column to track if user has completed their profile
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;

-- Update existing users who have RUT and phone as profile_completed = true
UPDATE public.profiles 
SET profile_completed = true 
WHERE rut IS NOT NULL AND phone IS NOT NULL AND rut != '' AND phone != '';