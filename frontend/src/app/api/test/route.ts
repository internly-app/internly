/**
 * Test API Route - Verify Supabase Connection
 *
 * GET /api/test - Tests database connection
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Try to query test_records table
    const { data, error } = await supabase
      .from("test_records")
      .select("*")
      .limit(10);

    // If table doesn't exist, that's okay
    if (error?.code === "42P01") {
      return NextResponse.json({
        success: true,
        message:
          "✅ Supabase connected! (test_records table not found - you can create it later)",
        connection: "established",
      });
    }

    // Other errors
    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Success with data
    return NextResponse.json({
      success: true,
      message: "✅ Supabase connected successfully!",
      data,
      count: data?.length || 0,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Optional: POST endpoint to test insertions
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("test_records")
      .insert(body)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Record created successfully",
        data,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
