import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  reviewCreateSchema,
  reviewsQuerySchema,
} from "@/lib/validations/schemas";
import type { ReviewWithDetails } from "@/lib/types/database";
import {
  checkRateLimit,
  getClientIdentifier,
  getIpAddress,
  RATE_LIMITS,
} from "@/lib/security/rate-limit";
import { stripHTML } from "@/lib/security/xss-protection-server";

/**
 * POST /api/reviews
 * Create a new review (authenticated)
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
    const rateLimit = checkRateLimit(identifier, RATE_LIMITS.CREATE_REVIEW);

    if (!rateLimit.allowed) {
      const errorMessage = rateLimit.blocked
        ? "Your account has been temporarily blocked due to repeated rate limit violations. Please try again later."
        : "Too many requests. Please try again later.";

      return NextResponse.json(
        {
          error: errorMessage,
          blocked: rateLimit.blocked || false,
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
            "X-RateLimit-Limit": RATE_LIMITS.CREATE_REVIEW.maxRequests.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.resetTime.toString(),
          },
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = reviewCreateSchema.parse(body);

    // Sanitize all text fields to prevent XSS attacks
    const sanitizedData = {
      ...validatedData,
      location: stripHTML(validatedData.location),
      term: stripHTML(validatedData.term),
      team_name: validatedData.team_name ? stripHTML(validatedData.team_name) : null,
      technologies: validatedData.technologies ? stripHTML(validatedData.technologies) : null,
      hardest: stripHTML(validatedData.hardest),
      best: stripHTML(validatedData.best),
      advice: validatedData.advice ? stripHTML(validatedData.advice) : null,
      perks: validatedData.perks ? stripHTML(validatedData.perks) : null,
      interview_rounds_description: stripHTML(validatedData.interview_rounds_description),
      interview_tips: validatedData.interview_tips ? stripHTML(validatedData.interview_tips) : null,
    };

    // Insert review
    const { data: review, error: insertError } = await supabase
      .from("reviews")
      .insert({
        ...sanitizedData,
        user_id: user.id,
      })
      .select(
        `
        *,
        company:companies(*),
        role:roles(*)
      `
      )
      .single();

    if (insertError) {
      // Check for duplicate review (unique constraint violation)
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "You have already reviewed this role" },
          { status: 409 }
        );
      }

      console.error("Review insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create review" },
        { status: 500 }
      );
    }

    // Revalidate affected pages after successful review creation
    revalidatePath("/reviews");
    revalidatePath("/companies");
    if (review?.company?.slug) {
      revalidatePath(`/companies/${review.company.slug}`);
    }
    revalidatePath("/profile");

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      console.error("Validation error:", error);
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: error instanceof Error ? error.message : "Validation failed",
        },
        { status: 400 }
      );
    }

    console.error("POST /api/reviews error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reviews
 * Get paginated reviews feed with filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const query = reviewsQuerySchema.parse({
      company_id: searchParams.get("company_id") || undefined,
      role_id: searchParams.get("role_id") || undefined,
      work_style: searchParams.get("work_style") || undefined,
      sort: searchParams.get("sort") || "likes",
      limit: searchParams.get("limit") || "20",
      offset: searchParams.get("offset") || "0",
    });

    // Check if user is authenticated first
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Build query with user likes included in single query
    let dbQuery = supabase.from("reviews").select(
      `
        *,
        company:companies(*),
        role:roles(*)
      `,
      { count: "exact" }
    );

    // Apply filters
    if (query.company_id) {
      dbQuery = dbQuery.eq("company_id", query.company_id);
    }

    if (query.role_id) {
      dbQuery = dbQuery.eq("role_id", query.role_id);
    }

    if (query.work_style) {
      dbQuery = dbQuery.eq("work_style", query.work_style);
    }

    // Apply sorting
    if (query.sort === "likes") {
      dbQuery = dbQuery.order("like_count", { ascending: false });
    } else {
      dbQuery = dbQuery.order("created_at", { ascending: false });
    }

    // Apply pagination
    dbQuery = dbQuery.range(query.offset, query.offset + query.limit - 1);

    const { data: reviews, error: fetchError, count } = await dbQuery;

    if (fetchError) {
      console.error("Reviews fetch error:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch reviews" },
        { status: 500 }
      );
    }

    let reviewsWithLikeStatus: ReviewWithDetails[] = reviews || [];

    if (user && reviews && reviews.length > 0) {
      // Get user's likes for these reviews in a single optimized query
      const reviewIds = reviews.map((r) => r.id);
      const { data: userLikes, error: likesError } = await supabase
        .from("review_likes")
        .select("review_id")
        .eq("user_id", user.id)
        .in("review_id", reviewIds);

      if (likesError) {
        console.error('[API] Error fetching user likes:', likesError);
      }

      const likedReviewIds = new Set(userLikes?.map((l) => l.review_id) || []);

      reviewsWithLikeStatus = reviews.map((review) => ({
        ...review,
        user_has_liked: likedReviewIds.has(review.id),
      }));
    } else {
      // If no user, just set user_has_liked to false for all
      reviewsWithLikeStatus = (reviews || []).map((review) => ({
        ...review,
        user_has_liked: false,
      }));
    }

    // Smart caching based on authentication
    const cacheControl = user
      ? 'private, max-age=60, stale-while-revalidate=120' // Authenticated: slightly longer to reduce refetch flicker
      : 'public, s-maxage=300, stale-while-revalidate=600'; // Anonymous: 5 min cache

    return NextResponse.json({
      reviews: reviewsWithLikeStatus,
      total: count || 0,
      limit: query.limit,
      offset: query.offset,
    }, {
      headers: {
        'Cache-Control': cacheControl,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error },
        { status: 400 }
      );
    }

    console.error("GET /api/reviews error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
