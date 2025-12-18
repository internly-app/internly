import { createServiceRoleClient } from "@/lib/supabase/server";
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
  let supabaseAdmin;
  try {
    supabaseAdmin = createServiceRoleClient();
  } catch {
    return null;
  }

  // Step 1: Fetch minimal data for stats AND identify top companies in one query
  const { data: allReviewsForStats } = await supabaseAdmin
    .from("reviews")
    .select("company_id, like_count")
    .not("company_id", "is", null);

  if (!allReviewsForStats || allReviewsForStats.length === 0) {
    return null;
  }

  // Calculate total stats and identify top 6 companies simultaneously
  const companiesWithReviewsSet = new Set<string>();
  const companyReviewCounts = new Map<string, number>();
  
  allReviewsForStats.forEach((r) => {
    if (r.company_id) {
      companiesWithReviewsSet.add(r.company_id);
      companyReviewCounts.set(r.company_id, (companyReviewCounts.get(r.company_id) || 0) + 1);
    }
  });

  const totalReviews = allReviewsForStats.length;
  const totalCompaniesWithReviews = companiesWithReviewsSet.size;
  const totalLikes = allReviewsForStats.reduce((sum, review) => sum + (review.like_count || 0), 0);

  // Get top 6 company IDs by review count
  const topCompanyIds = Array.from(companyReviewCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id]) => id);

  if (topCompanyIds.length === 0) {
    return null;
  }

  // Step 2: Fetch top companies and their reviews in parallel
  const [companiesResult, reviewsResult] = await Promise.all([
    supabaseAdmin
      .from("companies")
      .select("*")
      .in("id", topCompanyIds),
    supabaseAdmin
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
      const reviewsWithDuration = companyReviews.filter((r) => r.duration_months);

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
          } else if (desc.includes("case study") || desc.includes("case-study")) {
            formatCounts["Case Study"] = (formatCounts["Case Study"] || 0) + 1;
          }
        }
      });
      const commonInterviewFormat =
        Object.entries(formatCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

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
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-semibold mb-2">
                  Popular Companies
                </h2>
                <p className="text-muted-foreground">
                  Companies with the most internship reviews
                </p>
              </div>
              <Button asChild variant="outline" className="hidden sm:flex gap-2 group">
                <Link href="/companies">
                  View All
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {companiesWithStats.slice(0, 6).map((company) => (
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
      <section className="py-16 md:py-24 px-4 sm:px-6 bg-background">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-semibold mb-4">
            Ready to find your next internship?
          </h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Browse reviews from students who&apos;ve been there. See what interviews are really like, what you&apos;ll get paid, and what you&apos;ll actually work on.
          </p>
          <Button asChild size="lg" className="gap-2 group">
            <Link href="/reviews">
              Browse Reviews
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}

