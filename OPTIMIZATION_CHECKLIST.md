# ⚡ Quick Optimization Checklist

**Use this as a quick reference when optimizing Internly**

---

## 🔴 Critical Optimizations (Must Do)

### 1. React Server Components
- [ ] Remove `"use client"` from pages (keep only for interactive components)
- [ ] Convert `/reviews` page to async Server Component
- [ ] Convert `/` home page to Server Component
- [ ] Move data fetching to server (direct Supabase calls)
- [ ] Keep `"use client"` only at leaf components (filters, buttons, modals)

### 2. Incremental Static Regeneration
- [ ] Add `export const revalidate = 30` to `/reviews` page
- [ ] Add `export const revalidate = 3600` to `/` home page
- [ ] Add `export const revalidate = 300` to company pages
- [ ] Test that pages are being cached (check response headers)

### 3. Database Optimization
- [ ] Run performance indexes SQL in Supabase (see OPTIMIZATION_GUIDE.md)
- [ ] Use `Promise.all()` for parallel queries
- [ ] Add `.select('specific, columns')` instead of `*`
- [ ] Add pagination with `.range(0, 19)`
- [ ] Run `ANALYZE` on all tables

### 4. Bundle Size & Code Splitting
- [ ] Install `@next/bundle-analyzer`
- [ ] Dynamic import Footer: `const Footer = dynamic(() => import('@/components/Footer'))`
- [ ] Dynamic import modals and heavy components
- [ ] Check bundle size (target: <250KB initial)
- [ ] Remove unused dependencies

### 5. Image Optimization
- [ ] Replace `<img>` with `<Image>` from `next/image`
- [ ] Add `priority` to above-fold images only
- [ ] Configure image formats in `next.config.ts` (AVIF, WebP)
- [ ] Compress company logos

---

## 🟡 Important Optimizations (Do Soon)

### 6. HTTP Caching
- [ ] Add cache headers to API routes (`Cache-Control: public, s-maxage=60`)
- [ ] Different cache times for authenticated vs anonymous users
- [ ] Test cache hits in browser DevTools Network tab

### 7. Streaming with Suspense
- [ ] Wrap slow components in `<Suspense fallback={<Skeleton />}>`
- [ ] Create loading skeletons for main content areas
- [ ] Add `loading.tsx` files to routes

### 8. Font Optimization
- [ ] Use `next/font/google` or `next/font/local`
- [ ] Set `display: 'swap'` to prevent invisible text
- [ ] Preload critical fonts

### 9. Parallel Data Fetching
- [ ] Replace sequential awaits with `Promise.all()`
- [ ] Check all API routes for opportunities
- [ ] Verify auth checks don't block data fetching

### 10. Next.js Config
- [ ] Configure image optimization
- [ ] Remove console logs in production
- [ ] Add security headers
- [ ] Enable `reactStrictMode`

---

## 🟢 Nice to Have (Optional)

### 11. Metadata & SEO
- [ ] Add proper `<title>` and `<meta>` tags
- [ ] Generate dynamic metadata for review pages
- [ ] Add Open Graph images
- [ ] Create sitemap.xml

### 12. Third-Party Scripts
- [ ] Use `<Script strategy="lazyOnload">` for analytics
- [ ] Defer non-critical scripts
- [ ] Remove unused tracking scripts

### 13. Prefetching
- [ ] Add `router.prefetch()` on hover for likely next pages
- [ ] Use `<Link prefetch={true}>` strategically

### 14. Service Worker (Advanced)
- [ ] Implement service worker for offline support
- [ ] Cache static assets
- [ ] Add offline fallback page

### 15. Monitoring
- [ ] Set up Vercel Analytics
- [ ] Track Core Web Vitals
- [ ] Add error monitoring (Sentry)
- [ ] Set up performance budgets

---

## 📊 Testing Checklist

After implementing optimizations:

- [ ] Run `npm run build` and check bundle sizes
- [ ] Test on PageSpeed Insights (target 95+ score)
- [ ] Test on slow 3G network in Chrome DevTools
- [ ] Check cache headers in Network tab
- [ ] Verify ISR is working (check `X-Vercel-Cache` header)
- [ ] Test on mobile device
- [ ] Check database query times in Supabase logs
- [ ] Run Lighthouse audit
- [ ] Test Core Web Vitals in Search Console

---

## 🎯 Quick Wins (Can Do in 10 Minutes)

**Start here if you're short on time:**

1. Add `export const revalidate = 30` to pages
2. Run database indexes SQL
3. Replace `<img>` with `<Image>`
4. Dynamic import Footer component
5. Add proper cache headers to API routes

**These 5 changes alone will give you ~70% of the performance gains!**

---

## 📈 Expected Results

| Optimization | Time to Implement | Performance Gain |
|-------------|-------------------|------------------|
| Server Components | 30-60 min | 🚀🚀🚀🚀🚀 (80%) |
| ISR | 5 min | 🚀🚀🚀🚀🚀 (90%) |
| Database Indexes | 2 min | 🚀🚀🚀🚀 (95%) |
| Code Splitting | 15 min | 🚀🚀🚀 (40%) |
| Image Optimization | 20 min | 🚀🚀 (30%) |
| Caching Headers | 10 min | 🚀🚀🚀🚀 (80%) |
| Streaming | 15 min | 🚀🚀 (25%) |

**Total time:** ~2-3 hours for all critical optimizations
**Total gain:** 10-50x faster, production-ready

---

## 🆘 Common Issues

**Issue:** "Page still slow"
- ✅ Check: Did you run database indexes?
- ✅ Check: Is ISR enabled (`revalidate` set)?
- ✅ Check: Are you using Server Components?

**Issue:** "Vercel cache always MISS"
- ✅ Check: ISR needs at least one visit to cache
- ✅ Check: Dynamic routes need `generateStaticParams`
- ✅ Check: No `cookies()` or `headers()` in static pages

**Issue:** "Bundle still large"
- ✅ Run bundle analyzer to find culprits
- ✅ Check for unnecessary `"use client"`
- ✅ Dynamic import heavy components

---

## 🔗 Quick Links

- Full Guide: `OPTIMIZATION_GUIDE.md`
- Database SQL: `database/performance-indexes.sql`
- Next.js Docs: https://nextjs.org/docs/app/building-your-application/optimizing
- PageSpeed Test: https://pagespeed.web.dev/

---

**Remember:** Optimize after the merge, test thoroughly, deploy with confidence! 🚀
