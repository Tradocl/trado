-- Add bank account fields to profiles for automatic withdrawals
ALTER TABLE public.profiles
ADD COLUMN bank_holder_name text,
ADD COLUMN bank_holder_rut text,
ADD COLUMN bank_name text,
ADD COLUMN bank_account_type text,
ADD COLUMN bank_account_number text;