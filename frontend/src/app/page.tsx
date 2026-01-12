import dynamic from "next/dynamic";
import Navigation from "@/components/Navigation";
import LandingStats from "@/components/LandingStats";
import { createClient } from "@supabase/supabase-js";
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

// ISR: Revalidate every 60 seconds (1 minute) to ensure stats are fresh
export const revalidate = 60;

export default async function Home() {
  // Use a public client for fetching public home page data
  // This avoids build failures if SUPABASE_SERVICE_ROLE_KEY is missing in some environments
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch top 3 most liked reviews for hero section
  let heroReviews: ReviewWithDetails[] = [];

  try {
    const reviewsResult = await supabase
      .from("reviews")
      .select(`*, company:companies(*), role:roles(*)`)
      .order("like_count", { ascending: false })
      .limit(10); // Fetch more to handle ties

    // Process reviews
    const reviews = reviewsResult.data || [];
    if (reviews.length > 0) {
      const sortedReviews = reviews.sort((a, b) => {
        const likeDiff = (b.like_count || 0) - (a.like_count || 0);
        if (likeDiff !== 0) return likeDiff;
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });

      const top3Reviews = sortedReviews
        .slice(0, 3)
        .map((r) => ({ ...r, user_has_liked: false }));

      if (top3Reviews.length === 3) {
        heroReviews = [top3Reviews[1], top3Reviews[0], top3Reviews[2]];
      } else {
        heroReviews = top3Reviews;
      }
    }
  } catch (error) {
    console.error("Failed to fetch home page data:", error);
  }

  return (
    <main className="min-h-screen flex flex-col">
      <Navigation />
      <HeroSection reviews={heroReviews} />
      <LandingStats />
      <Footer />
    </main>
  );
}
