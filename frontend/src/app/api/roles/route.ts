import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { roleCreateSchema } from "@/lib/validations/schemas";

/**
 * POST /api/roles
 * Create or get existing role by title and company
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
    const validatedData = roleCreateSchema.parse(body);

    // First, try to find existing role by title and company (case-insensitive)
    const { data: existingRole } = await supabase
      .from("roles")
      .select("*")
      .ilike("title", validatedData.title)
      .eq("company_id", validatedData.company_id)
      .single();

    if (existingRole) {
      return NextResponse.json(existingRole, { status: 200 });
    }

    // If not found, create new role
    const { data: newRole, error: insertError } = await supabase
      .from("roles")
      .insert(validatedData)
      .select()
      .single();

    if (insertError) {
      console.error("Role insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create role" },
        { status: 500 }
      );
    }

    return NextResponse.json(newRole, { status: 201 });
  } catch (error) {
    console.error("POST /api/roles error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/roles
 * Get roles by company
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("company_id");

    if (!companyId) {
      return NextResponse.json(
        { error: "company_id is required" },
        { status: 400 }
      );
    }

    const { data: roles, error } = await supabase
      .from("roles")
      .select("*")
      .eq("company_id", companyId)
      .order("title");

    if (error) {
      console.error("Roles fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch roles" },
        { status: 500 }
      );
    }

    return NextResponse.json(roles || []);
  } catch (error) {
    console.error("GET /api/roles error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
