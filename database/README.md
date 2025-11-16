# Database Setup Guide

## Run the Schema in Supabase

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `database/schema.sql`
4. Paste and run the SQL

This will create:

- `companies` table
- `roles` table
- `reviews` table
- `review_likes` table
- All necessary indexes for performance
- Row Level Security policies
- Triggers for automatic like counting

## Next Steps After Running Schema

### 1. Create Your First Company

Use the Supabase dashboard or API to insert a company:

```sql
INSERT INTO companies (name, slug, website, industry)
VALUES (
  'Google',
  'google',
  'https://careers.google.com',
  'Technology'
)
RETURNING id;
```

Save the returned UUID.

### 2. Create a Role for That Company

```sql
INSERT INTO roles (title, slug, company_id)
VALUES (
  'Software Engineering Intern',
  'software-engineering-intern',
  'YOUR_COMPANY_UUID_HERE'
)
RETURNING id;
```

Save the returned UUID.

### 3. Use These IDs in the Review Form

When creating a review at `/reviews/new`, use the company_id and role_id you just created.

## API Endpoints

All endpoints are now live:

- `GET /api/reviews` - Paginated reviews feed
- `POST /api/reviews` - Create a review (authenticated)
- `POST /api/reviews/[id]/like` - Toggle like (authenticated)

## Authentication

Authentication is required for:

- Creating reviews
- Liking reviews

Set up Supabase Auth to enable these features. The RLS policies are already configured.

## Testing Without Auth

To test the review creation without setting up auth first, temporarily disable RLS:

```sql
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE review_likes DISABLE ROW LEVEL SECURITY;
```

**WARNING:** Re-enable RLS before going to production!

```sql
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;
```
