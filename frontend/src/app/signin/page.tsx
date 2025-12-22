"use client";

import { useEffect, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { useAuth } from "@/components/AuthProvider";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const redirectParam = searchParams.get("redirect");
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      const redirectTo = redirectParam || "/";
      router.push(redirectTo);
    }
  }, [user, loading, router, redirectParam]);

  // Show loading skeleton while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="h-11 bg-muted animate-pulse rounded-md" />
              <div className="h-11 bg-muted animate-pulse rounded-md" />
              <div className="h-11 bg-muted animate-pulse rounded-md" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Don't render if user is authenticated (will redirect)
  if (user) {
    return null;
  }

  const redirectTo = redirectParam || "/";
  const isWriteReview = redirectParam === "/write-review";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      {/* Back Button */}
      <div className="w-full max-w-md mb-4">
        <Button
          variant="ghost"
          asChild
          className="hover:bg-muted transition-all duration-200 active:scale-95"
        >
          <Link href="/">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
            Back to home
          </Link>
        </Button>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {isWriteReview
              ? authMode === "sign-up"
                ? "Create an account to write a review"
                : "Sign in to write a review"
              : authMode === "sign-up"
              ? "Create your Internly account"
              : "Sign in to Internly"}
          </CardTitle>
          <CardDescription>
            {isWriteReview
              ? authMode === "sign-up"
                ? "Join Internly to share your internship experience with fellow students"
                : "Share your internship experience with fellow students"
              : authMode === "sign-up"
              ? "Sign up with Google or email to get started"
              : "Sign in with Google or email to continue"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthPanel redirectTo={redirectTo} onModeChange={setAuthMode} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="h-11 bg-muted animate-pulse rounded-md" />
                <div className="h-11 bg-muted animate-pulse rounded-md" />
                <div className="h-11 bg-muted animate-pulse rounded-md" />
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
