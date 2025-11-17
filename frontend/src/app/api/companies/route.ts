import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { companyCreateSchema } from "@/lib/validations/schemas";

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

    const body = await request.json();
    const validatedData = companyCreateSchema.parse(body);

    // First, try to find existing company by name (case-insensitive)
    const { data: existingCompany } = await supabase
      .from("companies")
      .select("*")
      .ilike("name", validatedData.name)
      .single();

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
      return NextResponse.json(
        { error: "Failed to create company" },
        { status: 500 }
      );
    }

    return NextResponse.json(newCompany, { status: 201 });
  } catch (error) {
    console.error("POST /api/companies error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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
