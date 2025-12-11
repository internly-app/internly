-- Debug script to check like system setup
-- Run this in Supabase SQL Editor to diagnose issues

-- 1. Check if the trigger exists
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE trigger_name = 'update_review_like_count_trigger';

-- 2. Check if the function exists and has SECURITY DEFINER
SELECT
    routine_name,
    routine_type,
    security_type,
    routine_definition
FROM information_schema.routines
WHERE routine_name = 'update_review_like_count';

-- 3. Check current state of review_likes table
SELECT
    COUNT(*) as total_likes,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT review_id) as reviews_with_likes
FROM review_likes;

-- 4. Check if like_counts match actual likes
SELECT
    r.id,
    r.like_count as stored_count,
    COUNT(rl.id) as actual_count,
    CASE
        WHEN r.like_count = COUNT(rl.id) THEN '✓ Match'
        ELSE '✗ MISMATCH'
    END as status
FROM reviews r
LEFT JOIN review_likes rl ON rl.review_id = r.id
GROUP BY r.id, r.like_count
HAVING r.like_count != COUNT(rl.id) OR r.like_count > 0
ORDER BY r.like_count DESC;

-- 5. Check RLS policies on reviews table
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'reviews';

-- 6. Check RLS policies on review_likes table
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'review_likes';

-- 7. Test trigger manually (replace with your actual user_id and review_id)
-- First, let's see what reviews exist
SELECT
    id as review_id,
    like_count,
    company_id
FROM reviews
LIMIT 5;

-- 8. Show recent review_likes to see if they're being inserted
SELECT
    id,
    user_id,
    review_id,
    created_at
FROM review_likes
ORDER BY created_at DESC
LIMIT 10;
