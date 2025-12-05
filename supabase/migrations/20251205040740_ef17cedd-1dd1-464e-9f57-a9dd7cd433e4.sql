-- Add initiator_role column to transactions table
-- 'seller' = creator is selling/providing (current behavior)
-- 'buyer' = creator is buying/contracting (new behavior)
ALTER TABLE public.transactions 
ADD COLUMN initiator_role TEXT DEFAULT 'seller' CHECK (initiator_role IN ('seller', 'buyer'));

-- Update existing transactions to have 'seller' as initiator (they were all seller-initiated)
UPDATE public.transactions SET initiator_role = 'seller' WHERE initiator_role IS NULL;