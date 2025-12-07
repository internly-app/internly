# 🛠️ Production Build Issues

**Status:** ✅ Dev works perfectly (`npm run dev`) | ❌ Production build fails (`npm run build`)

**Last Updated:** December 6, 2025

---

## 🎯 TL;DR

The app runs fine in development mode but fails when building for production. This is because:
1. **Production build is stricter** - TypeScript checks are more thorough
2. **Static generation fails** - Next.js tries to pre-render pages that need dynamic data
3. **Mock data is outdated** - HeroSection has fake data that doesn't match the real database schema

**Good news:** These are all fixable and don't affect development or functionality!

---

## 📊 Current Build Errors

### Error 1: TypeScript Type Mismatches in HeroSection

```
Type error: Object literal may only specify known properties,
and 'user' does not exist in type 'ReviewWithDetails'.
```

**Location:** `frontend/src/components/HeroSection.tsx` (lines 20-155)

**Problem:**
The mock reviews in HeroSection have outdated structure that doesn't match the actual database schema.

**What's Wrong:**
```typescript
// ❌ WRONG - Mock data has this
{
  id: "1",
  user: {                    // ← Doesn't exist in schema!
    id: "user1",
    full_name: "Sarah Chen",
    email: "sarah@example.com"
  },
  company: { ... },
  role: { ... },
  // Missing: company_id, role_id
}

// ✅ CORRECT - Should be this
{
  id: "1",
  user_id: "user1",         // ← Just a string ID
  company_id: "microsoft",   // ← Required field
  role_id: "pm-intern",      // ← Required field
  company: { ... },
  role: { ... },
  housing_stipend: null,     // ← Required (even if null)
}
```

**Why It Happens:**
- HeroSection uses **fake preview data** for the homepage carousel
- When the database schema changes, the mock data doesn't auto-update
- TypeScript catches this in production build but not in dev mode

**How to Fix:**
See "Fix #1" section below.

---

### Error 2: Zod Validation Schema Syntax

```
Type error: Argument of type '(val: any) => { message: string; }'
is not assignable to parameter of type 'string | { ... }'
```

**Location:** `frontend/src/lib/validations/schemas.ts` (multiple lines)

**Problem:**
The `.refine()` method in Zod schemas uses outdated syntax.

**What's Wrong:**
```typescript
// ❌ WRONG - 2nd parameter as function
.refine(
  (val) => validateContent(val).isValid,
  (val) => ({                              // ← Can't be a function!
    message: validateContent(val).reason
  })
)

// ✅ CORRECT - 2nd parameter as static object
.refine(
  (val) => validateContent(val).isValid,
  { message: "Invalid content" }           // ← Must be static
)
```

**Why It Happens:**
- Zod changed their API in recent versions
- The dynamic error messages approach no longer works
- You lose custom error messages but validation still works

**How to Fix:**
See "Fix #2" section below.

---

### Error 3: useSearchParams() Prerendering Issue

```
⨯ useSearchParams() should be wrapped in a suspense boundary at page "/signin"
Error occurred prerendering page "/signin"
```

**Affected Pages:**
- `/signin`
- `/reviews`
- `/companies`

**Problem:**
Next.js tries to statically pre-render these pages at build time, but they use `useSearchParams()` which requires dynamic rendering.

**What's Wrong:**
```typescript
// Current code
"use client";
export default function SignInPage() {
  const searchParams = useSearchParams(); // ← Blocks static generation
  // ...
}
```

**Why It Happens:**
- These pages read URL search parameters (e.g., `?redirect=/write-review`)
- Search params are dynamic and can't be known at build time
- Next.js wants to pre-render everything for better performance
- But these pages need to be rendered on-demand

**How to Fix:**
See "Fix #3" section below.

---

### Error 4: Minor - Unused Parameter Warning

```
Warning: 'currency' is defined but never used.
```

**Location:** `frontend/src/components/CompanyCard.tsx:86`

**Problem:**
The `formatPay()` function has a `currency` parameter that was added but never used.

**How to Fix:**
See "Fix #4" section below.

---

## 🔧 How to Fix Each Issue

### Fix #1: Update HeroSection Mock Data

**File:** `frontend/src/components/HeroSection.tsx`

**Changes needed:**

1. **Remove `user` objects, add `user_id` string:**
```typescript
// Change from:
user: {
  id: "user1",
  full_name: "Sarah Chen",
  email: "sarah@example.com"
}

// To:
user_id: "user1",
```

2. **Add required fields at the top of each review object:**
```typescript
{
  id: "1",
  user_id: "user1",          // ← Add this
  company_id: "microsoft",    // ← Add this
  role_id: "pm-intern",       // ← Add this
  company: { ... },
  role: { ... },
  // ... rest of fields
}
```

3. **Add `housing_stipend` to the third review (Rootly):**
```typescript
// Around line 149, add this after housing_provided:
housing_provided: false,
housing_stipend: null,  // ← Add this line
```

**Do this for all 3 mock reviews** in the `mockReviews` array.

---

### Fix #2: Update Zod Validation Schemas

**File:** `frontend/src/lib/validations/schemas.ts`

**Find and replace** all `.refine()` calls that have a function as the 2nd parameter:

```typescript
// BEFORE (lines 76-86, 98-108, 113-123, 129-139, 159-169, 174-184):
.refine(
  (val) => {
    if (!val) return true;
    const validation = validateContent(val);
    return validation.isValid;
  },
  (val) => {                                    // ← Remove this function
    const validation = validateContent(val);
    return { message: validation.reason || "..." };
  }
)

// AFTER:
.refine(
  (val) => {
    if (!val) return true;
    const validation = validateContent(val);
    return validation.isValid;
  },
  { message: "Content contains inappropriate content" }  // ← Static object
)
```

**Affected validations:**
- `team_name` (line 76)
- `hardest` (line 98)
- `best` (line 113)
- `advice` (line 129)
- `interview_rounds_description` (line 159)
- `interview_tips` (line 174)
- `companyCreateSchema.name` (line 24)
- `roleCreateSchema.title` (line 44)

**Total:** 8 `.refine()` calls to update

---

### Fix #3: Fix useSearchParams() Pages

**Files to update:**
- `frontend/src/app/signin/page.tsx`
- `frontend/src/app/reviews/page.tsx`
- `frontend/src/app/companies/page.tsx`

**Add this line** after the imports, before the component:

```typescript
"use client";

import { ... } from "...";

// ✅ Add this line
export const dynamic = 'force-dynamic';

export default function SignInPage() {
  const searchParams = useSearchParams();
  // ...
}
```

**What this does:**
- Tells Next.js to skip static generation for this page
- Forces server-side rendering on every request
- Allows `useSearchParams()` to work properly

**Trade-off:**
- These pages won't be pre-rendered (slightly slower initial load)
- But they work correctly with dynamic search params
- Still way faster than the current dev mode

---

### Fix #4: Remove Unused Currency Parameter

**File:** `frontend/src/components/CompanyCard.tsx`

**Line 86**, change:
```typescript
// BEFORE:
const formatPay = (amount: number | null, currency?: string) => {
  if (!amount) return null;
  return `$${amount.toFixed(0)}`;
};

// AFTER:
const formatPay = (amount: number | null) => {
  if (!amount) return null;
  return `$${amount.toFixed(0)}`;
};
```

**Line 148 and 150**, remove the currency argument:
```typescript
// BEFORE:
{company.avg_pay_cad && `${formatPay(company.avg_pay_cad, "CAD")} CAD`}
{company.avg_pay_usd && `${formatPay(company.avg_pay_usd, "USD")} USD`}

// AFTER:
{company.avg_pay_cad && `${formatPay(company.avg_pay_cad)} CAD`}
{company.avg_pay_usd && `${formatPay(company.avg_pay_usd)} USD`}
```

---

## 🤔 Why Does Dev Mode Work But Build Fails?

### Development Mode (`npm run dev`):
- ✅ **Less strict TypeScript checking** - Allows some type mismatches
- ✅ **No static generation** - Everything renders on-demand
- ✅ **Fast refresh** - Compiles only what changed
- ✅ **Forgiving** - Ignores some production optimizations

### Production Build (`npm run build`):
- ❌ **Strict TypeScript** - Catches all type errors
- ❌ **Tries to pre-render pages** - Fails on dynamic content
- ❌ **Full compilation** - Must compile entire app successfully
- ❌ **Optimizations enforced** - All production rules applied

**This is normal!** Many Next.js apps work in dev but need fixes for production.

---

## ✅ Verification Steps

After applying all fixes:

### 1. **Type Check (should pass):**
```bash
cd frontend
npm run build
```

Should complete without TypeScript errors.

### 2. **Dev Mode Still Works:**
```bash
npm run dev
```

Navigate to all pages to ensure nothing broke.

### 3. **Production Build Succeeds:**
Look for:
```
✓ Compiled successfully
✓ Collecting page data
✓ Generating static pages (20/20)
✓ Finalizing page optimization
```

### 4. **Test Production Build Locally:**
```bash
npm run build
npm run start
```

Visit `http://localhost:3000` and test all pages.

---

## 🎯 Priority Order

If you're short on time, fix in this order:

1. **Fix #2 (Zod schemas)** - 5 minutes, prevents all validation errors
2. **Fix #3 (useSearchParams)** - 2 minutes, fixes prerendering
3. **Fix #1 (HeroSection)** - 10 minutes, fixes type errors
4. **Fix #4 (unused param)** - 1 minute, cleanup

**Total time:** ~20 minutes to fix all build issues

---

## 📚 Why These Issues Exist

### Root Cause #1: Mock Data Not Type-Safe
The `mockReviews` in HeroSection is just a TypeScript object literal. When you change the database schema, TypeScript doesn't force you to update it because:
- It's not fetched from the database
- It's manually written fake data
- Dev mode doesn't catch the mismatch

**Solution:** Either:
- Keep mock data in sync manually (current approach)
- Use real data from Supabase (better, but slower page load)
- Create a factory function with proper typing

### Root Cause #2: Library Updates
Zod updated their API and the older syntax no longer works. This happened because:
- You updated dependencies (`npm update`)
- Zod has strict typing for `.refine()` now
- Dynamic error messages aren't supported the same way

**Solution:** Use static error messages (you lose custom messages but gain type safety)

### Root Cause #3: Next.js Static Generation Goals
Next.js wants to pre-render everything for maximum performance, but:
- Some pages need dynamic data (search params)
- `useSearchParams()` can't be known at build time
- Next.js 15 is stricter about this than Next.js 14

**Solution:** Explicitly opt out of static generation with `dynamic = 'force-dynamic'`

---

## 🚫 What NOT to Do

### Don't ignore build errors and deploy dev mode
- Dev mode is not optimized
- Won't work on Vercel or production hosting
- Missing important optimizations (image optimization, code splitting, etc.)

### Don't remove TypeScript strict mode
```typescript
// ❌ DON'T DO THIS in tsconfig.json
"strict": false,  // Bad idea!
```

### Don't skip production builds
Always test with `npm run build` before deploying!

---

## 🎓 Learning Points

### Why This is Good
These errors are **catching real issues**:
- Type mismatches that could cause runtime errors
- Performance issues with static generation
- Outdated mock data that doesn't match your schema

### Prevention for Future
1. **Run `npm run build` regularly** - Don't wait until deployment
2. **Update mock data when schema changes** - Add a comment reminder
3. **Use TypeScript strict mode** - Catches issues early
4. **Test production builds locally** - `npm run build && npm run start`

---

## 📞 Need Help?

If you encounter issues while fixing:

1. **TypeScript errors:** Read the error message carefully - it tells you exactly what's wrong
2. **Build still failing:** Share the full error output
3. **Dev mode breaks:** Run `npm run dev` and check browser console
4. **Questions about why:** Check this doc or ask!

---

**Remember:** Dev mode working is great for development, but production build passing is required for deployment!

**Last Updated:** December 6, 2025
**Status:** Documented, ready to fix when needed
