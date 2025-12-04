import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CompanyWithStats, ReviewWithDetails } from "@/lib/types/database";

/**
 * GET /api/companies/[slug]
 * Get company by slug with stats and reviews
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get("role");

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Fetch company by slug
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("*")
      .eq("slug", slug)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    // Fetch all reviews for this company with role data
    const reviewsQuery = supabase
      .from("reviews")
      .select(`
        *,
        company:companies(*),
        role:roles(*)
      `)
      .eq("company_id", company.id)
      .order("created_at", { ascending: false });

    const { data: reviews, error: reviewsError } = await reviewsQuery;

    if (reviewsError) {
      console.error("Reviews fetch error:", reviewsError);
    }

    // Fetch user's likes if authenticated
    let userLikes: Set<string> = new Set();
    if (user && reviews && reviews.length > 0) {
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

    // Check if user has saved this company
    let userHasSaved = false;
    if (user) {
      const { data: savedCompany } = await supabase
        .from("saved_companies")
        .select("id")
        .eq("user_id", user.id)
        .eq("company_id", company.id)
        .single();

      userHasSaved = !!savedCompany;
    }

    // Add user_has_liked to reviews
    const reviewsWithLikes: ReviewWithDetails[] = (reviews || []).map((r) => ({
      ...r,
      user_has_liked: userLikes.has(r.id),
    }));

    // Calculate aggregated stats
    const cadReviews = reviewsWithLikes.filter(
      (r) => r.wage_hourly && r.wage_currency === "CAD"
    );
    const usdReviews = reviewsWithLikes.filter(
      (r) => r.wage_hourly && r.wage_currency === "USD"
    );
    const reviewsWithRounds = reviewsWithLikes.filter(
      (r) => r.interview_round_count > 0
    );
    const reviewsWithDuration = reviewsWithLikes.filter(
      (r) => r.duration_months
    );

    // Work style breakdown
    const workStyleBreakdown = {
      onsite: reviewsWithLikes.filter((r) => r.work_style === "onsite").length,
      hybrid: reviewsWithLikes.filter((r) => r.work_style === "hybrid").length,
      remote: reviewsWithLikes.filter((r) => r.work_style === "remote").length,
    };

    // Common roles
    const roleCounts: Record<string, number> = {};
    reviewsWithLikes.forEach((r) => {
      const roleTitle = r.role?.title;
      if (roleTitle) {
        roleCounts[roleTitle] = (roleCounts[roleTitle] || 0) + 1;
      }
    });
    const commonRoles = Object.entries(roleCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([role]) => role);

    // Common locations
    const locationCounts: Record<string, number> = {};
    reviewsWithLikes.forEach((r) => {
      if (r.location) {
        locationCounts[r.location] = (locationCounts[r.location] || 0) + 1;
      }
    });
    const commonLocations = Object.entries(locationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([loc]) => loc);

    // Common technologies
    const techCounts: Record<string, number> = {};
    reviewsWithLikes.forEach((r) => {
      if (r.technologies) {
        r.technologies.split(",").forEach((tech: string) => {
          const trimmed = tech.trim();
          if (trimmed) {
            techCounts[trimmed] = (techCounts[trimmed] || 0) + 1;
          }
        });
      }
    });
    const commonTechnologies = Object.entries(techCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([tech]) => tech);

    // Common interview format
    const formatCounts: Record<string, number> = {};
    reviewsWithLikes.forEach((r) => {
      if (r.interview_rounds_description) {
        const desc = r.interview_rounds_description.toLowerCase();
        if (desc.includes("technical") && desc.includes("behavioral")) {
          formatCounts["Technical + Behavioral"] =
            (formatCounts["Technical + Behavioral"] || 0) + 1;
        } else if (desc.includes("technical")) {
          formatCounts["Technical"] = (formatCounts["Technical"] || 0) + 1;
        } else if (desc.includes("behavioral")) {
          formatCounts["Behavioral"] = (formatCounts["Behavioral"] || 0) + 1;
        } else if (desc.includes("case study") || desc.includes("case-study")) {
          formatCounts["Case Study"] = (formatCounts["Case Study"] || 0) + 1;
        }
      }
    });
    const commonInterviewFormat =
      Object.entries(formatCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const companyWithStats: CompanyWithStats = {
      ...company,
      review_count: reviewsWithLikes.length,
      avg_pay_cad:
        cadReviews.length > 0
          ? cadReviews.reduce((sum, r) => sum + (r.wage_hourly || 0), 0) /
            cadReviews.length
          : null,
      avg_pay_usd:
        usdReviews.length > 0
          ? usdReviews.reduce((sum, r) => sum + (r.wage_hourly || 0), 0) /
            usdReviews.length
          : null,
      avg_interview_rounds:
        reviewsWithRounds.length > 0
          ? reviewsWithRounds.reduce(
              (sum, r) => sum + r.interview_round_count,
              0
            ) / reviewsWithRounds.length
          : null,
      common_interview_format: commonInterviewFormat,
      work_style_breakdown: workStyleBreakdown,
      common_roles: commonRoles,
      common_locations: commonLocations,
      avg_duration_months:
        reviewsWithDuration.length > 0
          ? reviewsWithDuration.reduce(
              (sum, r) => sum + (r.duration_months || 0),
              0
            ) / reviewsWithDuration.length
          : null,
      common_technologies: commonTechnologies,
      user_has_saved: userHasSaved,
    };

    // Filter reviews by role if specified
    let filteredReviews = reviewsWithLikes;
    if (roleFilter) {
      filteredReviews = reviewsWithLikes.filter(
        (r) => r.role?.title === roleFilter
      );
    }

    return NextResponse.json({
      company: companyWithStats,
      reviews: filteredReviews,
      roles: commonRoles, // For the filter dropdown
    });
  } catch (error) {
    console.error("GET /api/companies/[slug] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

