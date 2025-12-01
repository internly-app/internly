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

    // Check if review exists
    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .select("id")
      .eq("id", reviewId)
      .single();

    if (reviewError || !review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Check if user has already liked this review
    const { data: existingLike } = await supabase
      .from("review_likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("review_id", reviewId)
      .single();

    if (existingLike) {
      // Unlike: Delete the like
      const { error: deleteError } = await supabase
        .from("review_likes")
        .delete()
        .eq("id", existingLike.id);

      if (deleteError) {
        console.error("Like delete error:", deleteError);
        return NextResponse.json(
          { error: "Failed to unlike review" },
          { status: 500 }
        );
      }

      // Get updated like count from database
      const { data: updatedReview, error: fetchError } = await supabase
        .from("reviews")
        .select("like_count")
        .eq("id", reviewId)
        .single();

      if (fetchError) {
        console.error("Failed to fetch review after unlike:", fetchError);
      }

      console.log("Unlike - Review data:", updatedReview);

      return NextResponse.json({
        liked: false,
        likeCount: updatedReview?.like_count ?? 0,
        message: "Review unliked",
      });
    } else {
      // Like: Insert new like
      const { error: insertError } = await supabase
        .from("review_likes")
        .insert({
          user_id: user.id,
          review_id: reviewId,
        });

      if (insertError) {
        // If duplicate key error (user already liked), just return current state
        if (insertError.code === '23505') {
          const { data: currentReview } = await supabase
            .from("reviews")
            .select("like_count")
            .eq("id", reviewId)
            .single();

          return NextResponse.json({
            liked: true,
            likeCount: currentReview?.like_count || 0,
            message: "Review already liked",
          });
        }

        console.error("Like insert error:", insertError);
        return NextResponse.json(
          { error: "Failed to like review" },
          { status: 500 }
        );
      }

      // Get updated like count from database
      const { data: updatedReview, error: fetchError } = await supabase
        .from("reviews")
        .select("like_count")
        .eq("id", reviewId)
        .single();

      if (fetchError) {
        console.error("Failed to fetch review after like:", fetchError);
      }

      console.log("Like - Review data:", updatedReview);

      return NextResponse.json({
        liked: true,
        likeCount: updatedReview?.like_count ?? 0,
        message: "Review liked",
      });
    }
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
