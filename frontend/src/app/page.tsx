"use client";

import Link from "next/link";
import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import Footer from "@/components/Footer";
import { Search, FileText, Users } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navigation animate={true} />
      <HeroSection />

      {/* Key Benefits Section */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Internly?
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <Search className="size-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Real Reviews</h3>
              <p className="text-muted-foreground">
                Unfiltered insights from students who actually interned at these companies
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-4">
                <FileText className="size-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Detailed Insights</h3>
              <p className="text-muted-foreground">
                Interview process, compensation, culture, and day-to-day experiences
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-4">
                <Users className="size-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Student Community</h3>
              <p className="text-muted-foreground">
                Built by students, for students navigating their career journey
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
