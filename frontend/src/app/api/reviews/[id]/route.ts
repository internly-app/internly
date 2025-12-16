import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { reviewUpdateSchema } from "@/lib/validations/schemas";
import { stripHTML } from "@/lib/security/xss-protection";

/**
 * GET /api/reviews/[id]
 * Get a single review by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: reviewId } = await params;

    const { data: review, error } = await supabase
      .from("reviews")
      .select(`
        *,
        company:companies(*),
        role:roles(*)
      `)
      .eq("id", reviewId)
      .single();

    if (error || !review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    return NextResponse.json(review, { status: 200 });
  } catch (error) {
    console.error("GET /api/reviews/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/reviews/[id]
 * Update a review (only the owner can update their own review)
 */
export async function PATCH(
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

    // Verify the review exists and belongs to the user
    const { data: existingReview, error: fetchError } = await supabase
      .from("reviews")
      .select("id, user_id")
      .eq("id", reviewId)
      .single();

    if (fetchError || !existingReview) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    if (existingReview.user_id !== user.id) {
      return NextResponse.json(
        { error: "You can only edit your own reviews" },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = reviewUpdateSchema.parse(body);

    // Sanitize all text fields to prevent XSS attacks
    const sanitizedData: Record<string, any> = {};
    for (const [key, value] of Object.entries(validatedData)) {
      // Sanitize string fields (excluding IDs and numeric fields)
      if (typeof value === 'string' && !key.includes('_id') && !key.includes('count')) {
        sanitizedData[key] = stripHTML(value);
      } else {
        sanitizedData[key] = value;
      }
    }

    // Update the review
    const { data: updatedReview, error: updateError } = await supabase
      .from("reviews")
      .update({
        ...sanitizedData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId)
      .select(`
        *,
        company:companies(*),
        role:roles(*)
      `)
      .single();

    if (updateError) {
      console.error("Review update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update review" },
        { status: 500 }
      );
    }

    // Revalidate affected pages after successful review update
    revalidatePath("/reviews");
    revalidatePath("/companies");
    if (updatedReview?.company?.slug) {
      revalidatePath(`/companies/${updatedReview.company.slug}`);
    }
    revalidatePath("/profile");

    return NextResponse.json(updatedReview, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data", details: error.message },
        { status: 400 }
      );
    }

    console.error("PATCH /api/reviews/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reviews/[id]
 * Delete a review (only the owner can delete their own review)
 */
export async function DELETE(
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

    // First, verify the review exists and belongs to the user
    // Also fetch company slug for revalidation
    const { data: review, error: fetchError } = await supabase
      .from("reviews")
      .select("id, user_id, company:companies(slug)")
      .eq("id", reviewId)
      .single();

    if (fetchError || !review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Check ownership
    if (review.user_id !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own reviews" },
        { status: 403 }
      );
    }

    // Store company slug before deletion for revalidation
    const companySlug = review.company && typeof review.company === 'object' && 'slug' in review.company 
      ? review.company.slug as string 
      : null;

    // Delete associated likes first (if not handled by CASCADE)
    await supabase
      .from("review_likes")
      .delete()
      .eq("review_id", reviewId);

    // Delete the review
    const { error: deleteError } = await supabase
      .from("reviews")
      .delete()
      .eq("id", reviewId);

    if (deleteError) {
      console.error("Review delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete review" },
        { status: 500 }
      );
    }

    // Revalidate affected pages after successful review deletion
    revalidatePath("/reviews");
    revalidatePath("/companies");
    if (companySlug) {
      revalidatePath(`/companies/${companySlug}`);
    }
    revalidatePath("/profile");

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/reviews/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

