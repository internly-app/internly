# Internly Database Documentation

## Overview

Internly uses PostgreSQL via Supabase for storing company information, internship reviews, and user data.

**Database:** PostgreSQL 15+ (Supabase)
**Schema File:** `schema.sql`

---

## Quick Setup

1. Go to your Supabase project → SQL Editor
2. Copy and paste the contents of `schema.sql`
3. Run the SQL script

This creates all tables, indexes, triggers, and security policies.

---

## Database Schema

### Tables

#### 1. **companies**
Stores company information.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Company name (unique) |
| slug | TEXT | URL-friendly identifier (unique) |
| logo_url | TEXT | Company logo URL |
| website | TEXT | Company website |
| industry | TEXT | Industry category |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Security:** Public read, authenticated write

---

#### 2. **roles**
Job roles at companies (e.g., "Software Engineering Intern").

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| title | TEXT | Role title |
| slug | TEXT | URL-friendly identifier |
| company_id | UUID | Foreign key → companies.id |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Unique Constraint:** One slug per company
**Security:** Public read, authenticated write

---

#### 3. **reviews**
Detailed internship reviews from users.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| user_id | UUID | ✓ | Foreign key → auth.users.id |
| company_id | UUID | ✓ | Foreign key → companies.id |
| role_id | UUID | ✓ | Foreign key → roles.id |
| location | TEXT | ✓ | Internship location |
| term | TEXT | ✓ | e.g., "Summer 2024" |
| duration_months | INTEGER | | Duration in months |
| work_style | TEXT | ✓ | onsite, hybrid, or remote |
| team_name | TEXT | | Team name |
| technologies | TEXT | | Tech stack used |
| hardest | TEXT | ✓ | Hardest part of internship |
| best | TEXT | ✓ | Best part of internship |
| advice | TEXT | | Advice for future interns |
| wage_hourly | NUMERIC | ✓ | Hourly wage |
| wage_currency | TEXT | ✓ | Currency (default: CAD) |
| housing_stipend_provided | BOOLEAN | ✓ | Housing provided? |
| housing_stipend | NUMERIC | | Housing stipend amount |
| perks | TEXT | | Additional perks |
| interview_round_count | INTEGER | ✓ | Number of interview rounds |
| interview_rounds_description | TEXT | ✓ | Interview process details |
| interview_tips | TEXT | | Tips for interviews |
| like_count | INTEGER | ✓ | Number of likes (auto-updated) |
| created_at | TIMESTAMPTZ | ✓ | Creation timestamp |
| updated_at | TIMESTAMPTZ | ✓ | Last update timestamp |

**Unique Constraint:** One review per user per role
**Security:** Public read, users manage their own

---

#### 4. **review_likes**
Tracks which users liked which reviews.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key → auth.users.id |
| review_id | UUID | Foreign key → reviews.id |
| created_at | TIMESTAMPTZ | Creation timestamp |

**Unique Constraint:** One like per user per review
**Security:** Public read, users manage their own

---

#### 5. **saved_companies**
User bookmarks for companies.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key → auth.users.id |
| company_id | UUID | Foreign key → companies.id |
| created_at | TIMESTAMPTZ | Creation timestamp |

**Unique Constraint:** One save per user per company
**Security:** Private (users only see their own)

---

## Key Features

### 1. Automatic Timestamps
The `updated_at` field is automatically updated when records are modified.

### 2. Automatic Like Counts
When users like/unlike reviews, the `like_count` field updates automatically via database trigger.

### 3. Row Level Security (RLS)
All tables have RLS enabled with appropriate policies:
- **Companies & Roles:** Anyone can view, authenticated users can create
- **Reviews:** Anyone can view, users can only edit/delete their own
- **Review Likes:** Public counts, users manage their own likes
- **Saved Companies:** Private, users only see their own

### 4. Performance Indexes
Optimized indexes for common queries:
- Company and role lookups
- Reviews filtered by company, role, or work style
- Reviews sorted by likes or date
- Full-text search on company names, industries, and technologies
- Partial indexes for wage and housing filters

---

## Common Operations

### Create a Company
```sql
INSERT INTO companies (name, slug, website, industry)
VALUES ('Google', 'google', 'https://careers.google.com', 'Technology');
```

### Create a Role
```sql
INSERT INTO roles (title, slug, company_id)
VALUES ('Software Engineering Intern', 'software-engineering-intern', 'company-uuid');
```

### Get Reviews for a Company
```sql
SELECT * FROM reviews
WHERE company_id = 'company-uuid'
ORDER BY like_count DESC
LIMIT 20;
```

### Check if User Liked a Review
```sql
SELECT EXISTS(
  SELECT 1 FROM review_likes
  WHERE user_id = 'user-uuid' AND review_id = 'review-uuid'
);
```

---

## Maintenance

### Weekly
```sql
-- Update query planner statistics
ANALYZE companies;
ANALYZE roles;
ANALYZE reviews;
ANALYZE review_likes;
ANALYZE saved_companies;
```

### As Needed
```sql
-- Fix incorrect like counts (if needed)
UPDATE reviews r
SET like_count = (
  SELECT COUNT(*) FROM review_likes WHERE review_id = r.id
);
```

---

## Recommendations for Future

### High Priority
1. **Add review status field** - Enable drafts, moderation, flagging
2. **Implement soft deletes** - Retain data for analytics
3. **Add audit logging** - Track changes to critical data

### Medium Priority
4. **Company statistics caching** - Pre-calculate review counts, averages
5. **User profiles table** - Email verification, university, graduation year
6. **Rate limiting** - Prevent spam and abuse

### Low Priority
7. **Table partitioning** - For reviews table when it grows large (1M+ rows)
8. **Materialized views** - For complex analytics queries
9. **Vector embeddings** - For semantic search and recommendations

---

## Troubleshooting

### Query Performance Issues
```sql
-- Check if indexes are being used
EXPLAIN ANALYZE
SELECT * FROM reviews
WHERE company_id = 'uuid'
ORDER BY like_count DESC;
```
Should show: `Index Scan using idx_reviews_company_likes`

### RLS Policy Errors
- Verify user is authenticated: `SELECT auth.uid();`
- Check policy matches your use case
- Test with Supabase SQL Editor in authenticated session

### Duplicate Key Errors
- **reviews:** User already reviewed this role
- **review_likes:** User already liked this review
- **saved_companies:** User already saved this company

---

**Last Updated:** December 15, 2025
**Status:** Production Ready
