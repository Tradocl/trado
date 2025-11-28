-- Create function to update reputation score after rating
CREATE OR REPLACE FUNCTION update_user_reputation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avg_rating NUMERIC;
BEGIN
  -- Calculate average rating for the rated user
  SELECT AVG(stars) INTO avg_rating
  FROM ratings
  WHERE rated_id = NEW.rated_id;
  
  -- Update the user's reputation score
  UPDATE profiles
  SET reputation_score = COALESCE(avg_rating, 0)
  WHERE id = NEW.rated_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to update reputation after new rating
DROP TRIGGER IF EXISTS update_reputation_after_rating ON ratings;
CREATE TRIGGER update_reputation_after_rating
AFTER INSERT ON ratings
FOR EACH ROW
EXECUTE FUNCTION update_user_reputation();

-- Add unique constraint to prevent duplicate ratings
ALTER TABLE ratings
DROP CONSTRAINT IF EXISTS unique_rating_per_transaction;

ALTER TABLE ratings
ADD CONSTRAINT unique_rating_per_transaction 
UNIQUE (rater_id, transaction_id);