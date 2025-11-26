-- Fix search_path for security functions

-- Drop and recreate functions with proper search_path
DROP FUNCTION IF EXISTS create_wallet_for_new_user() CASCADE;
CREATE OR REPLACE FUNCTION create_wallet_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0.00);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION create_wallet_for_new_user();

-- Fix generate_invite_code function
DROP FUNCTION IF EXISTS generate_invite_code();
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code text;
BEGIN
  code := substr(md5(random()::text), 1, 8);
  RETURN upper(code);
END;
$$;

-- update_updated_at_column already has SET search_path = public, so it's fine