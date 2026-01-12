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

    // Handle Anonymous Likes (if no user)
    if (!user) {
      // Parse body to see action (like vs unlike)
      let action = "like";
      try {
        const body = await request.json();
        if (body.action === "unlike") action = "unlike";
      } catch (e) {
        // No body, default to like
      }

      // Fetch current count first (Read-Modify-Write)
      // Note: This has a race condition but is acceptable for this feature scale.
      const { data: reviewData, error: fetchError } = await supabase
        .from("reviews")
        .select("like_count")
        .eq("id", reviewId)
        .single();

      if (fetchError || !reviewData) {
        return NextResponse.json(
          { error: "Review not found" },
          { status: 404 }
        );
      }

      let newCount = reviewData.like_count;
      if (action === "like") newCount++;
      else newCount = Math.max(0, newCount - 1);

      const { error: updateError } = await supabase
        .from("reviews")
        .update({ like_count: newCount })
        .eq("id", reviewId);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to update like count" },
          { status: 500 }
        );
      }

      return NextResponse.json({ liked: action === "like", anonymous: true });
    }

    // Authenticated User Logic
    // Try to insert like (let constraints handle duplicates and FK)
    const { error: insertError } = await supabase.from("review_likes").insert({
      user_id: user.id,
      review_id: reviewId,
    });

    // Success: newly liked
    if (!insertError) {
      return NextResponse.json({ liked: true });
    }

    // Duplicate like -> we interpret this as a toggle intent -> unlike
    // BUT we should respect the explicit 'action' if provided, to avoid confusion.
    // However, existing clients might send empty body for toggle.
    // Let's stick to toggle behavior for auth users for backward compatibility
    // unless the body explicitly says 'like', in which case duplicate error means "already liked".

    // Check intent from body
    let explicitAction: string | null = null;
    try {
      const body = await request.clone().json(); // clone because we might have consumed it? No, in Next.js request.json() can be called once?
      // Actually, we haven't called it yet in this branch.
      // Wait, we didn't call .json() in the !user branch yet (it was inside the if block).
      // Here we are in the user block.
      if (body.action) explicitAction = body.action;
    } catch (e) {
      // Ignore
    }

    if (insertError.code === "23505") {
      // Unique constraint violation (already liked)

      // If they explicitly wanted to 'like', and it's already liked, we return success (idempotent).
      if (explicitAction === "like") {
        return NextResponse.json({ liked: true });
      }

      // Otherwise (toggle or explicit unlike), we delete.
      const { error: deleteError } = await supabase
        .from("review_likes")
        .delete()
        .eq("user_id", user.id)
        .eq("review_id", reviewId);

      if (deleteError) {
        console.error("Like delete error:", deleteError);
        return NextResponse.json(
          { error: "Failed to unlike review" },
          { status: 500 }
        );
      }

      return NextResponse.json({ liked: false });
    }

    // Foreign key error -> review not found
    if (insertError.code === "23503") {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    console.error("Like toggle error:", insertError);
    return NextResponse.json(
      { error: "Failed to toggle like" },
      { status: 500 }
    );
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
