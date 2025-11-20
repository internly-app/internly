"use client";

import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import CompanyCarousel from "@/components/CompanyCarousel";
import StatsSection from "@/components/StatsSection";
import ReviewCard from "@/components/ReviewCard";
import { Button } from "@/components/ui/button";

// Placeholder review data - will be replaced with real data from useReviews hook
const PLACEHOLDER_REVIEWS = [
  {
    id: "1",
    company: "Google",
    position: "Software Engineering Intern",
    rating: 5,
    review_text:
      "Amazing experience! The team was incredibly supportive and I learned so much about large-scale distributed systems. The intern program is well-structured with lots of networking opportunities.",
    pros: "Great mentorship, competitive compensation, amazing perks and campus facilities",
    cons: "Can be overwhelming at times, very fast-paced environment",
    created_at: "2024-08-15T10:30:00Z",
    likes_count: 45,
    author: {
      first_name: "Alex",
      last_name: "Johnson",
    },
  },
  {
    id: "2",
    company: "Meta",
    position: "Product Design Intern",
    rating: 4,
    review_text:
      "Great internship with real impact. I worked on features that shipped to millions of users. The design team is world-class and very collaborative.",
    pros: "Real product impact, excellent design culture, great team events",
    cons: "Long commute to office, sometimes unclear priorities",
    created_at: "2024-07-20T14:20:00Z",
    likes_count: 32,
    author: {
      first_name: "Sarah",
      last_name: "Chen",
    },
  },
  {
    id: "3",
    company: "Amazon",
    position: "Data Science Intern",
    rating: 4,
    review_text:
      "Challenging and rewarding experience. Got to work with real customer data and build ML models that directly impacted business decisions.",
    pros: "Challenging projects, good work-life balance, learning opportunities",
    cons: "Large company bureaucracy, slower decision making",
    created_at: "2024-06-10T09:15:00Z",
    likes_count: 28,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <HeroSection />
      <CompanyCarousel />
      <StatsSection />

      {/* Reviews Section */}
      <section id="reviews" className="py-24 px-6 bg-background">
        <div className="max-w-[100rem] mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-heading-1 mb-4 text-foreground">
              Latest Reviews
            </h2>
            <p className="text-lg md:text-xl max-w-2xl mx-auto text-muted-foreground">
              Real experiences from students who&apos;ve interned at top companies
            </p>
          </div>

          {/* Reviews Grid */}
          <div className="grid gap-6 max-w-4xl mx-auto">
            {PLACEHOLDER_REVIEWS.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>

          {/* Load More */}
          <div className="text-center mt-12">
            <Button
              size="lg"
              className="rounded-full bg-foreground text-background hover:bg-foreground/90 px-8"
            >
              Load More Reviews
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-foreground border-t">
        <div className="max-w-[100rem] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-sm text-background/70">
            © 2024 Internly. All rights reserved.
          </div>
          <div className="flex gap-8">
            <a
              href="#"
              className="text-sm text-background/70 hover:text-background transition-colors"
            >
              Terms
            </a>
            <a
              href="#"
              className="text-sm text-background/70 hover:text-background transition-colors"
            >
              Privacy
            </a>
            <a
              href="#"
              className="text-sm text-background/70 hover:text-background transition-colors"
            >
              About
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
