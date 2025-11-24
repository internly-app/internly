"use client";

import { useState } from "react";

interface CompanyLogoProps {
  companyName: string;
  logoUrl?: string | null;
  size?: number;
  className?: string;
}

/**
 * CompanyLogo component that displays company logos with smart fallbacks:
 * 1. Uses logo_url from database if available
 * 2. Falls back to Clearbit Logo API (free, no API key needed)
 * 3. Falls back to company initial in a circle
 */
export function CompanyLogo({
  companyName,
  logoUrl,
  size = 40,
  className = "",
}: CompanyLogoProps) {
  const [imageError, setImageError] = useState(false);
  const [clearbitError, setClearbitError] = useState(false);

  // Generate domain from company name for Clearbit API
  const getDomain = (name: string): string => {
    // Common domain mappings for companies without clear domains
    const domainMap: Record<string, string> = {
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

    if (domainMap[name]) {
      return domainMap[name];
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
  };

  const domain = getDomain(companyName);
  const clearbitUrl = `https://logo.clearbit.com/${domain}`;
  const initial = companyName[0]?.toUpperCase() || "?";

  // Priority: logo_url > Clearbit API > Initial fallback
  const shouldUseClearbit = !logoUrl || imageError;
  const shouldShowInitial = shouldUseClearbit && clearbitError;

  if (shouldShowInitial) {
    return (
      <div
        className={`rounded-full bg-muted flex items-center justify-center text-sm font-semibold flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        {initial}
      </div>
    );
  }

  const imageUrl = logoUrl || clearbitUrl;

  return (
    <div
      className={`relative rounded-lg overflow-hidden bg-muted flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={imageUrl}
        alt={`${companyName} logo`}
        width={size}
        height={size}
        className="w-full h-full object-contain"
        style={{ padding: size * 0.1 }}
        onError={() => {
          if (logoUrl) {
            // If logo_url failed, try Clearbit
            setImageError(true);
          } else {
            // If Clearbit failed, show initial
            setClearbitError(true);
          }
        }}
      />
    </div>
  );
}

