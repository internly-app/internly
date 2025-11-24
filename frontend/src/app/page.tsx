"use client";

import Link from "next/link";
import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import CompanyCarousel from "@/components/CompanyCarousel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight, Search, FileText, Users } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <HeroSection />
      <CompanyCarousel />

      {/* Features Section */}
      <section className="py-24 px-6 bg-background transition-colors duration-300">
        <div className="max-w-[100rem] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-heading-1 mb-4 text-foreground">
              Everything You Need to Navigate Internships
            </h2>
            <p className="text-lg md:text-xl max-w-2xl mx-auto text-muted-foreground">
              Get insights from real students who&apos;ve been there
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
            {/* Feature 1: Browse Reviews */}
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Search className="size-6 text-primary" />
                </div>
                <CardTitle>Browse Reviews</CardTitle>
                <CardDescription>
                  Search and filter through hundreds of internship reviews. Find exactly what you&apos;re looking for.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full gap-2 group">
                  <Link href="/reviews">
                    Browse Reviews
                    <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Feature 2: Write Review */}
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <FileText className="size-6 text-primary" />
                </div>
                <CardTitle>Share Your Experience</CardTitle>
                <CardDescription>
                  Help other students by sharing your internship experience. Your insights make a difference.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full gap-2 group">
                  <Link href="/write-review">
                    Write a Review
                    <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Feature 3: Community */}
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="size-6 text-primary" />
                </div>
                <CardTitle>Join the Community</CardTitle>
                <CardDescription>
                  Connect with students navigating the same journey. Learn from each other&apos;s experiences.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/about">Learn More</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-background transition-colors duration-300">
        <div className="max-w-4xl mx-auto text-center">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-heading-2 mb-4 text-foreground">
                Ready to Explore Internship Experiences?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Discover what it&apos;s really like to intern at top companies, or share your own story to help others.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="gap-2 group">
                  <Link href="/reviews">
                    Browse Reviews
                    <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/write-review">Write a Review</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-background border-t border-border">
        <div className="max-w-[100rem] mx-auto">
          <div className="flex flex-col gap-6">
            <div className="text-sm text-muted-foreground font-semibold">
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
