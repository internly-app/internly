## Internly Frontend

Internly is a dark-mode Next.js 15 app for browsing and contributing internship reviews powered by Supabase (Postgres + Auth). This package contains the UI, API routes, and Supabase client helpers.

## Prerequisites

- Node 20+
- Supabase project with the `reviews`, `review_likes`, `companies`, and `roles` tables from the `/database` folder
- Environment variables in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_URL=...
```

## Development

Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to browse the feed. Review creation lives at `/reviews/new`.

## Authentication

- Users can sign in with Google OAuth or create an email/password account.
- `/auth/callback` exchanges the Supabase auth code and redirects back to the requested page.
- Configure Supabase Auth → URL Configuration with the site URL (e.g., `http://localhost:3000`) and add `http://localhost:3000/auth/callback` as an allowed redirect.
- Review creation and liking are gated server-side, so the `user_id` is always attached on the backend.

## Testing the flow

1. Start the dev server.
2. Go to `/reviews/new` and sign in via Google or email.
3. After authentication, the review form appears automatically and likes become available.

For production builds run `npm run build` followed by `npm start`.
