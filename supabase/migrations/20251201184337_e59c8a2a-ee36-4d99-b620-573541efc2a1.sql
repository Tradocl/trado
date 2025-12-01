-- Add rejection comment field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN verification_rejection_reason text;

COMMENT ON COLUMN public.profiles.verification_rejection_reason IS 'Admin comment explaining why verification was rejected';