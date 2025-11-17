"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { AuthPanel } from "@/components/auth/AuthPanel";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const redirectParam = searchParams.get("redirect");

  // Set the modal flag immediately if redirect=review (even before auth check)
  useEffect(() => {
    if (redirectParam === "review") {
      localStorage.setItem("openReviewModal", "true");
    }
  }, [redirectParam]);

  useEffect(() => {
    // If user is authenticated, redirect to home
    if (!loading && user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Only show auth panel if user is not authenticated
  if (user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-gray-100">
      <header className="bg-gray-900/80 border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-blue-300 hover:text-blue-200 text-sm transition-colors"
          >
            ← Back to reviews
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-gray-900/70 rounded-xl border border-gray-800 p-6 sm:p-8 text-center space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {redirectParam === "review"
                ? "Sign in to write a review"
                : "Sign in to Internly"}
            </h1>
            <p className="text-gray-400">
              {redirectParam === "review"
                ? "Reviews are tied to your account so employers can trust the source"
                : "Access your account to like reviews and manage your profile"}
            </p>
          </div>
          <AuthPanel redirectTo="/" />
        </div>
      </main>
    </div>
  );
}
