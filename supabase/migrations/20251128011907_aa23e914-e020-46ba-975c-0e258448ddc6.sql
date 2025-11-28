-- Drop all existing SELECT policies on profiles table
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Allow users to view only their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Allow transaction participants to view each other's profiles
-- (seller can see buyer's profile and vice versa in their transactions)
CREATE POLICY "Users can view transaction participants profiles"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT buyer_id FROM public.transactions WHERE seller_id = auth.uid()
    UNION
    SELECT seller_id FROM public.transactions WHERE buyer_id = auth.uid()
  )
);

-- Recreate admin policy to view all profiles using the has_role function
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));