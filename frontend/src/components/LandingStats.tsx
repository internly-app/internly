import { createServiceRoleClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import CompanyCard from "@/components/CompanyCard";
import { StatsSection } from "@/components/StatsSection";
import type { CompanyWithStats } from "@/lib/types/database";

export default async function LandingStats() {
  let supabaseAdmin;
  try {
    supabaseAdmin = createServiceRoleClient();
  } catch (error) {
    return null;
  }

  // Fetch all data in parallel
  const [companiesResult, allReviewsResult] = await Promise.all([
    // All companies
    supabaseAdmin.from("companies").select("*").order("name"),
    // All reviews for counting
    supabaseAdmin.from("reviews").select("company_id"),
  ]);

  const { data: companies } = companiesResult;
  const { data: allReviews } = allReviewsResult;

  if (!companies || companies.length === 0 || !allReviews) {
    return null;
  }

  // Count companies with reviews (only count unique companies that have reviews)
  const companiesWithReviewsSet = new Set<string>();
  allReviews.forEach((r) => {
    if (r.company_id) {
      companiesWithReviewsSet.add(r.company_id);
    }
  });

  const totalReviews = allReviews.length;
  const totalCompaniesWithReviews = companiesWithReviewsSet.size;

  // Calculate review counts per company
  const companyReviewCounts: Record<string, number> = {};
  allReviews.forEach((r) => {
    if (r.company_id) {
      companyReviewCounts[r.company_id] = (companyReviewCounts[r.company_id] || 0) + 1;
    }
  });

  // Get top companies with reviews
  const companiesWithStats: CompanyWithStats[] = companies
    .map((company) => ({
      ...company,
      review_count: companyReviewCounts[company.id] || 0,
      min_pay_cad: null,
      max_pay_cad: null,
      min_pay_usd: null,
      max_pay_usd: null,
      avg_interview_rounds: null,
      common_interview_format: null,
      work_style_breakdown: { onsite: 0, hybrid: 0, remote: 0 },
      common_roles: [],
      common_locations: [],
      avg_duration_months: null,
      common_technologies: [],
      user_has_saved: false,
    }))
    .filter((c) => c.review_count > 0)
    .sort((a, b) => b.review_count - a.review_count)
    .slice(0, 6);

  const mostReviewedCount = companiesWithStats.length > 0 ? companiesWithStats[0].review_count : 0;

  return (
    <div className="space-y-24">
      {/* Stats Section with animations */}
      <StatsSection
        totalReviews={totalReviews}
        totalCompanies={totalCompaniesWithReviews}
        mostReviewedCount={mostReviewedCount}
      />

      {/* Popular Companies */}
      {companiesWithStats.length > 0 && (
        <section className="py-16 px-6 bg-background">
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
              <Button asChild variant="outline" className="hidden sm:flex gap-2">
                <Link href="/companies">
                  View All
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {companiesWithStats.slice(0, 6).map((company) => (
                <CompanyCard key={company.id} company={company} />
              ))}
            </div>
            <div className="mt-8 text-center sm:hidden">
              <Button asChild variant="outline" className="gap-2">
                <Link href="/companies">
                  View All Companies
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-24 px-6 bg-background">
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
    </div>
  );
}

