"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface CompanyLogoProps {
  companyName: string;
  logoUrl?: string | null;
  size?: number;
  className?: string;
}

// Common domain mappings for companies - moved outside component for performance
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
 * CompanyLogo component that displays company logos with smart fallbacks:
 * 1. Uses logo_url from database if available
 * 2. Falls back to Clearbit Logo API (free, no API key needed)
 * 3. Falls back to company initial in a circle
 * 
 * Uses Next.js Image for optimization (lazy loading, WebP conversion, etc.)
 */
export function CompanyLogo({
  companyName,
  logoUrl,
  size = 40,
  className = "",
}: CompanyLogoProps) {
  const [imageError, setImageError] = useState(false);
  const [clearbitError, setClearbitError] = useState(false);

  // Reset error states when company name or logoUrl changes
  useEffect(() => {
    setImageError(false);
    setClearbitError(false);
  }, [companyName, logoUrl]);

  // Generate domain from company name for Clearbit API
  const getDomain = (name: string): string => {
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
  };

  const domain = getDomain(companyName);
  const clearbitUrl = `https://logo.clearbit.com/${domain}`;
  const initial = companyName[0]?.toUpperCase() || "?";

  // Priority: logo_url > Clearbit API > Initial fallback
  const shouldUseClearbit = !logoUrl || imageError;
  const shouldShowInitial = shouldUseClearbit && clearbitError;

  // Fallback: show initial letter
  if (shouldShowInitial) {
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

  // Use regular img tag for Clearbit URLs (more reliable for external APIs)
  // Use Next.js Image for database logo_url (may be local or optimized)
  const isUsingClearbit = !logoUrl || imageError;

  return (
    <div
      className={`relative rounded-lg overflow-hidden bg-muted flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {isUsingClearbit ? (
        // Use regular img tag for Clearbit API (more reliable, no optimization needed)
        <img
          src={clearbitUrl}
          alt={`${companyName} logo`}
          width={size}
          height={size}
          className="w-full h-full object-contain p-[10%]"
          onError={() => {
            setClearbitError(true);
          }}
          loading="lazy"
        />
      ) : (
        // Use Next.js Image for database logo_url (may be local or optimized)
        <Image
          src={logoUrl}
          alt={`${companyName} logo`}
          width={size}
          height={size}
          className="w-full h-full object-contain p-[10%]"
          unoptimized={logoUrl.startsWith("http")}
          onError={() => {
            setImageError(true);
          }}
        />
      )}
    </div>
  );
}

