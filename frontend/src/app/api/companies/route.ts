import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { companyCreateSchema } from "@/lib/validations/schemas";
import {
  checkRateLimit,
  getClientIdentifier,
  getIpAddress,
  RATE_LIMITS,
} from "@/lib/security/rate-limit";

// Domain mappings for major companies (same as frontend)
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
 * Generate domain from company name for Clearbit API
 */
function getDomainFromName(name: string): string {
  if (DOMAIN_MAP[name]) {
    return DOMAIN_MAP[name];
  }

  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "");

  if (cleanName.endsWith("inc") || cleanName.endsWith("llc") || cleanName.endsWith("corp")) {
    return cleanName.replace(/(inc|llc|corp)$/, "") + ".com";
  }

  return cleanName + ".com";
}

/**
 * Try to fetch logo URL from Clearbit API (server-side)
 * Returns null if fetch fails (client-side will handle fallback)
 */
async function fetchLogoUrl(companyName: string): Promise<string | null> {
  try {
    const domain = getDomainFromName(companyName);
    const clearbitUrl = `https://logo.clearbit.com/${domain}`;
    
    // Check if Clearbit has the logo by making a HEAD request
    const response = await fetch(clearbitUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Internly/1.0',
      },
    });

    // If successful (200-299), return the URL
    if (response.ok) {
      return clearbitUrl;
    }
  } catch (error) {
    // Silently fail - client-side will handle fallback
    console.debug(`Failed to fetch logo for ${companyName}:`, error);
  }

  return null;
}

/**
 * POST /api/companies
 * Create or get existing company by name
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    const ipAddress = getIpAddress(request);
    const identifier = getClientIdentifier(user.id, ipAddress);
    const rateLimit = checkRateLimit(identifier, RATE_LIMITS.CREATE_COMPANY);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
            "X-RateLimit-Limit": RATE_LIMITS.CREATE_COMPANY.maxRequests.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.resetTime.toString(),
          },
        }
      );
    }

    const body = await request.json();
    
    // Validate request data
    let validatedData;
    try {
      validatedData = companyCreateSchema.parse(body);
    } catch (validationError) {
      console.error("Company validation error:", validationError);
      return NextResponse.json(
        { error: "Invalid company data", details: validationError instanceof Error ? validationError.message : "Validation failed" },
        { status: 400 }
      );
    }

    // First, try to find existing company by name (case-insensitive)
    const { data: existingCompany, error: findError } = await supabase
      .from("companies")
      .select("*")
      .ilike("name", validatedData.name)
      .maybeSingle();

    if (findError && findError.code !== 'PGRST116') { // PGRST116 = no rows returned (expected)
      console.error("Company find error:", findError);
      return NextResponse.json(
        { error: "Failed to check existing company" },
        { status: 500 }
      );
    }

    if (existingCompany) {
      return NextResponse.json(existingCompany, { status: 200 });
    }

    // If no logo_url provided, try to fetch from Clearbit
    let logoUrl = validatedData.logo_url;
    if (!logoUrl) {
      logoUrl = await fetchLogoUrl(validatedData.name);
    }

    // If not found, create new company
    const { data: newCompany, error: insertError } = await supabase
      .from("companies")
      .insert({
        ...validatedData,
        logo_url: logoUrl || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Company insert error:", insertError);
      // Check for unique constraint violation (slug or name already exists)
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: "Company already exists" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Failed to create company", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(newCompany, { status: 201 });
  } catch (error) {
    console.error("POST /api/companies error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/companies
 * Search companies by name
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    let query = supabase.from("companies").select("*");

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    query = query.order("name").limit(20);

    const { data: companies, error } = await query;

    if (error) {
      console.error("Companies fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch companies" },
        { status: 500 }
      );
    }

    return NextResponse.json(companies || []);
  } catch (error) {
    console.error("GET /api/companies error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
