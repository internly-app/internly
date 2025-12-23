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

  // Safe fallback for local dev.
  return "http://localhost:3000";
}

export function buildSiteUrl(pathname: string): string {
  const base = getSiteUrl();
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${normalized}`;
}
