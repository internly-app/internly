import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { companyCreateSchema } from "@/lib/validations/schemas";
import {
  checkRateLimit,
  getClientIdentifier,
  getIpAddress,
  RATE_LIMITS,
} from "@/lib/security/rate-limit";

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

    // If not found, create new company
    const { data: newCompany, error: insertError } = await supabase
      .from("companies")
      .insert(validatedData)
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
