"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-6 py-24">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-heading-1 mb-4 text-foreground">
            About Internly
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your go-to platform for discovering real internship experiences from students like you
          </p>
        </div>

        {/* Mission Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl mb-4">Our Mission</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base leading-relaxed text-muted-foreground mb-4">
              We're students who know how overwhelming the internship search can be. Internly exists to make that process a bit easier by connecting you with real experiences from students who've been there. We believe in transparency, community, and helping each other navigate the world of tech internships.
            </p>
            <p className="text-base leading-relaxed text-muted-foreground">
              Whether you're trying to figure out what skills to learn, how to prepare for interviews, or what to expect at a specific company, Internly gives you the insights you need to make informed decisions about your career.
            </p>
          </CardContent>
        </Card>

        {/* What is Internly Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl mb-4">What is Internly?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base leading-relaxed text-muted-foreground mb-4">
              Internly is a platform where students can share and explore internship experiences. Think of it as your insider's guide to internships at tech companies, startups, and beyond.
            </p>
            <p className="text-base leading-relaxed text-muted-foreground mb-4">
              When you browse reviews on Internly, you'll find out:
            </p>
            <ul className="list-disc list-inside space-y-2 text-base text-muted-foreground ml-4">
              <li>What past interns actually worked on day to day</li>
              <li>How they prepared for their interviews</li>
              <li>What skills and technologies they used</li>
              <li>Which courses helped them land their roles</li>
              <li>What the interview process was really like</li>
              <li>Compensation details and perks</li>
              <li>Honest advice about the best and hardest parts</li>
            </ul>
          </CardContent>
        </Card>

        {/* What Sets Us Apart Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl mb-4">What Sets Internly Apart?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Student-Focused</h3>
              <p className="text-base leading-relaxed text-muted-foreground">
                We're built by students, for students. Every review comes from someone who's been in your shoes, navigating classes, side projects, and the job search all at once. No corporate speak, just real experiences.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Detailed and Actionable</h3>
              <p className="text-base leading-relaxed text-muted-foreground">
                We go beyond surface-level reviews. Our platform encourages detailed insights about preparation, skills used, and specific experiences. You'll find the kind of information that actually helps you prepare and make decisions.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Community-Driven</h3>
              <p className="text-base leading-relaxed text-muted-foreground">
                Internly thrives on community contributions. Every review helps someone else navigate their journey. It's about students supporting students, sharing knowledge, and making the internship search less intimidating.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Core Features Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl mb-4">What You Can Do</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Share Your Experience</h3>
              <p className="text-base leading-relaxed text-muted-foreground mb-3">
                Write a review about your internship experience. Share details about the company, your role, what you worked on, how you prepared, and what you learned. Your insights help other students make better decisions.
              </p>
              <p className="text-base leading-relaxed text-muted-foreground">
                Our review form covers everything from basic details like location and term, to your experience, interview process, and compensation. You can be as detailed as you want to help others.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Browse and Discover</h3>
              <p className="text-base leading-relaxed text-muted-foreground mb-3">
                Explore reviews from students who've interned at companies you're interested in. Filter by company, role, location, or search for specific skills and technologies.
              </p>
              <p className="text-base leading-relaxed text-muted-foreground">
                Find out what it's really like to work somewhere, what skills you should focus on, and how others prepared for their interviews. Use this information to tailor your own preparation and applications.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Values Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl mb-4">Our Values</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">Transparency</h3>
                <p className="text-base text-muted-foreground">
                  We believe in honest, authentic reviews that give real insights into internship experiences.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">Community</h3>
                <p className="text-base text-muted-foreground">
                  Students helping students. We're all in this together, sharing knowledge and supporting each other.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">Accessibility</h3>
                <p className="text-base text-muted-foreground">
                  Making internship information accessible to everyone, regardless of background or connections.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">Relatability</h3>
                <p className="text-base text-muted-foreground">
                  Reviews from people who understand the student experience, written in a way that actually makes sense.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="text-center">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">
                Ready to Get Started?
              </h2>
              <p className="text-base text-muted-foreground mb-6">
                Join the community and start exploring internship experiences, or share your own story to help others.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild>
                  <Link href="/write-review">
                    Write a Review
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/">
                    Browse Reviews
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

