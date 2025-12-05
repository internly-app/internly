# 🚀 Next.js 15 Performance Optimization Guide (2025)

**Comprehensive guide for achieving the fastest possible load times in Internly**

Based on industry best practices and Next.js 15 official recommendations, this guide outlines all critical optimizations needed to make your application blazingly fast.

---

## 📊 Target Performance Metrics

| Metric | Target | Current | Priority |
|--------|--------|---------|----------|
| Time to First Byte (TTFB) | <200ms | TBD | 🔴 Critical |
| First Contentful Paint (FCP) | <1.8s | TBD | 🔴 Critical |
| Largest Contentful Paint (LCP) | <2.5s | TBD | 🔴 Critical |
| Time to Interactive (TTI) | <3.8s | TBD | 🟡 Important |
| Total Blocking Time (TBT) | <200ms | TBD | 🟡 Important |
| Cumulative Layout Shift (CLS) | <0.1 | TBD | 🟢 Good to have |
| First Input Delay (FID) | <100ms | TBD | 🟢 Good to have |
| Bundle Size (Initial JS) | <250KB | TBD | 🔴 Critical |

---

## 🎯 Core Optimization Strategies

### 1. React Server Components (RSC) - The Biggest Win
**Impact: 80% reduction in JavaScript bundle, 3-5x faster initial loads**

#### What It Does:
- Renders components on the server without sending JavaScript to the browser
- Eliminates hydration overhead completely
- Direct server access to databases and APIs

#### Implementation:
```typescript
// ✅ GOOD: Server Component (default in App Router)
export default async function ReviewsPage() {
  const reviews = await fetchReviewsFromDB(); // Direct DB access
  return <ReviewList reviews={reviews} />;
}

// ❌ BAD: Client Component doing data fetching
"use client";
export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  useEffect(() => {
    fetch('/api/reviews').then(...); // Waterfall, slow
  }, []);
}
```

#### Where to Apply in Internly:
- ✅ `/reviews` page - Server Component with direct Supabase queries
- ✅ `/` home page - Static generation
- ✅ `/about` page - Static generation
- ✅ Company/role pages - Server Components with ISR
- ⚠️ Keep `"use client"` only for: filters, modals, form interactions

**Rule of thumb:** Only 10-20% of your components should be client components!

---

### 2. Incremental Static Regeneration (ISR)
**Impact: 95% cache hit rate, CDN edge delivery (<50ms)**

#### What It Does:
- Pre-renders pages at build time
- Serves from CDN globally (5-20ms latency)
- Background revalidation keeps content fresh

#### Implementation:
```typescript
// Reviews page - Fresh data every 30 seconds
export const revalidate = 30;

// Home page - Fresh data every hour
export const revalidate = 3600;

// Company pages - Fresh data every 5 minutes
export const revalidate = 300;
```

#### Where to Apply:
```typescript
// Static pages (revalidate every hour)
- / (home)
- /about
- /faq

// Dynamic pages with ISR (revalidate every 30-60s)
- /reviews
- /companies/[slug]
- /reviews/[id]

// Real-time pages (no static gen)
- /write-review (authenticated, always fresh)
- /profile (user-specific)
```

#### Advanced: On-Demand Revalidation
```typescript
// Revalidate immediately after creating a review
await fetch('/api/revalidate?path=/reviews', {
  method: 'POST',
});
```

---

### 3. Database Query Optimization
**Impact: 99% faster queries (500ms → 5ms)**

#### Required Indexes:
```sql
-- Composite indexes for filtered queries
CREATE INDEX idx_reviews_company_likes ON reviews(company_id, like_count DESC);
CREATE INDEX idx_reviews_company_created ON reviews(company_id, created_at DESC);
CREATE INDEX idx_reviews_workstyle_likes ON reviews(work_style, like_count DESC);
CREATE INDEX idx_reviews_workstyle_created ON reviews(work_style, created_at DESC);

-- Covering index for likes (includes all needed columns)
CREATE INDEX idx_review_likes_covering ON review_likes(user_id, review_id) INCLUDE (created_at);
```

#### Query Patterns:
```typescript
// ✅ GOOD: Parallel queries
const [user, reviews, companies] = await Promise.all([
  supabase.auth.getUser(),
  supabase.from('reviews').select('*'),
  supabase.from('companies').select('*'),
]);

// ❌ BAD: Sequential queries
const user = await supabase.auth.getUser();
const reviews = await supabase.from('reviews').select('*');
const companies = await supabase.from('companies').select('*');
```

#### Where to Apply:
- ✅ Add all indexes to production database
- ✅ Use `Promise.all()` for independent queries
- ✅ Use `.select('specific, columns')` instead of `*`
- ✅ Add pagination (`range(0, 19)`) to limit results
- ✅ Use materialized views for complex aggregations

---

### 4. Bundle Size Optimization & Code Splitting
**Impact: 60% smaller bundles, 25% faster FCP**

#### Dynamic Imports:
```typescript
// ✅ GOOD: Lazy load heavy components
import dynamic from 'next/dynamic';

const Footer = dynamic(() => import('@/components/Footer'));
const Chart = dynamic(() => import('@/components/Chart'));
const Modal = dynamic(() => import('@/components/Modal'));

// Use with loading state
const HeavyComponent = dynamic(() => import('@/components/Heavy'), {
  loading: () => <Skeleton />,
  ssr: false, // Client-only if needed
});
```

#### Where to Apply:
- ✅ Footer (below fold)
- ✅ Modals (only loaded when opened)
- ✅ Charts/visualizations
- ✅ Rich text editors
- ✅ Heavy third-party libraries (analytics, chat widgets)

#### Third-Party Libraries:
```typescript
// ✅ GOOD: Load analytics after page interactive
useEffect(() => {
  import('analytics').then(({ default: analytics }) => {
    analytics.track('page_view');
  });
}, []);

// ❌ BAD: Import at top level
import analytics from 'analytics'; // Blocks initial load
```

#### Bundle Analysis:
```bash
# Install bundle analyzer
npm install --save-dev @next/bundle-analyzer

# Add to next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);

# Run analysis
ANALYZE=true npm run build
```

**Target:** Initial JS bundle <250KB (industry apps achieve this)

---

### 5. Image Optimization
**Impact: 70% smaller images, faster LCP**

#### Implementation:
```typescript
import Image from 'next/image';

// ✅ GOOD: Optimized with priority
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority // For above-fold images
  quality={85} // Balance quality/size
/>

// ✅ GOOD: Lazy load below-fold images
<Image
  src="/company-logo.png"
  alt="Company"
  width={48}
  height={48}
  loading="lazy"
/>
```

#### Next.js Config:
```typescript
// next.config.ts
export default {
  images: {
    formats: ['image/avif', 'image/webp'], // Modern formats
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96],
    minimumCacheTTL: 86400, // 24 hours
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'your-cdn.com',
      },
    ],
  },
};
```

#### Where to Apply:
- ✅ Company logos in review cards
- ✅ Hero section images
- ✅ User avatars
- ⚠️ Use `priority` only for above-fold images (1-2 max)

---

### 6. Font Optimization
**Impact: Eliminates font flash (FOUT), faster FCP**

#### Implementation:
```typescript
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Prevents invisible text
  preload: true,
  variable: '--font-inter',
});

export default function RootLayout({ children }) {
  return (
    <html className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

#### Custom Fonts:
```typescript
// Self-host fonts for best performance
import localFont from 'next/font/local';

const customFont = localFont({
  src: './fonts/CustomFont.woff2',
  display: 'swap',
  variable: '--font-custom',
});
```

---

### 7. Streaming with Suspense
**Impact: Progressive rendering, perceived 40% faster**

#### Implementation:
```typescript
import { Suspense } from 'react';

export default function Page() {
  return (
    <>
      {/* Renders immediately */}
      <Navigation />
      <Header />

      {/* Streams in when ready */}
      <Suspense fallback={<ReviewsSkeleton />}>
        <Reviews />
      </Suspense>

      <Suspense fallback={<CompaniesSkeleton />}>
        <Companies />
      </Suspense>
    </>
  );
}
```

#### Where to Apply:
- ✅ Main content areas (reviews list)
- ✅ Slow data fetches (external APIs)
- ✅ Below-fold content
- ⚠️ Don't over-use: too many suspense boundaries = layout shift

---

### 8. Smart HTTP Caching
**Impact: 90% fewer server requests**

#### API Route Caching:
```typescript
// app/api/reviews/route.ts
export async function GET() {
  const reviews = await fetchReviews();

  return NextResponse.json(reviews, {
    headers: {
      // Anonymous: Public cache, CDN-friendly
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',

      // For authenticated:
      // 'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
    },
  });
}
```

#### Static Assets:
```typescript
// next.config.ts
export default {
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

#### Caching Strategy:
```
Content Type              | Cache Time | Strategy
--------------------------|------------|---------------------------
Static pages (/, /about)  | 1 hour     | ISR (revalidate: 3600)
Reviews list              | 30 seconds | ISR (revalidate: 30)
API responses (public)    | 60 seconds | s-maxage=60
API responses (private)   | 10 seconds | private, max-age=10
Images                    | 1 year     | immutable
Company logos             | 1 day      | max-age=86400
```

---

### 9. Metadata & SEO Optimization
**Impact: Better Core Web Vitals, improved SEO**

#### Implementation:
```typescript
// app/reviews/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Browse Internship Reviews | Internly',
  description: 'Read real internship reviews from students...',
  openGraph: {
    title: 'Browse Internship Reviews',
    description: 'Real internship experiences...',
    images: ['/og-image.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
  },
};
```

#### Dynamic Metadata:
```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const review = await getReview(params.id);

  return {
    title: `${review.company} Internship Review | Internly`,
    description: review.summary.slice(0, 160),
  };
}
```

---

### 10. Third-Party Scripts
**Impact: Prevents blocking, improves TTI**

#### Implementation:
```typescript
import Script from 'next/script';

export default function Layout({ children }) {
  return (
    <>
      {children}

      {/* Load after page interactive */}
      <Script
        src="https://analytics.example.com/script.js"
        strategy="lazyOnload"
      />

      {/* Load before page interactive (rare) */}
      <Script
        src="https://critical-script.com/script.js"
        strategy="beforeInteractive"
      />
    </>
  );
}
```

#### Strategy Guide:
- `beforeInteractive` - Blocks rendering (avoid if possible)
- `afterInteractive` - Loads after page interactive (default)
- `lazyOnload` - Loads during idle time (best for analytics)

---

## 🔧 Next.js Config: Production-Ready Setup

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96],
    minimumCacheTTL: 86400,
  },

  // Production optimizations
  reactStrictMode: true,
  poweredByHeader: false,

  // Optimize bundle - remove console logs
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Enable experimental features
  experimental: {
    // Optimize package imports
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
    ],
  },

  // Headers for security and caching
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

---

## 📦 Deployment Checklist

### Pre-Deployment
- [ ] Run database indexes in production
- [ ] Set `NODE_ENV=production`
- [ ] Enable all environment variables
- [ ] Run `npm run build` locally to verify
- [ ] Check bundle size with analyzer
- [ ] Test on slow 3G network
- [ ] Verify images are optimized

### Post-Deployment
- [ ] Test with [PageSpeed Insights](https://pagespeed.web.dev/)
- [ ] Verify cache headers with browser DevTools
- [ ] Check Core Web Vitals in Search Console
- [ ] Monitor with [Vercel Analytics](https://vercel.com/analytics)
- [ ] Set up error monitoring (Sentry)
- [ ] Test across multiple devices

### Target Scores
- **Performance:** 95+ (mobile), 100 (desktop)
- **Accessibility:** 100
- **Best Practices:** 100
- **SEO:** 100

---

## 🎓 Advanced Optimizations (Optional)

### 1. Partial Prerendering (PPR)
**Status:** Experimental in Next.js 15

```typescript
// next.config.ts
export default {
  experimental: {
    ppr: true, // Enable PPR
  },
};

// app/reviews/page.tsx
export const experimental_ppr = true;

export default function ReviewsPage() {
  return (
    <>
      {/* Static shell renders instantly */}
      <Navigation />
      <Header />

      {/* Dynamic content streams in */}
      <Suspense fallback={<Skeleton />}>
        <DynamicReviews />
      </Suspense>
    </>
  );
}
```

### 2. Middleware for Edge Routing
```typescript
// middleware.ts
import { NextResponse } from 'next/server';

export function middleware(request: Request) {
  // Edge routing for geolocation
  const country = request.geo?.country || 'US';

  // Redirect based on location
  if (country === 'CA' && !request.url.includes('/ca')) {
    return NextResponse.redirect('/ca');
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/',
};
```

### 3. Service Worker for Offline Support
```typescript
// app/layout.tsx
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
}, []);
```

### 4. Prefetching Strategy
```typescript
// Prefetch likely next pages
import { useRouter } from 'next/navigation';

export default function ReviewCard({ review }) {
  const router = useRouter();

  return (
    <div
      onMouseEnter={() => {
        // Prefetch on hover
        router.prefetch(`/reviews/${review.id}`);
      }}
    >
      {/* Card content */}
    </div>
  );
}
```

---

## 📊 Monitoring & Continuous Optimization

### Tools to Use:
1. **[PageSpeed Insights](https://pagespeed.web.dev/)** - Core Web Vitals
2. **[WebPageTest](https://webpagetest.org/)** - Detailed waterfall analysis
3. **[Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)** - Automated testing
4. **Chrome DevTools** - Performance profiling
5. **Vercel Analytics** - Real user monitoring
6. **Bundle Analyzer** - Track bundle size

### Key Metrics to Track:
```typescript
// app/layout.tsx - Web Vitals reporting
import { sendGTMEvent } from '@next/third-parties/google';

export function reportWebVitals(metric) {
  if (metric.label === 'web-vital') {
    sendGTMEvent({
      event: 'web-vitals',
      metric_name: metric.name,
      metric_value: metric.value,
    });
  }
}
```

---

## 🔗 Resources & References

### Official Documentation
- [Next.js 15 Performance](https://nextjs.org/docs/14/app/building-your-application/optimizing)
- [React Server Components](https://react.dev/reference/rsc/server-components)
- [Next.js ISR Guide](https://nextjs.org/docs/app/guides/incremental-static-regeneration)

### Performance Guides
- [Next.js Performance Optimization 2025](https://pagepro.co/blog/nextjs-performance-optimization-in-9-steps/)
- [Blazity Expert Guide](https://blazity.com/the-expert-guide-to-nextjs-performance-optimization)
- [Next.js 15 Optimization Strategies](https://www.luxisdesign.io/blog/nextjs-15-performance-optimization-strategies-for-2025-1)
- [React & Next.js Best Practices 2025](https://strapi.io/blog/react-and-nextjs-in-2025-modern-best-practices)
- [RaftLabs Performance & Architecture](https://www.raftlabs.com/blog/building-with-next-js-best-practices-and-benefits-for-performance-first-teams/)

### Code Splitting & Bundle Optimization
- [Reducing Bundle Size in Next.js](https://moldstud.com/articles/p-reducing-bundle-size-in-nextjs-techniques-for-performance-gains)
- [Code Splitting for Performance](https://moldstud.com/articles/p-nextjs-performance-optimization-how-code-splitting-can-significantly-improve-your-apps-speed)
- [Dynamic Imports Best Practices](https://blazity.com/blog/code-splitting-next-js)
- [Bundle Optimization Guide](https://www.coteries.com/en/articles/reduce-size-nextjs-bundle)

### React Server Components
- [RSC Game Changer for Performance](https://dev.to/keith_mark_441c6f16e803a6/why-react-server-components-are-a-game-changer-for-performance-in-2025-gk4)
- [Server-First Era with Next.js](https://jia-song.medium.com/the-server-first-era-of-react-in-2025-a-deep-dive-into-rsc-with-next-js-ab5e93787ebb)
- [Mastering Next.js 15 Advanced Concepts](https://medium.com/@TheEnaModernCoder/next-js-15-advanced-concepts-every-developer-should-master-in-2025-030560c29763)

---

## 🎯 Summary: Priority Action Items for Internly

### 🔴 **Critical (Do First)**
1. Convert pages to React Server Components
2. Add database indexes
3. Enable ISR with appropriate revalidate times
4. Optimize images with next/image
5. Implement code splitting for heavy components

### 🟡 **Important (Do Soon)**
6. Set up bundle analyzer and optimize
7. Add proper HTTP caching headers
8. Implement streaming with Suspense
9. Optimize fonts with next/font
10. Add performance monitoring

### 🟢 **Nice to Have (Do Later)**
11. Implement PPR (when stable)
12. Add service worker for offline
13. Set up edge middleware
14. Implement prefetching strategy
15. Add advanced metrics tracking

---

**Expected Results After Full Implementation:**
- ⚡ 10-50x faster page loads
- 📦 60-80% smaller JavaScript bundles
- 🚀 95+ PageSpeed score
- 💰 90% reduction in server costs
- 😊 Dramatically improved user experience

This is a living document. Update as new optimizations are discovered or Next.js releases new features!
