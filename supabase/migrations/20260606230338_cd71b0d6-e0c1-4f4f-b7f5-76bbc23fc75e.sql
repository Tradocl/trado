UPDATE public.profiles
SET verification_result_email_key = ''
WHERE verification_result_email_key IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN verification_result_email_key SET DEFAULT '',
  ALTER COLUMN verification_result_email_key SET NOT NULL;