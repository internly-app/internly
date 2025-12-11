-- Manual test to verify the like system works
-- Run these commands one by one in Supabase SQL Editor

-- STEP 1: Get your user ID (run this first)
SELECT auth.uid() as your_user_id;
-- Copy the UUID that appears

-- STEP 2: Get a review ID to test with
SELECT id, like_count
FROM reviews
LIMIT 1;
-- Copy the review ID

-- STEP 3: Check current like_count for this review
-- Replace 'YOUR_REVIEW_ID' with actual review ID from step 2
SELECT id, like_count
FROM reviews
WHERE id = 'YOUR_REVIEW_ID';

-- STEP 4: Manually insert a like (replace both IDs)
-- Replace 'YOUR_USER_ID' and 'YOUR_REVIEW_ID' with actual values
INSERT INTO review_likes (user_id, review_id)
VALUES ('YOUR_USER_ID', 'YOUR_REVIEW_ID');

-- STEP 5: Check if like_count increased
-- Replace 'YOUR_REVIEW_ID' with actual review ID
SELECT id, like_count
FROM reviews
WHERE id = 'YOUR_REVIEW_ID';
-- The like_count should have increased by 1 if trigger works

-- STEP 6: Delete the like
-- Replace 'YOUR_USER_ID' and 'YOUR_REVIEW_ID' with actual values
DELETE FROM review_likes
WHERE user_id = 'YOUR_USER_ID'
AND review_id = 'YOUR_REVIEW_ID';

-- STEP 7: Check if like_count decreased
-- Replace 'YOUR_REVIEW_ID' with actual review ID
SELECT id, like_count
FROM reviews
WHERE id = 'YOUR_REVIEW_ID';
-- The like_count should have decreased by 1 if trigger works

-- STEP 8: View all likes for debugging
SELECT
    rl.id,
    rl.user_id,
    rl.review_id,
    rl.created_at,
    r.like_count
FROM review_likes rl
JOIN reviews r ON r.id = rl.review_id
ORDER BY rl.created_at DESC
LIMIT 20;
