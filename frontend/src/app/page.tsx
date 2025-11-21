"use client";

import { useState } from "react";
import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import CompanyCarousel from "@/components/CompanyCarousel";
import ReviewCard from "@/components/ReviewCard";
import { Button } from "@/components/ui/button";
import { useReviews } from "@/hooks/useReviews";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const [sort, setSort] = useState<"likes" | "recent">("likes");
  const { reviews, total, loading, error } = useReviews({ sort, limit: 20 });

  return (
    <main className="min-h-screen">
      <Navigation />
      <HeroSection />
      <CompanyCarousel />

      {/* Reviews Section */}
      <section id="reviews" className="py-24 px-6 bg-background transition-colors duration-300">
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

          {/* Loading State */}
          {loading && (
            <div className="grid gap-6 max-w-4xl mx-auto">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-64 w-full rounded-lg" />
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <p className="text-destructive">Error loading reviews: {error}</p>
            </div>
          )}

          {/* Reviews Grid */}
          {!loading && !error && reviews.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No reviews yet</p>
              <Button
                asChild
              >
                <a href="/signin?redirect=review">Be the first to write a review</a>
              </Button>
            </div>
          )}

          {!loading && !error && reviews.length > 0 && (
            <div className="grid gap-6 max-w-4xl mx-auto">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-background border-t border-border">
        <div className="max-w-[100rem] mx-auto">
          <div className="flex flex-col gap-6">
            <div className="text-sm text-muted-foreground">
              © 2025 Tejas Thind and Srinikesh Singarapu. All rights reserved.
            </div>
            <div className="text-sm text-muted-foreground">
              Want to see a company added or noticed a bug? Feel free to contact us.
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
