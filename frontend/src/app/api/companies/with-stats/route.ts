import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CompanyWithStats } from "@/lib/types/database";

/**
 * GET /api/companies/with-stats
 * Get companies with aggregated review statistics
 * Optimized with parallel queries and caching
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Parallel: Check auth and fetch companies simultaneously
    const [authResult, companiesResult] = await Promise.all([
      supabase.auth.getUser(),
      (async () => {
        let companiesQuery = supabase.from("companies").select("*");
        if (search) {
          companiesQuery = companiesQuery.ilike("name", `%${search}%`);
        }
        return companiesQuery.order("name").limit(limit);
      })(),
    ]);

    const { data: { user } } = authResult;
    const { data: companies, error: companiesError } = companiesResult;

    if (companiesError) {
      console.error("Companies fetch error:", companiesError);
      return NextResponse.json(
        { error: "Failed to fetch companies" },
        { status: 500 }
      );
    }

    if (!companies || companies.length === 0) {
      return NextResponse.json([], {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      });
    }

    // Parallel: Fetch reviews and saved companies simultaneously
    const companyIds = companies.map((c) => c.id);
    const [reviewsResult, savedCompaniesResult] = await Promise.all([
      supabase
        .from("reviews")
        .select(`
          company_id,
          wage_hourly,
          wage_currency,
          interview_round_count,
          work_style,
          duration_months,
          location,
          technologies,
          interview_rounds_description,
          role:roles(title)
        `)
        .in("company_id", companyIds),
      user
        ? supabase
            .from("saved_companies")
            .select("company_id")
            .eq("user_id", user.id)
        : Promise.resolve({ data: null }),
    ]);

    const { data: reviews, error: reviewsError } = reviewsResult;
    if (reviewsError) {
      console.error("Reviews fetch error:", reviewsError);
    }

    // Build saved companies set
    let savedCompanyIds: Set<string> = new Set();
    if (savedCompaniesResult.data) {
      savedCompanyIds = new Set(savedCompaniesResult.data.map((s) => s.company_id));
    }

    // Aggregate stats for each company
    const companiesWithStats: CompanyWithStats[] = companies.map((company) => {
      const companyReviews = (reviews || []).filter(
        (r) => r.company_id === company.id
      );

      // Calculate averages
      const cadReviews = companyReviews.filter(
        (r) => r.wage_hourly && r.wage_currency === "CAD"
      );
      const usdReviews = companyReviews.filter(
        (r) => r.wage_hourly && r.wage_currency === "USD"
      );
      const reviewsWithRounds = companyReviews.filter(
        (r) => r.interview_round_count > 0
      );
      const reviewsWithDuration = companyReviews.filter(
        (r) => r.duration_months
      );

      // Work style breakdown
      const workStyleBreakdown = {
        onsite: companyReviews.filter((r) => r.work_style === "onsite").length,
        hybrid: companyReviews.filter((r) => r.work_style === "hybrid").length,
        remote: companyReviews.filter((r) => r.work_style === "remote").length,
      };

      // Common roles (count occurrences)
      const roleCounts: Record<string, number> = {};
      companyReviews.forEach((r) => {
        const roleTitle = (r.role as { title?: string })?.title;
        if (roleTitle) {
          roleCounts[roleTitle] = (roleCounts[roleTitle] || 0) + 1;
        }
      });
      const commonRoles = Object.entries(roleCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([role]) => role);

      // Common locations
      const locationCounts: Record<string, number> = {};
      companyReviews.forEach((r) => {
        if (r.location) {
          locationCounts[r.location] = (locationCounts[r.location] || 0) + 1;
        }
      });
      const commonLocations = Object.entries(locationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([loc]) => loc);

      // Common technologies
      const techCounts: Record<string, number> = {};
      companyReviews.forEach((r) => {
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
        .slice(0, 10)
        .map(([tech]) => tech);

      // Common interview format (simplified - most mentioned pattern)
      const formatCounts: Record<string, number> = {};
      companyReviews.forEach((r) => {
        if (r.interview_rounds_description) {
          // Extract common patterns
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

      // Calculate pay ranges (min/max)
      const cadWages = cadReviews.map((r) => r.wage_hourly).filter((w): w is number => w !== null);
      const usdWages = usdReviews.map((r) => r.wage_hourly).filter((w): w is number => w !== null);

      return {
        ...company,
        review_count: companyReviews.length,
        min_pay_cad: cadWages.length > 0 ? Math.min(...cadWages) : null,
        max_pay_cad: cadWages.length > 0 ? Math.max(...cadWages) : null,
        min_pay_usd: usdWages.length > 0 ? Math.min(...usdWages) : null,
        max_pay_usd: usdWages.length > 0 ? Math.max(...usdWages) : null,
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
        user_has_saved: savedCompanyIds.has(company.id),
      };
    });

    // Filter out companies with no reviews - they're not useful to browse
    const companiesWithReviews = companiesWithStats.filter(
      (c) => c.review_count > 0
    );

    // Sort by review count (most reviewed first)
    companiesWithReviews.sort((a, b) => b.review_count - a.review_count);

    // Add cache headers for public anonymous requests
    const cacheControl = user
      ? 'private, max-age=60, stale-while-revalidate=120' // Authenticated: reduce refetch on tab return
      : 'public, s-maxage=300, stale-while-revalidate=600'; // Anonymous: keep 5min cache

    return NextResponse.json(companiesWithReviews, {
      headers: {
        'Cache-Control': cacheControl,
      },
    });
  } catch (error) {
    console.error("GET /api/companies/with-stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

