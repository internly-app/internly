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
                className="rounded-full bg-[#7748F6] text-white hover:bg-[#6636E5] transition-all duration-200 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
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
      <footer className="py-12 px-6 bg-foreground border-t transition-colors duration-300">
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
