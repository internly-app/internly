-- Fix for like_count not updating due to RLS policy
-- The trigger needs to bypass RLS to update like_count on any review

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS update_review_like_count_trigger ON review_likes;
DROP FUNCTION IF EXISTS update_review_like_count();

-- Recreate the function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION update_review_like_count()
RETURNS TRIGGER
SECURITY DEFINER  -- This allows the function to bypass RLS
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reviews SET like_count = like_count + 1 WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reviews SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.review_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_review_like_count_trigger
AFTER INSERT OR DELETE ON review_likes
FOR EACH ROW EXECUTE FUNCTION update_review_like_count();

-- Optional: Fix any existing reviews with incorrect like_count
UPDATE reviews r
SET like_count = (
  SELECT COUNT(*)
  FROM review_likes rl
  WHERE rl.review_id = r.id
);
