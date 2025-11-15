# 📁 Internly Project Structure Explained

## Overview

Your project is now set up to use **Next.js for everything** (frontend + backend), with Supabase as your database.

```
internly/
├── frontend/           ← YOUR MAIN WORKSPACE (Next.js)
├── backend/            ← Reserved for future AI features (FastAPI - not used yet)
└── docs/               ← Documentation
```

---

## 📂 Frontend Structure (Where You'll Work)

```
frontend/
├── src/
│   ├── app/                    ← Pages & API Routes
│   │   ├── page.tsx           ← Home page (http://localhost:3000)
│   │   ├── layout.tsx         ← Root layout (wraps all pages)
│   │   └── api/               ← **YOUR BACKEND** (API endpoints)
│   │       ├── health/
│   │       │   └── route.ts   ← GET /api/health
│   │       └── test/
│   │           └── route.ts   ← GET /api/test (Supabase test)
│   │
│   ├── lib/                    ← Utilities & Helpers
│   │   ├── supabase/          ← **Supabase Clients**
│   │   │   ├── client.ts      ← Use in Client Components ("use client")
│   │   │   ├── server.ts      ← Use in API routes & Server Components
│   │   │   └── middleware.ts  ← Auth session refresh (auto-runs)
│   │   │
│   │   ├── validations/       ← **Validation Schemas**
│   │   │   └── schemas.ts     ← Zod schemas for data validation
│   │   │
│   │   └── types/             ← **TypeScript Types**
│   │       └── database.ts    ← Database table types
│   │
│   ├── components/             ← React Components (you'll create these)
│   │
│   └── middleware.ts           ← Auth middleware (already configured)
│
├── .env.local                  ← **Your secrets** (NOT in git)
├── .env.example                ← Template for team members
├── package.json                ← Dependencies
└── next.config.ts              ← Next.js configuration
```

---

## 🎯 Key Files You Need to Know

### 1. **API Routes** (`src/app/api/`)

**What:** Your backend endpoints  
**When to use:** When you need to fetch/create/update data from Supabase

**Example:** Create a new API route

```
src/app/api/internships/route.ts  ← GET/POST /api/internships
```

**Pattern:**

```typescript
// src/app/api/internships/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.from("internships").select("*");
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();
  const { data } = await supabase.from("internships").insert(body);
  return NextResponse.json(data);
}
```

---

### 2. **Supabase Clients** (`src/lib/supabase/`)

**`client.ts` - For Client Components**

```typescript
"use client"; // Components that run in the browser
import { createClient } from "@/lib/supabase/client";

export default function MyComponent() {
  const supabase = createClient();
  // Use supabase here
}
```

**`server.ts` - For Server Components & API Routes**

```typescript
// No 'use client' - runs on server
import { createClient } from "@/lib/supabase/server";

export default async function MyPage() {
  const supabase = await createClient(); // Note: await!
  const { data } = await supabase.from("internships").select("*");
  return <div>{/* render data */}</div>;
}
```

**`middleware.ts` - Auto-runs (don't touch)**

- Refreshes auth sessions automatically
- Already configured in `src/middleware.ts`

---

### 3. **Validation Schemas** (`src/lib/validations/schemas.ts`)

**What:** Data validation with Zod  
**Why:** Type-safe validation, prevents bad data

**Already includes schemas for:**

- `internshipCreateSchema` - Creating internships
- `reviewCreateSchema` - Creating reviews
- `profileUpdateSchema` - Updating user profiles

**Usage:**

```typescript
import { internshipCreateSchema } from "@/lib/validations/schemas";

const body = await request.json();
const validated = internshipCreateSchema.parse(body); // Throws if invalid
```

---

### 4. **Database Types** (`src/lib/types/database.ts`)

**What:** TypeScript types for your Supabase tables  
**Why:** Type safety when querying database

**Already includes types for:**

- `internships` table
- `reviews` table
- `test_records` table

---

### 5. **Environment Variables** (`.env.local`)

**What:** Your Supabase credentials  
**⚠️ NEVER commit this file to git!**

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Note:** `.env.example` is the template (safe to commit)

---

## 🚀 How to Build a Feature

### Example: Create Internships Feature

**Step 1: Create Database Table** (In Supabase Dashboard)

```sql
CREATE TABLE internships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  location TEXT NOT NULL
);
```

**Step 2: Create API Route**

```typescript
// src/app/api/internships/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.from("internships").select("*");
  return NextResponse.json(data);
}
```

**Step 3: Create Page/Component**

```typescript
// src/app/internships/page.tsx
import { createClient } from "@/lib/supabase/server";

export default async function InternshipsPage() {
  const supabase = await createClient();
  const { data: internships } = await supabase.from("internships").select("*");

  return (
    <div>
      <h1>Internships</h1>
      {internships?.map((i) => (
        <div key={i.id}>
          {i.role} at {i.company}
        </div>
      ))}
    </div>
  );
}
```

**Step 4: Test**

- API: http://localhost:3000/api/internships
- Page: http://localhost:3000/internships

---

## 📋 Current Status

✅ **Working:**

- Next.js server running
- Supabase connected
- API routes functional
- Validation schemas ready
- TypeScript types configured

🎯 **Next Steps:**

1. Create your first database table (internships)
2. Build the API routes
3. Create UI components
4. Add authentication

---

## 🆘 Quick Reference

**Start dev server:**

```bash
cd frontend
npm run dev
```

**Test endpoints:**

- Health: http://localhost:3000/api/health
- Supabase: http://localhost:3000/api/test

**Import Supabase:**

```typescript
// In client components
import { createClient } from "@/lib/supabase/client";

// In server components/API routes
import { createClient } from "@/lib/supabase/server";
```

**Validate data:**

```typescript
import { internshipCreateSchema } from "@/lib/validations/schemas";
const validated = internshipCreateSchema.parse(data);
```

---

## 🚫 What You DON'T Need (Yet)

- **`backend/` folder** - Only for future AI features
- **FastAPI** - Not needed until you add ML/AI
- **Additional libraries** - You have everything for MVP

---

**Questions?** Check `QUICKSTART.md` for detailed examples or ask! 🎓
