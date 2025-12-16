import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

/**
 * GET /api/user/reviews
 * Get current user's reviews
 */
export async function GET() {
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

    let supabaseAdmin;
    try {
      supabaseAdmin = createServiceRoleClient();
    } catch (error) {
      console.error("Failed to create service role client:", error);
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }
    const { data: reviews, error: reviewsError } = await supabaseAdmin
      .from("reviews")
      .select(`
        *,
        company:companies(*),
        role:roles(*)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (reviewsError) {
      console.error("User reviews fetch error:", reviewsError.message);
      return NextResponse.json(
        { error: "Failed to fetch reviews" },
        { status: 500 }
      );
    }
    let userLikes: Set<string> = new Set();
    if (reviews && reviews.length > 0) {
      const reviewIds = reviews.map((r) => r.id);
      const { data: likes } = await supabase
        .from("review_likes")
        .select("review_id")
        .eq("user_id", user.id)
        .in("review_id", reviewIds);

      if (likes) {
        userLikes = new Set(likes.map((l) => l.review_id));
      }
    }

    const reviewsWithLikes = (reviews || []).map((r) => ({
      ...r,
      user_has_liked: userLikes.has(r.id),
    }));

    return NextResponse.json(reviewsWithLikes);
  } catch (error) {
    console.error("GET /api/user/reviews error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

