import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/reviews/[id]/like
 * Toggle like on a review (authenticated)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: reviewId } = await params;

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try to insert like (let constraints handle duplicates and FK)
    const { error: insertError } = await supabase
      .from("review_likes")
      .insert({
        user_id: user.id,
        review_id: reviewId,
      });

    // Success: newly liked
    if (!insertError) {
      return NextResponse.json({ liked: true });
    }

    // Duplicate like -> unlike instead
    if (insertError.code === "23505") {
      const { error: deleteError } = await supabase
        .from("review_likes")
        .delete()
        .eq("user_id", user.id)
        .eq("review_id", reviewId);

      if (deleteError) {
        console.error("Like delete error:", deleteError);
        return NextResponse.json({ error: "Failed to unlike review" }, { status: 500 });
      }

      return NextResponse.json({ liked: false });
    }

    // Foreign key error -> review not found
    if (insertError.code === "23503") {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    console.error("Like toggle error:", insertError);
    return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 });
  } catch (error) {
    console.error("POST /api/reviews/[id]/like error:", {
      error,
      reviewId: (await params).id,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
