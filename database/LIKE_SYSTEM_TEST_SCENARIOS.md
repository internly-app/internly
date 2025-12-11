# Like System Test Scenarios

## Overview
- **Like Count**: Shared across all users (total number of likes)
- **Heart Highlight**: User-specific (red/filled only if YOU liked it)
- **Persistence**: Likes stay in database across sessions

---

## Scenario 1: First User Likes a Review

### Initial State
```
Review: "Google - Software Engineer Intern"
Like Count: 0
Heart: ○ (outline, not highlighted)
```

### User A Signs In and Likes
**User A's View:**
```
Review: "Google - Software Engineer Intern"
Like Count: 1
Heart: ❤️ (filled red - highlighted)
```

**What Happened:**
- Clicked heart → API inserted record into `review_likes` table
- Database trigger updated `like_count` from 0 → 1
- Frontend shows filled red heart because User A liked it

---

## Scenario 2: User A Navigates Away and Returns

### User A Visits "About Us" Page → Returns to Reviews

**User A's View (Should Still See):**
```
Review: "Google - Software Engineer Intern"
Like Count: 1
Heart: ❤️ (filled red - STILL highlighted)
```

**Why It Persists:**
- Record exists in `review_likes` table: `(user_a_id, review_id)`
- API checks if User A has liked this review
- Returns `user_has_liked: true`

---

## Scenario 3: User B Signs In (Different Account)

### User B's View of Same Review
**User B's View:**
```
Review: "Google - Software Engineer Intern"
Like Count: 1
Heart: ○ (outline - NOT highlighted)
```

**Explanation:**
- ✅ Like count shows 1 (from User A's like)
- ❌ Heart NOT highlighted (User B hasn't liked it yet)
- API checked `review_likes` for User B → no record found
- Returns `user_has_liked: false`

---

## Scenario 4: User B Also Likes the Review

### User B Clicks Heart
**User B's View:**
```
Review: "Google - Software Engineer Intern"
Like Count: 2
Heart: ❤️ (filled red - NOW highlighted)
```

**User A's View (If They Refresh):**
```
Review: "Google - Software Engineer Intern"
Like Count: 2
Heart: ❤️ (still filled red - STILL highlighted)
```

**What Happened:**
- User B's like added to database
- Trigger incremented `like_count` from 1 → 2
- Both users see count of 2
- Both users see highlighted hearts (each liked it)

---

## Scenario 5: User C (Not Signed In)

### Anonymous User's View
**User C's View (Logged Out):**
```
Review: "Google - Software Engineer Intern"
Like Count: 2
Heart: ○ (outline - NOT highlighted)
```

**Explanation:**
- ✅ Can see total like count (2 likes from A and B)
- ❌ Heart NOT highlighted (not signed in)
- API returns `user_has_liked: false` for anonymous users

### User C Tries to Like
**Result:**
- Redirected to `/signin` page
- Cannot like without being authenticated

---

## Scenario 6: User A Unlikes the Review

### User A Clicks Heart Again (Toggle Off)
**User A's View:**
```
Review: "Google - Software Engineer Intern"
Like Count: 1
Heart: ○ (outline - NO LONGER highlighted)
```

**User B's View (If They Refresh):**
```
Review: "Google - Software Engineer Intern"
Like Count: 1
Heart: ❤️ (still filled red - STILL highlighted)
```

**What Happened:**
- User A's record deleted from `review_likes`
- Trigger decremented `like_count` from 2 → 1
- User A sees unhighlighted heart (they unliked it)
- User B still sees highlighted heart (they still like it)

---

## Scenario 7: User A Logs Out

### User A Signs Out
**User A's View (After Logout):**
```
Review: "Google - Software Engineer Intern"
Like Count: 1
Heart: ○ (outline - NOT highlighted)
```

**Explanation:**
- ✅ Like count stays at 1 (User B's like persists)
- ❌ Heart NOT highlighted (logged out = no user-specific data)
- Even though User A previously liked it, they need to sign in to see their like status

---

## Scenario 8: Multiple Reviews, Multiple Users

### Complex Scenario
```
Review A: "Google - SWE Intern"
- User A: liked ❤️
- User B: not liked ○
- User C: liked ❤️
- Anonymous: not liked ○
→ Total Count: 2

Review B: "Meta - Data Science Intern"
- User A: not liked ○
- User B: liked ❤️
- User C: not liked ○
- Anonymous: not liked ○
→ Total Count: 1

Review C: "Tesla - Backend Engineer"
- User A: liked ❤️
- User B: liked ❤️
- User C: liked ❤️
- Anonymous: not liked ○
→ Total Count: 3
```

**User A's View:**
```
Review A: Count: 2, Heart: ❤️
Review B: Count: 1, Heart: ○
Review C: Count: 3, Heart: ❤️
```

**User B's View:**
```
Review A: Count: 2, Heart: ○
Review B: Count: 1, Heart: ❤️
Review C: Count: 3, Heart: ❤️
```

**Anonymous User's View:**
```
Review A: Count: 2, Heart: ○
Review B: Count: 1, Heart: ○
Review C: Count: 3, Heart: ○
```

---

## Summary: Expected Behavior Checklist

### ✅ What Should Work

1. **Persistence**
   - [ ] Likes persist when navigating between pages
   - [ ] Likes persist after browser refresh
   - [ ] Likes persist after logout/login

2. **Like Count (Global)**
   - [ ] All users see same like count
   - [ ] Count updates immediately after like/unlike
   - [ ] Anonymous users can see like counts

3. **Heart Highlight (User-Specific)**
   - [ ] Heart highlighted only for users who liked it
   - [ ] Heart NOT highlighted for other users
   - [ ] Heart NOT highlighted for anonymous users
   - [ ] Heart stays highlighted after page refresh (for users who liked it)

4. **Toggle Behavior**
   - [ ] Click heart when not liked → becomes liked (filled red)
   - [ ] Click heart when liked → becomes unliked (outline)
   - [ ] Count increments/decrements correctly

5. **Authentication**
   - [ ] Anonymous users cannot like (redirected to signin)
   - [ ] Signed-in users can like any review
   - [ ] Users can only unlike their own likes

---

## Testing Instructions

1. **Create 2-3 test accounts** in Supabase
2. **Sign in as User A**
   - Like 2-3 reviews
   - Note which ones you liked
   - Navigate to another page
   - Come back → hearts should still be highlighted
3. **Sign out**
   - View same reviews
   - Count should be same, hearts NOT highlighted
4. **Sign in as User B**
   - View same reviews
   - Count should be same, hearts NOT highlighted
   - Like 1-2 of the same reviews
   - Both counts should increase
5. **Sign back in as User A**
   - Your likes should still be highlighted
   - New counts should reflect User B's likes
6. **Test on different reviews**
   - Each user should have independent like status
   - Counts should be cumulative
