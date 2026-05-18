import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import CompanyCard from "@/components/CompanyCard";
import { StatsSection } from "@/components/StatsSection";
import type { CompanyWithStats } from "@/lib/types/database";

/**
 * Optimized landing stats component
 * - Only fetches top 6 companies (not all)
 * - Only fetches reviews for those companies (not all reviews)
 * - Minimal queries for stats (counts only)
 * - Leverages parallel queries
 */
export default async function LandingStats() {
  // Use public client for better reliability with public data
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Step 1: Parallel fetch for global stats and top companies identity
  // Optimized: Use database sorting instead of fetching all reviews to group in JS
  const [topCompaniesResult, globalStatsResult, companiesCountResult] =
    await Promise.all([
      // 1. Get top 6 companies by review count directly from DB
      supabase
        .from("companies")
        .select("id")
        .order("review_count", { ascending: false })
        .limit(6),

      // 2. Get global review stats (like count for total calculation)
      // Note: Summing likes still requires fetching the column, but it's lighter than fetching company_id too
      supabase.from("reviews").select("like_count"),

      // 3. Get total companies count (lighter than extracting unique IDs from reviews)
      supabase
        .from("companies")
        .select("*", { count: "exact", head: true })
        .gt("review_count", 0),
    ]);

  const topCompanyIds = topCompaniesResult.data?.map((c) => c.id) || [];
  const allReviewsForStats = globalStatsResult.data || [];

  const totalReviews = allReviewsForStats.length;
  const totalLikes = allReviewsForStats.reduce(
    (sum, r) => sum + (r.like_count || 0),
    0
  );
  const totalCompaniesWithReviews = companiesCountResult.count || 0;

  if (topCompanyIds.length === 0) {
    return null;
  }

  // Step 2: Fetch full details for the identified top companies in parallel
  const [companiesResult, reviewsResult] = await Promise.all([
    supabase.from("companies").select("*").in("id", topCompanyIds),
    supabase
      .from("reviews")
      .select(
        `
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
      `
      )
      .in("company_id", topCompanyIds),
  ]);

  const { data: companies } = companiesResult;
  const { data: reviews } = reviewsResult;

  if (!companies || !reviews) {
    return null;
  }

  // Step 3: Calculate stats for top 6 companies only
  const companiesWithStats: CompanyWithStats[] = companies
    .map((company) => {
      const companyReviews = reviews.filter((r) => r.company_id === company.id);

      if (companyReviews.length === 0) {
        return null;
      }

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

      const workStyleBreakdown = {
        onsite: companyReviews.filter((r) => r.work_style === "onsite").length,
        hybrid: companyReviews.filter((r) => r.work_style === "hybrid").length,
        remote: companyReviews.filter((r) => r.work_style === "remote").length,
      };

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
          } else if (
            desc.includes("case study") ||
            desc.includes("case-study")
          ) {
            formatCounts["Case Study"] = (formatCounts["Case Study"] || 0) + 1;
          }
        }
      });
      const commonInterviewFormat =
        Object.entries(formatCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
        null;

      const cadWages = cadReviews
        .map((r) => r.wage_hourly)
        .filter((w): w is number => w !== null);
      const usdWages = usdReviews
        .map((r) => r.wage_hourly)
        .filter((w): w is number => w !== null);

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
        user_has_saved: false,
      };
    })
    .filter((c): c is CompanyWithStats => c !== null)
    .sort((a, b) => b.review_count - a.review_count);

  return (
    <>
      {/* Stats Section with animations */}
      <StatsSection
        totalReviews={totalReviews}
        totalCompanies={totalCompaniesWithReviews}
        totalLikes={totalLikes}
      />

      {/* Popular Companies */}
      {companiesWithStats.length > 0 && (
        <section className="py-16 md:py-24 px-4 sm:px-6 bg-background">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-2">
                  Popular Companies
                </h2>
                <p className="text-muted-foreground">
                  Companies with the most internship reviews
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                className="hidden sm:flex gap-2 group flex-shrink-0"
              >
                <Link href="/companies">
                  View All
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>

            {/* Asymmetric grid: featured card spans 2 cols on desktop, rest fill 2-col */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {companiesWithStats.slice(0, 1).map((company) => (
                <div key={company.id} className="md:col-span-2">
                  <CompanyCard company={company} featured />
                </div>
              ))}
              {companiesWithStats.slice(1, 5).map((company) => (
                <CompanyCard key={company.id} company={company} />
              ))}
            </div>

            <div className="mt-8 text-center sm:hidden">
              <Button asChild variant="outline" className="gap-2 group">
                <Link href="/companies">
                  View All Companies
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 md:py-24 px-4 sm:px-6 bg-background border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div className="max-w-xl">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">
              Ready to find your next internship?
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Browse reviews from students who&apos;ve been there. See what
              interviews are really like, what you&apos;ll get paid, and what
              you&apos;ll actually work on.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            <Button asChild size="lg" className="gap-2 group">
              <Link href="/reviews">
                Browse Reviews
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2 group">
              <Link href="/write-review">
                Write a Review
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
