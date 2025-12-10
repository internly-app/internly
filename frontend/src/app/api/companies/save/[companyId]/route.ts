import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/companies/save/[companyId]
 * Save a company to user's bookmarks
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try insert; let constraints/foreign keys handle validation
    const { error: insertError } = await supabase
      .from("saved_companies")
      .insert({
        user_id: user.id,
        company_id: companyId,
      });

    // Success
    if (!insertError) {
      return NextResponse.json({ saved: true });
    }

    // Duplicate save
    if (insertError.code === "23505") {
      return NextResponse.json({ saved: true, message: "Already saved" });
    }

    // FK violation -> company not found
    if (insertError.code === "23503") {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    console.error("Save company error:", insertError);
    return NextResponse.json(
      { error: "Failed to save company" },
      { status: 500 }
    );
  } catch (error) {
    console.error("POST /api/companies/save/[companyId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/companies/save/[companyId]
 * Remove a company from user's bookmarks
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete saved company
    const { error: deleteError } = await supabase
      .from("saved_companies")
      .delete()
      .eq("user_id", user.id)
      .eq("company_id", companyId);

    if (deleteError) {
      console.error("Unsave company error:", deleteError);
      return NextResponse.json(
        { error: "Failed to unsave company" },
        { status: 500 }
      );
    }

    return NextResponse.json({ saved: false });
  } catch (error) {
    console.error("DELETE /api/companies/save/[companyId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

