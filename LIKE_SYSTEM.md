# Like System Documentation

## Overview

The like system allows users to like/unlike reviews. Likes are:
- **Global count**: All users see the same total
- **User-specific state**: Heart is highlighted only if you liked it
- **Persistent**: Survives page navigation, refresh, and logout/login
- **Optimistic**: UI updates instantly, syncs with server in background

---

## Architecture

### Frontend Components

**ReviewCard** (`frontend/src/components/ReviewCard.tsx`)
- Displays like button with heart icon
- Shows like count next to heart
- Handles optimistic updates (instant UI feedback)
- Rolls back on error

**useReviews Hook** (`frontend/src/hooks/useReviews.ts`)
- Fetches reviews with user-specific like status
- Uses `cache: 'no-store'` for authenticated users (prevents stale data)
- Uses `cache: 'default'` for anonymous users (performance)

### Backend API

**POST /api/reviews/[id]/like** (`frontend/src/app/api/reviews/[id]/like/route.ts`)
- Toggles like state (insert or delete)
- Returns `{ liked: true/false }`
- Handles authentication
- Uses database constraints to prevent duplicates

**GET /api/reviews** (`frontend/src/app/api/reviews/route.ts`)
- Fetches reviews with like counts
- Includes `user_has_liked` for authenticated users
- Single optimized query with JOIN

### Database

**Tables:**
- `reviews` - Stores review data with `like_count` column
- `review_likes` - Junction table for user likes
  - Unique constraint on `(user_id, review_id)` prevents duplicate likes

**Trigger:**
```sql
CREATE TRIGGER update_review_like_count_trigger
AFTER INSERT OR DELETE ON review_likes
FOR EACH ROW EXECUTE FUNCTION update_review_like_count();
```

**Function** (with `SECURITY DEFINER` to bypass RLS):
```sql
CREATE OR REPLACE FUNCTION update_review_like_count()
RETURNS TRIGGER
SECURITY DEFINER
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
```

---

## How It Works

### User Likes a Review

1. **Frontend:**
   - User clicks heart icon
   - Optimistic update: Heart fills, count increments instantly
   - Fire-and-forget API call to `/api/reviews/[id]/like`
   - Button re-enables after 200ms

2. **Backend:**
   - Receives POST request
   - Inserts row into `review_likes` table
   - Database trigger fires automatically
   - Trigger increments `like_count` on review
   - Returns `{ liked: true }`

3. **Error Handling:**
   - If API fails, frontend silently rolls back UI state
   - User can retry

### User Navigates Away and Returns

1. **Frontend:**
   - Page component unmounts, local state is lost
   - User navigates back, page remounts
   - `useReviews` hook fetches fresh data (no cache for auth users)
   - Includes `user_has_liked: true` for reviews they liked
   - ReviewCard displays filled heart based on server data

2. **Backend:**
   - Query checks `review_likes` table for user's likes
   - Returns array of review IDs user has liked
   - Maps to `user_has_liked` boolean on each review

---

## Performance Optimizations

### Optimistic Updates
- UI updates **instantly** (<16ms)
- No waiting for server response
- Feels like a native app

### Fire-and-Forget API Calls
- API request happens in background
- Doesn't block UI
- Button re-enables in 200ms (industry standard)

### No Cache for Authenticated Users
```typescript
cache: user ? 'no-store' : 'default'
```
- Ensures fresh `user_has_liked` data
- Prevents stale cache issues
- Anonymous users still get cached data for performance

### Database Indexes
- `idx_review_likes_user_id` - Fast lookup of user's likes
- `idx_review_likes_review_id` - Fast counting of review likes
- Unique constraint prevents duplicate likes at DB level

### Single Query for Like Status
- Fetches all user likes in one query using `IN` clause
- Maps to Set for O(1) lookup
- No N+1 query problem

---

## Setup Instructions

### 1. Database Setup

Run the RLS fix to ensure trigger works correctly:

```sql
-- In Supabase SQL Editor, run:
-- /database/fix-like-count-rls.sql
```

This ensures the trigger function has `SECURITY DEFINER` to bypass RLS when updating like counts.

### 2. Verify Setup

Check that trigger exists:
```sql
SELECT COUNT(*) FROM information_schema.triggers
WHERE trigger_name = 'update_review_like_count_trigger';
-- Should return: 1
```

Check that function has correct security:
```sql
SELECT security_type FROM information_schema.routines
WHERE routine_name = 'update_review_like_count';
-- Should return: DEFINER
```

### 3. Fix Incorrect Counts (if needed)

If like counts are out of sync:
```sql
UPDATE reviews r
SET like_count = (
  SELECT COUNT(*) FROM review_likes WHERE review_id = r.id
);
```

---

## Expected Behavior

### ✅ Authenticated User
- Can like/unlike any review
- Heart is highlighted for reviews they liked
- Likes persist across navigation
- Likes persist after refresh
- Likes persist after logout/login

### ✅ Anonymous User
- Can see like counts
- Hearts are never highlighted
- Clicking heart redirects to `/signin`
- Cannot like without authentication

### ✅ Multiple Users
- Each user has independent like state
- All users see the same total count
- Liking increments count for everyone
- Unliking decrements count for everyone

---

## Troubleshooting

### Likes don't persist after navigation
**Cause:** Database trigger not set up correctly
**Fix:** Run `/database/fix-like-count-rls.sql`

### "Failed to update like" error
**Causes:**
- Not authenticated → Sign in first
- Review not found → Check review ID
- RLS blocking → Verify trigger has `SECURITY DEFINER`

### Like count is wrong
**Cause:** Counts out of sync with `review_likes` table
**Fix:** Run the fix query in Setup Instructions section above

### UI feels slow
**Cause:** You may be on slow network
**Normal behavior:** UI updates instantly, server sync happens in background

---

## Technical Details

### Why SECURITY DEFINER?
The trigger function needs `SECURITY DEFINER` to bypass Row Level Security (RLS) when updating `like_count`. Without it, the trigger would fail when trying to update reviews that the current user doesn't own.

### Why Fire-and-Forget?
Waiting for the server response adds 100-500ms of perceived latency. Fire-and-forget with optimistic updates makes the UI feel instant (same as Instagram, Twitter, Facebook).

### Why 200ms Debounce?
- <100ms: Too fast, users might accidentally double-click
- 200ms: Sweet spot - feels instant, prevents spam
- >500ms: Feels sluggish

### Why No Cache for Auth Users?
Caching user-specific data (`user_has_liked`) can cause stale state after mutations. Fresh data ensures hearts stay highlighted correctly after navigation.

---

## Database Schema

```sql
-- Reviews table
CREATE TABLE reviews (
  id UUID PRIMARY KEY,
  like_count INTEGER NOT NULL DEFAULT 0,
  -- ... other columns
);

-- Review likes junction table
CREATE TABLE review_likes (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, review_id) -- Prevent duplicate likes
);

-- Indexes
CREATE INDEX idx_review_likes_user_id ON review_likes(user_id);
CREATE INDEX idx_review_likes_review_id ON review_likes(review_id);
```

---

**Last Updated:** December 2024
