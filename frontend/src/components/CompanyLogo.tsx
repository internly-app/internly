"use client";

import { useState, useEffect, useRef } from "react";
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
  "AMD": "amd.com",
};

/**
 * CompanyLogo component that displays company logos with smart fallbacks:
 * 1. Uses logo_url from database if available
 * 2. Falls back to Logo.dev API (free tier available)
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
  const [logoDevError, setLogoDevError] = useState(false);
  const [logoDevLoading, setLogoDevLoading] = useState(true);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Generate domain from company name for Logo.dev API
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
  const logoDevApiKey = process.env.NEXT_PUBLIC_LOGO_DEV_API_KEY;
  const logoDevUrl = `https://img.logo.dev/${domain}?token=${logoDevApiKey}`;
  const initial = companyName[0]?.toUpperCase() || "?";

  // Validate logoUrl - must be a non-empty string that looks like a URL
  const isValidLogoUrl = logoUrl &&
    typeof logoUrl === 'string' &&
    logoUrl.trim().length > 0 &&
    (logoUrl.startsWith('http') || logoUrl.startsWith('/'));

  // Reset error states ONLY when company name or logoUrl actually changes (not on every render)
  // Use ref to track previous values to prevent unnecessary resets
  const prevPropsRef = useRef({ companyName, logoUrl });

  useEffect(() => {
    const prev = prevPropsRef.current;
    // Only reset if props actually changed (not just re-render)
    if (prev.companyName !== companyName || prev.logoUrl !== logoUrl) {
      setImageError(false);
      setLogoDevError(false);
      setLogoDevLoading(true);
      prevPropsRef.current = { companyName, logoUrl };
    }
  }, [companyName, logoUrl]);

  // Add timeout for Logo.dev loading - if it takes too long, show initial
  // Increased timeout to account for lazy loading and network delays when many logos load at once
  useEffect(() => {
    if (!isValidLogoUrl && !imageError && !logoDevError && logoDevLoading) {
      // Give browser time to start loading (lazy loading can delay start)
      // Also accounts for network congestion when many logos load simultaneously on page refresh
      const timeout = setTimeout(() => {
        // Check if image is still loading (not loaded and not errored)
        const img = imgRef.current;
        // Only timeout if: loading state is still true AND (no img element OR img hasn't completed loading)
        const isStillLoading = logoDevLoading && (!img || (!img.complete && img.naturalWidth === 0));

        if (isStillLoading) {
          // Only log timeout warnings in development
          if (process.env.NODE_ENV === 'development') {
            console.warn(`Logo.dev logo timeout for ${companyName} (domain: ${domain})`);
          }
          setLogoDevError(true);
          setLogoDevLoading(false);
        }
      }, 3500); // 3.5 second timeout - accounts for lazy loading delay + network delays when many logos load at once

      return () => clearTimeout(timeout);
    }
  }, [companyName, domain, isValidLogoUrl, imageError, logoDevError, logoDevLoading]);

  // Priority: logo_url > Logo.dev API > Initial fallback
  const shouldUseLogoDev = !isValidLogoUrl || imageError;
  const shouldShowInitial = shouldUseLogoDev && logoDevError;

  // Fallback: show initial letter (clean, consistent fallback state)
  if (shouldShowInitial) {
    return (
      <div
        className={`rounded-full bg-muted flex items-center justify-center text-sm font-semibold flex-shrink-0 text-muted-foreground ${className}`}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
        role="img"
        aria-label={`${companyName} logo`}
      >
        {initial}
      </div>
    );
  }

  // Use regular img tag for Logo.dev URLs and external HTTP URLs (more reliable)
  // Use Next.js Image only for local paths (optimized)
  const isUsingLogoDev = !isValidLogoUrl || imageError;
  const isExternalUrl = isValidLogoUrl && logoUrl.startsWith('http');

  return (
    <div
      className={`relative rounded-lg overflow-hidden bg-muted flex-shrink-0 ${className}`}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      {isUsingLogoDev ? (
        // Use regular img tag for Logo.dev API (more reliable, no optimization needed)
        <img
          ref={imgRef}
          src={logoDevUrl}
          alt={`${companyName} logo`}
          width={size}
          height={size}
          className="w-full h-full object-contain p-[10%]"
          onError={(e) => {
            // Only log in development to avoid console spam
            if (process.env.NODE_ENV === 'development') {
              console.warn(`Logo.dev logo failed for ${companyName} (${domain}):`, logoDevUrl);
            }
            setLogoDevError(true);
            setLogoDevLoading(false);
          }}
          onLoad={() => {
            // Successfully loaded - clear any pending timeout
            setLogoDevLoading(false);
            if (logoDevError) {
              setLogoDevError(false);
            }
          }}
          loading="lazy"
        />
      ) : isExternalUrl ? (
        // Use regular img tag for external HTTP URLs (more reliable than Next.js Image)
        <img
          src={logoUrl}
          alt={`${companyName} logo`}
          width={size}
          height={size}
          className="w-full h-full object-contain p-[10%]"
          onError={() => {
            setImageError(true);
          }}
          loading="lazy"
        />
      ) : (
        // Use Next.js Image only for local paths (optimized)
        <Image
          src={logoUrl}
          alt={`${companyName} logo`}
          width={size}
          height={size}
          className="w-full h-full object-contain p-[10%]"
          onError={() => {
            setImageError(true);
          }}
        />
      )}
    </div>
  );
}

