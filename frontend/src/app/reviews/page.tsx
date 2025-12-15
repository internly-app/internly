import Navigation from "@/components/Navigation";
import { ReviewsPageClient } from "@/components/ReviewsPageClient";
import { createClient } from "@/lib/supabase/server";
import type { ReviewWithDetails } from "@/lib/types/database";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    company?: string;
    work_style?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function ReviewsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  // Parse query parameters
  const searchQuery = params.search || "";
  const companyFilter = params.company || "";
  const workStyleFilter = params.work_style || "";
  const sortBy = (params.sort === "likes" ? "likes" : "recent") as "likes" | "recent";
  const page = parseInt(params.page || "1", 10);
  const currentPage = page > 0 ? page : 1;

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Build query
  let dbQuery = supabase.from("reviews").select(
    `
      *,
      company:companies(*),
      role:roles(*)
    `,
    { count: "exact" }
  );

  // Apply filters
  if (companyFilter) {
    dbQuery = dbQuery.eq("company_id", companyFilter);
  }

  if (workStyleFilter) {
    dbQuery = dbQuery.eq("work_style", workStyleFilter);
  }

  // Apply sorting
  if (sortBy === "likes") {
    dbQuery = dbQuery.order("like_count", { ascending: false });
  } else {
    dbQuery = dbQuery.order("created_at", { ascending: false });
  }

  // For search, we'll fetch all reviews and filter client-side
  // Otherwise, use pagination
  const REVIEWS_PER_PAGE = 15;
  if (!searchQuery.trim()) {
    const offset = (currentPage - 1) * REVIEWS_PER_PAGE;
    dbQuery = dbQuery.range(offset, offset + REVIEWS_PER_PAGE - 1);
  } else {
    // When searching, fetch more reviews for client-side filtering
    dbQuery = dbQuery.limit(1000);
  }

  const { data: reviews, error: reviewsError, count } = await dbQuery;

  if (reviewsError) {
    console.error("Reviews fetch error:", reviewsError);
    return (
      <>
        <Navigation />
        <ReviewsPageClient
          initialReviews={[]}
          initialTotal={0}
          initialSearchQuery={searchQuery}
          initialCompanyFilter={companyFilter}
          initialWorkStyleFilter={workStyleFilter}
          initialSortBy={sortBy}
          initialPage={currentPage}
        />
      </>
    );
  }

  // Get user's likes if authenticated
  let reviewsWithLikeStatus: ReviewWithDetails[] = reviews || [];
  if (user && reviews && reviews.length > 0) {
    const reviewIds = reviews.map((r) => r.id);
    const { data: userLikes } = await supabase
      .from("review_likes")
      .select("review_id")
      .eq("user_id", user.id)
      .in("review_id", reviewIds);

    const likedReviewIds = new Set(userLikes?.map((l) => l.review_id) || []);
    reviewsWithLikeStatus = reviews.map((review) => ({
      ...review,
      user_has_liked: likedReviewIds.has(review.id),
    }));
  } else {
    reviewsWithLikeStatus = (reviews || []).map((review) => ({
      ...review,
      user_has_liked: false,
    }));
  }

  return (
    <>
      <Navigation />
      <ReviewsPageClient
        initialReviews={reviewsWithLikeStatus}
        initialTotal={count || 0}
        initialSearchQuery={searchQuery}
        initialCompanyFilter={companyFilter}
        initialWorkStyleFilter={workStyleFilter}
        initialSortBy={sortBy}
        initialPage={currentPage}
      />
    </>
  );
}
