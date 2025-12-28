"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function AuthConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const handleConfirmation = async () => {
      try {
        const token = searchParams.get("token");
        const type = searchParams.get("type");
        const redirectTo = searchParams.get("redirect_to") || "/";

        if (!token) {
          setErrorMessage("Invalid verification link. Please request a new one.");
          setStatus("error");
          return;
        }

        const supabase = createClient();

        // Verify the token using Supabase's verifyOtp method
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: (type as "signup" | "email" | "recovery" | "invite") || "signup",
        });

        if (error) {
          console.error("Verification error:", error);

          // User-friendly error messages
          if (error.message.toLowerCase().includes("expired")) {
            setErrorMessage("This verification link has expired. Please sign up again to receive a new link.");
          } else if (error.message.toLowerCase().includes("invalid") || error.message.toLowerCase().includes("not found")) {
            setErrorMessage("This verification link is invalid or has already been used. Please try signing in.");
          } else {
            setErrorMessage("We couldn't verify your email. Please try again or request a new verification link.");
          }
          setStatus("error");
          return;
        }

        // Success - show success state briefly then redirect
        setStatus("success");

        // Small delay to show success message
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Redirect to the specified path or home
        let finalRedirect = "/";
        try {
          const decoded = decodeURIComponent(redirectTo);
          // Handle full URLs by extracting just the pathname
          if (decoded.startsWith("http://") || decoded.startsWith("https://")) {
            const url = new URL(decoded);
            finalRedirect = url.pathname || "/";
          } else if (decoded.startsWith("/")) {
            finalRedirect = decoded;
          } else {
            finalRedirect = "/" + decoded;
          }
        } catch {
          finalRedirect = "/";
        }

        router.push(finalRedirect);
        router.refresh();
      } catch (err) {
        console.error("Confirmation error:", err);
        setErrorMessage("Something went wrong. Please try again.");
        setStatus("error");
      }
    };

    handleConfirmation();
  }, [router, searchParams]);

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-destructive"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <CardTitle className="text-2xl">Verification Failed</CardTitle>
            <CardDescription className="text-base mt-2">
              {errorMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => router.push("/signin")}
              className="w-full"
            >
              Go to Sign In
            </Button>
            <Button
              onClick={() => router.push("/")}
              variant="ghost"
              className="w-full"
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <CardTitle className="text-2xl text-green-500">Email Verified!</CardTitle>
            <CardDescription className="text-base mt-2">
              Your account is ready. Redirecting you now...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-4">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verifying state
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Verifying your email...</CardTitle>
          <CardDescription>
            Please wait while we confirm your account
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Loading...</CardTitle>
              <CardDescription>
                Please wait while we process your request
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-6">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </CardContent>
          </Card>
        </div>
      }
    >
      <AuthConfirmContent />
    </Suspense>
  );
}
