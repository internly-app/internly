/**
 * Utility functions for fetching company logos from LogoKit API
 * Used server-side to populate logo_url when companies are created
 *
 * LogoKit API: https://logokit.com/company-logo-api
 * - Free tier: 5,000 requests/day (no API key required)
 * - Coverage: Millions of company logos worldwide
 * - Performance: Sub-100ms globally via CDN
 * - URL format: https://img.logokit.com/{domain}
 */

// Common domain mappings for companies - matches CompanyLogo component
const DOMAIN_MAP: Record<string, string> = {
  "Google": "google.com",
  "Microsoft": "microsoft.com",
  "Apple": "apple.com",
  "Amazon": "amazon.com",
  "Meta": "meta.com",
  "Netflix": "netflix.com",
  "Tesla": "tesla.com",
  "Nvidia": "nvidia.com",
  "Oracle": "oracle.com",
  "IBM": "ibm.com",
  "Salesforce": "salesforce.com",
  "Adobe": "adobe.com",
  "Intel": "intel.com",
  "Cisco": "cisco.com",
  "PayPal": "paypal.com",
  "Uber": "uber.com",
  "Airbnb": "airbnb.com",
  "Spotify": "spotify.com",
  "LinkedIn": "linkedin.com",
  "Shopify": "shopify.com",
  "Stripe": "stripe.com",
  "GitHub": "github.com",
  "Slack": "slack.com",
  "Zoom": "zoom.us",
  "Dropbox": "dropbox.com",
  "Atlassian": "atlassian.com",
  "Twilio": "twilio.com",
  "Vercel": "vercel.com",
  "Netlify": "netlify.com",
  "OpenAI": "openai.com",
  "Anthropic": "anthropic.com",
  "AMD": "amd.com",
  "Rootly": "rootly.com",
};

/**
 * Generate domain from company name for Logo.dev API
 * Matches the logic in CompanyLogo component
 */
function getDomainFromCompanyName(name: string): string {
  // Check domain map first
  if (DOMAIN_MAP[name]) {
    return DOMAIN_MAP[name];
  }

  // Try to generate domain from name
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "");

  // Common patterns
  if (cleanName.endsWith("inc") || cleanName.endsWith("llc") || cleanName.endsWith("corp")) {
    return cleanName.replace(/(inc|llc|corp)$/, "") + ".com";
  }

  return cleanName + ".com";
}

/**
 * Fetch logo URL from LogoKit API
 * Returns the logo URL if successful, null otherwise
 * Non-blocking: fails gracefully if API is slow or unavailable
 *
 * NOTE: LogoKit blocks programmatic access (server-side requests).
 * The img.logokit.com endpoint only works when embedded in browser <img> tags.
 * This function now just constructs the URL - actual validation happens client-side.
 *
 * @param companyName - Company name (e.g., "Nooks", "Google")
 * @returns Logo URL with API key, or null if no API key available
 */
export async function fetchLogoFromLogoKit(
  companyName: string
): Promise<string | null> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_LOGOKIT_API_KEY;

    // If no API key, return null (client will use fallback)
    if (!apiKey) {
      return null;
    }

    const domain = getDomainFromCompanyName(companyName);
    const logoUrl = `https://img.logokit.com/${domain}?token=${apiKey}`;

    // Return the URL directly - LogoKit blocks server-side verification
    // The browser will validate when the <img> tag loads
    return logoUrl;
  } catch (error) {
    // Fail silently - logo fetching is optional
    // Client-side fallback will handle it
    return null;
  }
}

/**
 * Legacy function name for backwards compatibility
 * @deprecated Use fetchLogoFromLogoKit instead
 */
export async function fetchLogoFromLogoDev(
  companyName: string,
  apiKey?: string
): Promise<string | null> {
  return fetchLogoFromLogoKit(companyName);
}

