-- Add verification selfie URL field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN verification_selfie_url text;

COMMENT ON COLUMN public.profiles.verification_selfie_url IS 'URL of selfie with ID document for identity verification';