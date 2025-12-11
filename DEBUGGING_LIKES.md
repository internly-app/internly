# Debugging Like System - Step by Step

## Problem
Likes are not persisting when navigating between pages. They disappear after leaving and returning to the reviews page.

---

## Step 1: Verify Database Trigger Setup

### Run in Supabase SQL Editor:
```sql
-- Check if trigger exists
SELECT trigger_name, event_object_table, action_timing
FROM information_schema.triggers
WHERE trigger_name = 'update_review_like_count_trigger';
```

**Expected Result:** Should return 1 row showing the trigger exists

**If no result:** Run `/database/fix-like-count-rls.sql` again

---

## Step 2: Check Function Has SECURITY DEFINER

### Run in Supabase SQL Editor:
```sql
-- Check function security type
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_name = 'update_review_like_count';
```

**Expected Result:** `security_type` should be `DEFINER` (not `INVOKER`)

**If shows INVOKER:** The fix wasn't applied. Run `/database/fix-like-count-rls.sql` again

---

## Step 3: Test Trigger Manually

### Run these commands ONE BY ONE:

```sql
-- 1. Get your user ID
SELECT auth.uid();
```
**Copy the UUID that appears** (this is YOUR_USER_ID)

```sql
-- 2. Get a review to test with
SELECT id, like_count FROM reviews LIMIT 1;
```
**Copy the review ID** (this is YOUR_REVIEW_ID)

```sql
-- 3. Manually insert a like (REPLACE THE IDs)
INSERT INTO review_likes (user_id, review_id)
VALUES ('YOUR_USER_ID', 'YOUR_REVIEW_ID');
```

```sql
-- 4. Check if like_count increased (REPLACE THE ID)
SELECT id, like_count FROM reviews WHERE id = 'YOUR_REVIEW_ID';
```

**Expected:** like_count should have increased by 1

**If it didn't increase:** The trigger is broken or not running

---

## Step 4: Check Browser Network Tab

### In your browser:
1. Open DevTools (F12)
2. Go to Network tab
3. Click a heart icon on a review
4. Look for request to `/api/reviews/[id]/like`

**Check the response:**
- Status should be `200 OK`
- Response body should show `{ "liked": true }` or `{ "liked": false }`

**If you see errors:** Share the error message

---

## Step 5: Check Browser Console

### In your browser:
1. Open DevTools (F12)
2. Go to Console tab
3. Click a heart icon
4. Look for any errors (red text)

**Common errors to look for:**
- `401 Unauthorized` → You're not signed in
- `500 Internal Server Error` → Database error
- `Failed to like review` → API error

---

## Step 6: Verify Records in Database

### Run in Supabase SQL Editor:
```sql
-- Check if likes are being inserted
SELECT
    rl.id,
    rl.user_id,
    rl.review_id,
    rl.created_at,
    r.like_count
FROM review_likes rl
JOIN reviews r ON r.id = rl.review_id
ORDER BY rl.created_at DESC
LIMIT 10;
```

**Expected:** Should show recent likes you created

**If empty:** Likes are not being inserted at all - API issue

---

## Step 7: Test Frontend Like Logic

### Add console logging temporarily:

Edit `frontend/src/components/ReviewCard.tsx` - find the `handleLike` function (around line 81) and add logs:

```typescript
const handleLike = async (e: React.MouseEvent) => {
  e.stopPropagation();

  console.log('🔍 handleLike called', {
    isLiking,
    user,
    reviewId: review.id,
    currentLikeState: likeData
  });

  if (isLiking) return;

  if (!user) {
    console.log('❌ No user, redirecting to signin');
    window.location.href = "/signin";
    return;
  }

  setIsLiking(true);
  const previousState = { ...likeData };

  const newLikedState = !likeData.hasLiked;
  console.log('✅ Optimistic update:', { newLikedState });

  setLikeData({
    hasLiked: newLikedState,
    likeCount: newLikedState
      ? likeData.likeCount + 1
      : Math.max(0, likeData.likeCount - 1),
  });

  try {
    console.log('📡 Sending API request to:', `/api/reviews/${review.id}/like`);

    const response = await fetch(`/api/reviews/${review.id}/like`, {
      method: "POST",
    });

    console.log('📥 API response:', {
      status: response.status,
      ok: response.ok
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API error:', errorData);
      throw new Error(errorData.error || 'Failed to like');
    }

    const data = await response.json();
    console.log('✅ API success:', data);

  } catch (error) {
    console.error('❌ Like failed:', error);
    setLikeData(previousState);
    alert("Failed to update like. Please try again.");
  } finally {
    setIsLiking(false);
  }
};
```

### Then test:
1. Click a heart
2. Check console for the logs
3. Share what you see

---

## Step 8: Check If Data Persists in Database

### Test sequence:
1. Sign in
2. Like a review (note the review title)
3. **Don't navigate away yet**
4. Run this in SQL Editor (replace review title):

```sql
SELECT
    r.id,
    r.like_count,
    COUNT(rl.id) as actual_likes
FROM reviews r
LEFT JOIN review_likes rl ON rl.review_id = r.id
WHERE r.company_id IN (
    SELECT id FROM companies WHERE name ILIKE '%YOUR_COMPANY_NAME%'
)
GROUP BY r.id;
```

**Check:** Does `like_count` match `actual_likes`?

---

## Step 9: Test Navigation & Data Fetching

### Add logging to useReviews hook:

Edit `frontend/src/hooks/useReviews.ts` - in the `fetchReviews` function (around line 26):

```typescript
const fetchReviews = async () => {
  console.log('🔄 Fetching reviews...', { user, authLoading, query });
  setLoading(true);
  setError(null);

  try {
    const params = new URLSearchParams();
    // ... existing param code ...

    const url = `/api/reviews?${params.toString()}`;
    console.log('📡 Fetching from:', url);

    const response = await fetch(url, { cache: 'default' });
    console.log('📥 Response:', response.status, response.ok);

    if (!response.ok) {
      // ... existing error handling ...
    }

    const data: ReviewsResponse = await response.json();
    console.log('✅ Fetched reviews:', {
      count: data.reviews.length,
      total: data.total,
      sample: data.reviews[0]
    });

    setReviews(data.reviews);
    setTotal(data.total);
  } catch (err) {
    console.error('❌ Fetch error:', err);
    setError(err instanceof Error ? err.message : "Unknown error");
  } finally {
    setLoading(false);
  }
};
```

### Test:
1. Like a review
2. Navigate to About page
3. Come back to reviews
4. Check console logs - what data is being fetched?

---

## Common Issues & Solutions

### Issue 1: Trigger not working
**Symptom:** Manual insert doesn't update like_count
**Solution:** Run `/database/fix-like-count-rls.sql` again

### Issue 2: API returns 401
**Symptom:** Console shows "Unauthorized"
**Solution:** Make sure you're signed in, check auth token

### Issue 3: Data not persisting
**Symptom:** Database shows likes, but UI doesn't
**Solution:** Clear browser cache, check if `user_has_liked` is being returned correctly

### Issue 4: RLS blocking updates
**Symptom:** Trigger exists but like_count doesn't update
**Solution:** Verify function has `SECURITY DEFINER` in Step 2

---

## Quick Debug Commands

Run ALL of these in Supabase SQL Editor and share results:

```sql
-- 1. Trigger exists?
SELECT COUNT(*) FROM information_schema.triggers
WHERE trigger_name = 'update_review_like_count_trigger';

-- 2. Function is DEFINER?
SELECT security_type FROM information_schema.routines
WHERE routine_name = 'update_review_like_count';

-- 3. Any likes in database?
SELECT COUNT(*) FROM review_likes;

-- 4. Like counts accurate?
SELECT
    COUNT(*) as reviews_with_wrong_count
FROM reviews r
WHERE r.like_count != (
    SELECT COUNT(*) FROM review_likes WHERE review_id = r.id
);

-- 5. Recent activity?
SELECT
    'review_likes' as table_name,
    COUNT(*) as count,
    MAX(created_at) as latest
FROM review_likes
UNION ALL
SELECT
    'reviews',
    COUNT(*),
    MAX(updated_at)
FROM reviews;
```

**Share these results** and we can diagnose the exact issue!
