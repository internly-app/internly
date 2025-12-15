-- Migration: Rename work_style to work_location
-- Run this in Supabase SQL Editor

-- Step 1: Rename the column
ALTER TABLE reviews
RENAME COLUMN work_style TO work_location;

-- Step 2: Update indexes (if any exist that reference the column specifically)
-- Note: Indexes on the column will automatically be updated with the column rename

-- Step 3: Verify the change
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'reviews'
AND column_name = 'work_location';

-- Step 4: Verify data integrity (all values should still be valid)
SELECT work_location, COUNT(*) as count
FROM reviews
GROUP BY work_location;

-- Expected result: Only 'onsite', 'hybrid', or 'remote'
