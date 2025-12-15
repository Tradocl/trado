-- Add unique constraint for RUT
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_rut_unique UNIQUE (rut);

-- Add unique constraint for phone
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_phone_unique UNIQUE (phone);