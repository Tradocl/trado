-- Create a public function to get transaction preview without authentication
CREATE OR REPLACE FUNCTION public.get_transaction_preview(transaction_id uuid)
RETURNS TABLE(
  id uuid,
  product_name text,
  product_description text,
  amount numeric,
  sale_type text,
  seller_name text,
  state text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seller_id_val uuid;
  seller_name_val text;
BEGIN
  -- Get the seller_id first
  SELECT t.seller_id INTO seller_id_val
  FROM transactions t
  WHERE t.id = transaction_id;
  
  -- Get seller name from profiles
  IF seller_id_val IS NOT NULL THEN
    SELECT COALESCE(p.nickname, p.full_name) INTO seller_name_val
    FROM profiles p
    WHERE p.id = seller_id_val;
  END IF;
  
  -- Return the public transaction data
  RETURN QUERY
  SELECT 
    t.id,
    t.product_name,
    t.product_description,
    t.amount,
    t.sale_type,
    seller_name_val as seller_name,
    t.state::text
  FROM transactions t
  WHERE t.id = transaction_id;
END;
$$;