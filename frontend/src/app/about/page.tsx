"use client";

import Link from "next/link";
import { ArrowRight, Search, Edit, Users } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-3xl mx-auto px-6 py-24">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-foreground">
            What is Internly?
          </h1>
          <p className="text-xl text-muted-foreground">
            Real internship reviews from students, for students.
          </p>
        </div>

        {/* What is Internly */}
        <div className="mb-12 text-center">
          <p className="text-xl text-muted-foreground">
            Students share detailed internship reviews: what they actually worked on, how they prepared, interview processes, compensation, and honest advice.
          </p>
        </div>

        {/* How to Use It */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">How to Maximize Your Success</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4">
              <Search className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">1. Research Before Applying</h3>
                <p className="text-muted-foreground">
                  Search for companies you&apos;re interested in. Learn what technologies they use, how they interview, and what past interns actually worked on. Tailor your applications accordingly.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Users className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">2. Prepare Strategically</h3>
                <p className="text-muted-foreground">
                  Use interview tips and preparation advice from students who got the roles you want. Focus on the skills and topics they mention.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Edit className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">3. Share Your Experience</h3>
                <p className="text-muted-foreground">
                  After your internship, write a detailed review. Help the next person and build the community that helped you.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What Makes Us Different */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">What Makes Us Different</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span><strong>No corporate BS:</strong> Real reviews from students who actually did the work</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span><strong>Actionable details:</strong> Specific technologies, interview questions, and preparation tips</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span><strong>Transparent:</strong> Compensation data, work culture, and honest pros/cons</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span><strong>Student-focused:</strong> Built by students who understand your challenges</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center bg-muted/30 rounded-lg p-8">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">
            Start Using Internly
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild className="gap-2 group">
              <Link href="/write-review">
                Write a Review
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button variant="outline" asChild className="gap-2 group">
              <Link href="/reviews">
                Browse Reviews
                <Search className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}

