"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ATSAnalyzer from "@/components/ATSAnalyzer";
import { useAuth } from "@/components/AuthProvider";

export default function ATSPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin?redirect=/ats");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <main className="flex-1 pt-24 pb-16 px-4 sm:px-6 lg:px-8 w-full max-w-5xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="space-y-4 text-center">
              <div className="h-12 w-64 bg-muted rounded-lg mx-auto" />
              <div className="h-6 w-96 bg-muted rounded-lg mx-auto" />
            </div>
            <div className="h-96 bg-muted rounded-xl" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-8 sm:pb-12 w-full">
        <div className="space-y-8">
          <div className="mb-8 sm:mb-12 max-w-5xl mx-auto text-center">
            <h1 className="text-heading-1 mb-4 text-foreground">
              Resume ATS Analyzer
            </h1>
            <p className="text-lg text-muted-foreground">
              Get instant feedback on your resume&apos;s ATS compatibility,
              keywords, and formatting.
            </p>
          </div>

          <ATSAnalyzer />
        </div>
      </main>

      <Footer />
    </div>
  );
}
