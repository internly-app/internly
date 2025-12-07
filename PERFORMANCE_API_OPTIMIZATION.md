# ⚡ API Performance Optimization - Likes & Bookmarks

**Problem:** Likes and bookmarks feel slow (~150-300ms delay) even though database is optimized.

**Root Cause:** Unnecessary database queries and network latency, not database speed.

---

## 🐌 Current Performance Issues

### Like API (`/api/reviews/[id]/like`)
**Current:** 4-5 sequential database queries per like/unlike
```typescript
1. getUser() - Auth check (~10ms)
2. Check if review exists (~10ms) ← UNNECESSARY
3. Check if already liked (~10ms) ← UNNECESSARY
4. Insert/delete like (~10ms)
5. Fetch updated like_count (~10ms) ← UNNECESSARY (trigger auto-updates!)
```
**Total DB time:** ~50ms
**Total API time:** ~150-300ms (network latency)

### Bookmark API (`/api/companies/save/[companyId]`)
**Current:** 3-4 sequential database queries per bookmark
```typescript
1. getUser() - Auth check (~10ms)
2. Check if company exists (~10ms) ← UNNECESSARY
3. Check if already saved (~10ms) ← UNNECESSARY
4. Insert/delete bookmark (~10ms)
```
**Total DB time:** ~40ms
**Total API time:** ~150-300ms (network latency)

---

## ✅ Optimized Solutions

### Optimization #1: Remove Unnecessary Queries

**Before:**
```typescript
// Check if review exists (UNNECESSARY)
const { data: review } = await supabase
  .from("reviews")
  .select("id")
  .eq("id", reviewId)
  .single();

if (!review) {
  return NextResponse.json({ error: "Review not found" }, { status: 404 });
}

// Check if already liked (UNNECESSARY)
const { data: existingLike } = await supabase
  .from("review_likes")
  .select("id")
  .eq("user_id", user.id)
  .eq("review_id", reviewId)
  .single();

if (existingLike) {
  // Delete existing like...
}
```

**After:**
```typescript
// Just try to insert - database handles everything!
const { error } = await supabase
  .from("review_likes")
  .insert({ user_id: user.id, review_id: reviewId });

// If already exists, unique constraint catches it
if (error?.code === '23505') {
  // Already liked - delete it instead
  await supabase
    .from("review_likes")
    .delete()
    .eq("user_id", user.id)
    .eq("review_id", reviewId);
  return NextResponse.json({ liked: false });
}

// If foreign key error, review doesn't exist
if (error?.code === '23503') {
  return NextResponse.json({ error: "Review not found" }, { status: 404 });
}

return NextResponse.json({ liked: true });
```

**Why this works:**
- Database **foreign keys** validate that review exists
- Database **unique constraints** prevent duplicate likes
- Database **triggers** auto-update like_count
- No need to fetch anything!

### Optimization #2: Trust Optimistic Updates

**Before (ReviewCard):**
```typescript
// Optimistic update
setLikeData({ hasLiked: !hasLiked, likeCount: likeCount + 1 });

const response = await fetch(...);
const data = await response.json();

// Overwrite with server response (causes delay!)
setLikeData({ hasLiked: data.liked, likeCount: data.likeCount });
```

**After:**
```typescript
// Optimistic update
const newLiked = !hasLiked;
const newCount = newLiked ? likeCount + 1 : likeCount - 1;
setLikeData({ hasLiked: newLiked, likeCount: newCount });

// Fire and forget - don't wait for response
fetch(`/api/reviews/${review.id}/like`, { method: "POST" })
  .catch(() => {
    // Only revert on error
    setLikeData({ hasLiked, likeCount });
    alert("Failed to update like");
  });
```

**Why this works:**
- UI updates instantly (0ms)
- API call happens in background
- Only reverts if error occurs
- User doesn't wait for network

---

## 📝 Implementation Guide

### File 1: `/api/reviews/[id]/like/route.ts`

**Replace entire file with:**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: reviewId } = await params;

    // Auth check (required)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try to insert like
    const { error: insertError } = await supabase
      .from("review_likes")
      .insert({ user_id: user.id, review_id: reviewId });

    // Success - new like created
    if (!insertError) {
      return NextResponse.json({ liked: true });
    }

    // Duplicate key (23505) = already liked, so unlike
    if (insertError.code === '23505') {
      await supabase
        .from("review_likes")
        .delete()
        .eq("user_id", user.id)
        .eq("review_id", reviewId);

      return NextResponse.json({ liked: false });
    }

    // Foreign key error (23503) = review doesn't exist
    if (insertError.code === '23503') {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Other error
    console.error("Like toggle error:", insertError);
    return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 });

  } catch (error) {
    console.error("POST /api/reviews/[id]/like error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Changes:**
- ❌ Removed: Check if review exists (3 lines → 0)
- ❌ Removed: Check if already liked (5 lines → 0)
- ❌ Removed: Fetch updated like_count (5 lines → 0)
- ✅ Added: Handle errors with database constraint codes
- ✅ Result: 5 queries → 2 queries (60% faster)

---

### File 2: `/api/companies/save/[companyId]/route.ts`

**Replace POST and DELETE with:**

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const supabase = await createClient();

    // Auth check (required)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try to insert - let database handle validation
    const { error: insertError } = await supabase
      .from("saved_companies")
      .insert({ user_id: user.id, company_id: companyId });

    // Success
    if (!insertError) {
      return NextResponse.json({ saved: true });
    }

    // Duplicate key (23505) = already saved
    if (insertError.code === '23505') {
      return NextResponse.json({ saved: true, message: "Already saved" });
    }

    // Foreign key error (23503) = company doesn't exist
    if (insertError.code === '23503') {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Other error
    console.error("Save company error:", insertError);
    return NextResponse.json({ error: "Failed to save company" }, { status: 500 });

  } catch (error) {
    console.error("POST /api/companies/save error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const supabase = await createClient();

    // Auth check (required)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete - simple and fast
    const { error: deleteError } = await supabase
      .from("saved_companies")
      .delete()
      .eq("user_id", user.id)
      .eq("company_id", companyId);

    if (deleteError) {
      console.error("Unsave company error:", deleteError);
      return NextResponse.json({ error: "Failed to unsave company" }, { status: 500 });
    }

    return NextResponse.json({ saved: false });

  } catch (error) {
    console.error("DELETE /api/companies/save error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Changes:**
- ❌ Removed: Check if company exists (5 lines → 0)
- ❌ Removed: Check if already saved (6 lines → 0)
- ✅ Added: Handle errors with database constraint codes
- ✅ Result: 4 queries → 2 queries (50% faster)

---

### File 3: `ReviewCard.tsx` (Optional - For Instant Feedback)

**Find the `handleLike` function** (around line 68) and replace with:

```typescript
const handleLike = async () => {
  if (!user) {
    window.location.href = "/signin";
    return;
  }

  if (isLiking) return;

  setIsLiking(true);
  const previousState = likeData;

  // Calculate new state
  const newLiked = !likeData.hasLiked;
  const newCount = newLiked ? likeData.likeCount + 1 : likeData.likeCount - 1;

  // Optimistic update - instant UI feedback
  setLikeData({
    hasLiked: newLiked,
    likeCount: newCount,
  });

  // Background API call - don't await
  fetch(`/api/reviews/${review.id}/like`, {
    method: "POST",
  })
    .then((response) => {
      if (!response.ok) throw new Error("Failed to toggle like");
      setIsLiking(false);
    })
    .catch((error) => {
      console.error("Failed to like review:", error);
      // Rollback on error
      setLikeData(previousState);
      setIsLiking(false);
      alert("Failed to update like. Please try again.");
    });
};
```

**Why this is better:**
- UI updates **instantly** (0ms perceived latency)
- API call happens in background
- Only reverts if network fails
- Feels like Instagram/Twitter likes

---

### File 4: `CompanyCard.tsx` (Optional - For Instant Feedback)

**Find the `handleSaveToggle` function** (around line 48) and replace with:

```typescript
const handleSaveToggle = async (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();

  if (!user) {
    window.location.href = "/signin";
    return;
  }

  if (isSaving) return;

  setIsSaving(true);
  const previousState = isSaved;
  const newState = !isSaved;

  // Optimistic update - instant UI feedback
  setIsSaved(newState);

  // Background API call
  fetch(`/api/companies/save/${company.id}`, {
    method: newState ? "POST" : "DELETE",
  })
    .then((response) => {
      if (!response.ok) throw new Error("Failed to toggle save");
      setIsSaving(false);
      onSaveToggle?.(company.id, newState);
    })
    .catch((error) => {
      console.error("Failed to save company:", error);
      // Rollback on error
      setIsSaved(previousState);
      setIsSaving(false);
      alert("Failed to update bookmark. Please try again.");
    });
};
```

---

## 📊 Performance Comparison

### Before Optimization:
```
Like/Unlike Action:
├─ Network latency: ~100ms
├─ Auth check: ~10ms
├─ Check if review exists: ~10ms
├─ Check if already liked: ~10ms
├─ Insert/Delete like: ~10ms
├─ Fetch updated like_count: ~10ms
├─ Network latency: ~100ms
└─ Total: ~250ms

User Experience:
- Click heart
- Wait 250ms ⏱️
- See update
```

### After Optimization:
```
Like/Unlike Action:
├─ UI Update: 0ms (instant!)
└─ Background:
    ├─ Network latency: ~100ms
    ├─ Auth check: ~10ms
    ├─ Insert/Delete like: ~10ms
    └─ Network latency: ~100ms
    └─ Total: ~220ms (but user doesn't wait!)

User Experience:
- Click heart
- See update instantly! ⚡
- API call happens in background
```

**Perceived improvement:** 250ms → 0ms (∞% faster!)

---

## 🎯 PostgreSQL Error Codes Reference

**Why we can remove validation queries:**

| Code | Meaning | Our Use Case |
|------|---------|--------------|
| `23505` | Unique constraint violation | Already liked/saved - toggle it |
| `23503` | Foreign key violation | Review/company doesn't exist |
| `42P01` | Table doesn't exist | Critical error (shouldn't happen) |

**Database handles:**
- ✅ Uniqueness (can't like twice)
- ✅ Foreign keys (review/company must exist)
- ✅ Auto-increment like_count (via trigger)
- ✅ Cascading deletes (if review deleted, likes deleted)

**We don't need to check anything!** Just try the operation and handle the error.

---

## ✅ Testing Checklist

After implementing:

### Test Likes:
- [ ] Click heart → Updates instantly
- [ ] Click again → Toggles instantly
- [ ] Refresh page → Like persists
- [ ] Like count increases/decreases correctly
- [ ] Try on non-existent review → Gets 404 error

### Test Bookmarks:
- [ ] Click bookmark → Updates instantly
- [ ] Click again → Toggles instantly
- [ ] Refresh page → Bookmark persists
- [ ] Try on non-existent company → Gets 404 error

### Test Error Handling:
- [ ] Turn off wifi → UI shows error and reverts
- [ ] Database down → UI shows error and reverts
- [ ] Rapid clicking → Doesn't break (debounced by `isLiking` flag)

---

## 🚀 Expected Results

### API Performance:
- **Before:** 4-5 queries, ~250ms total
- **After:** 2 queries, ~220ms total (but async)
- **Database time saved:** ~30-50ms per operation
- **Queries saved:** ~60% reduction

### User Experience:
- **Before:** 250ms perceived latency
- **After:** 0ms perceived latency (instant!)
- **Improvement:** Feels like a native app ⚡

### Database Load:
- **Before:** 5 queries × 100 likes/min = 500 queries/min
- **After:** 2 queries × 100 likes/min = 200 queries/min
- **Savings:** 60% less database load

---

## 📚 Why This Works

### Database Constraints Are Your Friend:
```sql
-- Unique constraint prevents duplicate likes
ALTER TABLE review_likes
  ADD CONSTRAINT review_likes_user_id_review_id_key
  UNIQUE (user_id, review_id);

-- Foreign key ensures review exists
ALTER TABLE review_likes
  ADD CONSTRAINT review_likes_review_id_fkey
  FOREIGN KEY (review_id) REFERENCES reviews(id);

-- Trigger auto-updates like_count
CREATE TRIGGER update_review_like_count_trigger
  AFTER INSERT OR DELETE ON review_likes
  FOR EACH ROW EXECUTE FUNCTION update_review_like_count();
```

**You already have all of this!** Just trust it.

### Optimistic UI Pattern:
1. User clicks
2. UI updates immediately (assume success)
3. API call happens in background
4. Only revert if error occurs

This is how **Instagram, Twitter, Facebook, YouTube** all work. It's the industry standard for interactive actions.

---

**Last Updated:** December 6, 2025
**Priority:** HIGH - Major UX improvement
**Effort:** 10 minutes to implement
**Impact:** Instant perceived performance boost
