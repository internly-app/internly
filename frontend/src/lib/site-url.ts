/**
 * Canonical site URL used for Supabase Auth redirects.
 *
 * Why: Supabase email/OAuth flows require an absolute URL. Using NEXT_PUBLIC_SITE_URL
 * (configured per environment) ensures localhost and production redirects both work.
 */

export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv && fromEnv.trim()) {
    return fromEnv.replace(/\/+$/, "");
  }

  // Client-side fallback: derive origin from the current page.
  // This avoids breaking production OAuth initiation due to env propagation issues.
  if (typeof window !== "undefined") {
    const origin = window.location.origin.replace(/\/+$/, "");

    // Never allow a production deployment to use a localhost origin.
    if (process.env.NODE_ENV === "production") {
      if (/^https?:\/\/localhost(:\d+)?$/i.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/i.test(origin)) {
        throw new Error(
          "Refusing to use a localhost site URL in production. Check NEXT_PUBLIC_SITE_URL and your deployment domain."
        );
      }
    }

    return origin;
  }

  // Server-side: in production we require NEXT_PUBLIC_SITE_URL to be set.
  // (Used for generating absolute URLs in emails / server-generated links.)
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Missing NEXT_PUBLIC_SITE_URL. Set it to your live site origin (e.g. https://internly.tech)."
    );
  }

  // Safe fallback for local dev/test.
  return "http://localhost:3000";
}

export function buildSiteUrl(pathname: string): string {
  const base = getSiteUrl();
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${normalized}`;
}
