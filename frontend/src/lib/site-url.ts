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

  // Prevent shipping a build that can ever redirect users to localhost.
  // In production, missing NEXT_PUBLIC_SITE_URL is a deployment misconfiguration.
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
