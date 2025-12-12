import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CompanyWithStats } from "@/lib/types/database";

/**
 * GET /api/user/saved-companies
 * Get current user's saved companies with stats
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

    // Fetch user's saved companies
    const { data: savedCompanies, error: savedError } = await supabase
      .from("saved_companies")
      .select(`
        company_id,
        created_at,
        company:companies(*)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (savedError) {
      console.error("Saved companies fetch error:", savedError);
      return NextResponse.json(
        { error: "Failed to fetch saved companies" },
        { status: 500 }
      );
    }

    if (!savedCompanies || savedCompanies.length === 0) {
      return NextResponse.json([]);
    }

    // Get all company IDs
    const companyIds = savedCompanies.map((s) => s.company_id);

    // Fetch reviews for these companies to calculate stats
    const { data: reviews } = await supabase
      .from("reviews")
      .select(`
        *,
        role:roles(title)
      `)
      .in("company_id", companyIds);

    // Calculate stats for each company
    const companiesWithStats: CompanyWithStats[] = savedCompanies
      .filter((s) => s.company && !Array.isArray(s.company)) // Filter out any null or invalid companies
      .map((savedCompany) => {
        const company = savedCompany.company as unknown as { id: string; name: string; slug: string; logo_url: string | null; website: string | null; industry: string | null; created_at: string; updated_at: string };
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
        const workLocationBreakdown = {
          onsite: companyReviews.filter((r) => r.work_location === "onsite").length,
          hybrid: companyReviews.filter((r) => r.work_location === "hybrid").length,
          remote: companyReviews.filter((r) => r.work_location === "remote").length,
        };

        // Common roles
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

        // Common interview format (most mentioned pattern)
        const formatCounts: Record<string, number> = {};
        companyReviews.forEach((r) => {
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
          work_location_breakdown: workLocationBreakdown,
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
          user_has_saved: true, // Always true since these are saved companies
        };
      });

    return NextResponse.json(companiesWithStats);
  } catch (error) {
    console.error("GET /api/user/saved-companies error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

