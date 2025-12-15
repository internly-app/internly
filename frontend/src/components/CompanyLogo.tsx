"use client";

import { useState } from "react";

interface CompanyLogoProps {
  companyName: string;
  size?: number;
  className?: string;
}

// Common domain mappings for companies
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
};

/**
 * CompanyLogo component - Always uses logo.dev API
 * Fallback: Company initial in circle if logo.dev fails
 */
export function CompanyLogo({
  companyName,
  size = 40,
  className = "",
}: CompanyLogoProps) {
  const [logoError, setLogoError] = useState(false);

  // Generate domain from company name for Logo.dev API
  const getDomain = (name: string): string => {
    if (DOMAIN_MAP[name]) {
      return DOMAIN_MAP[name];
    }

    // Generate domain from name
    const cleanName = name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "");

    // Remove common suffixes
    if (cleanName.endsWith("inc") || cleanName.endsWith("llc") || cleanName.endsWith("corp")) {
      return cleanName.replace(/(inc|llc|corp)$/, "") + ".com";
    }

    return cleanName + ".com";
  };

  const domain = getDomain(companyName);
  const logoDevApiKey = process.env.NEXT_PUBLIC_LOGO_DEV_API_KEY;
  const logoDevUrl = `https://img.logo.dev/${domain}?token=${logoDevApiKey}`;
  const initial = companyName[0]?.toUpperCase() || "?";

  // Show initial fallback if logo.dev fails
  if (logoError) {
    return (
      <div
        className={`rounded-full bg-muted flex items-center justify-center text-sm font-semibold flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
        role="img"
        aria-label={`${companyName} logo`}
      >
        {initial}
      </div>
    );
  }

  // Always use logo.dev
  return (
    <div
      className={`relative rounded-lg overflow-hidden bg-muted flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={logoDevUrl}
        alt={`${companyName} logo`}
        width={size}
        height={size}
        className="w-full h-full object-contain p-[10%]"
        onError={() => {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`Logo.dev failed for ${companyName} (${domain})`);
          }
          setLogoError(true);
        }}
        loading="lazy"
      />
    </div>
  );
}
