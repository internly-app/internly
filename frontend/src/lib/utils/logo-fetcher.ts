/**
 * Utility functions for fetching company logos from Logo.dev API
 * Used server-side to populate logo_url when companies are created
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
 * Fetch logo URL from Logo.dev API
 * Returns the logo URL if successful, null otherwise
 * Non-blocking: fails gracefully if API is slow or unavailable
 */
export async function fetchLogoFromLogoDev(
  companyName: string,
  apiKey?: string
): Promise<string | null> {
  if (!apiKey) {
    return null;
  }

  try {
    const domain = getDomainFromCompanyName(companyName);
    const logoUrl = `https://img.logo.dev/${domain}?token=${apiKey}`;

    // Fetch with timeout (3 seconds max)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(logoUrl, {
        method: "HEAD", // HEAD request is faster - just check if resource exists
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // If HEAD request succeeds, return the URL
      if (response.ok) {
        return logoUrl;
      }
    } catch (error) {
      clearTimeout(timeoutId);
      // If HEAD fails, try GET to verify
      const getResponse = await fetch(logoUrl, {
        signal: controller.signal,
      });
      if (getResponse.ok) {
        return logoUrl;
      }
    }

    return null;
  } catch (error) {
    // Fail silently - logo fetching is optional
    // Client-side fallback will handle it
    return null;
  }
}

