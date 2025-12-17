import dynamic from "next/dynamic";
import Navigation from "@/components/Navigation";
import LandingStats from "@/components/LandingStats";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { ReviewWithDetails } from "@/lib/types/database";

// Dynamic imports for heavy components (below the fold)
const HeroSection = dynamic(() => import("@/components/HeroSection"), {
  loading: () => (
    <div className="h-screen w-full flex items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  ),
});

const Footer = dynamic(() => import("@/components/Footer"));

// ISR: Revalidate every hour for static content
export const revalidate = 3600;

export default async function Home() {
  // Fetch top 3 most liked reviews for hero section
  let heroReviews: ReviewWithDetails[] = [];
  try {
    const supabaseAdmin = createServiceRoleClient();
    // Fetch more than 3 to handle ties, then sort and take top 3
    const { data: reviews } = await supabaseAdmin
      .from("reviews")
      .select(`
        *,
        company:companies(*),
        role:roles(*)
      `)
      .order("like_count", { ascending: false })
      .limit(10); // Fetch more to handle ties properly

    if (reviews && reviews.length > 0) {
      // Sort with tie-breaking: if like_count is equal, use created_at (most recent first)
      const sortedReviews = reviews.sort((a, b) => {
        // Primary sort: like_count (descending)
        const likeDiff = (b.like_count || 0) - (a.like_count || 0);
        if (likeDiff !== 0) return likeDiff;
        // Tie-breaker: created_at (most recent first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      // Take top 3 and add user_has_liked flag
      const top3Reviews = sortedReviews
        .slice(0, 3)
        .map((r) => ({ ...r, user_has_liked: false }));

      // Reorder: Most liked goes in center (position 1), second most liked on left (position 0), third on right (position 2)
      // This ensures the most prominent card (center) shows the most liked review
      if (top3Reviews.length === 3) {
        heroReviews = [top3Reviews[1], top3Reviews[0], top3Reviews[2]];
      } else {
        heroReviews = top3Reviews;
      }
    }
  } catch (error) {
    console.error("Failed to fetch hero reviews:", error);
    // Continue with empty array - HeroSection will handle it
  }

  return (
    <main className="min-h-screen flex flex-col">
      <Navigation animate={true} />
      <HeroSection reviews={heroReviews} />

      <LandingStats />

      <Footer />
    </main>
  );
}
