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
import { getOAuthErrorMessage, getSessionErrorMessage } from "@/lib/auth-errors";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = createClient();

        const errorParam = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");
        const errorCode = searchParams.get("error_code");

        if (errorParam) {
          const fullError = {
            error: errorParam,
            description: errorDescription,
            code: errorCode,
            url: window.location.href,
            timestamp: new Date().toISOString(),
          };
          console.error("OAuth error details:", fullError);

          // Convert technical OAuth errors to user-friendly messages
          const rawError = errorDescription || errorParam;
          setError(getOAuthErrorMessage(rawError));
          return;
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError);
          setError(getSessionErrorMessage(sessionError.message));
          return;
        }

        if (!session) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          const {
            data: { session: retrySession },
            error: retryError,
          } = await supabase.auth.getSession();

          if (retryError || !retrySession) {
            setError("We couldn't complete your sign-in. Please try again.");
            return;
          }
        }

        const getCookie = (name: string) => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop()?.split(";").shift();
          return null;
        };

        const cookieRedirect = getCookie("post_auth_redirect");
        let redirectPath =
          searchParams.get("redirect") ?? cookieRedirect ?? "/";

        try {
          redirectPath = decodeURIComponent(redirectPath);
        } catch {
          console.warn("Could not decode redirect path:", redirectPath);
        }

        if (!redirectPath.startsWith("/")) {
          redirectPath = "/" + redirectPath;
        }
        redirectPath = redirectPath.replace(/\/+/g, "/");

        if (cookieRedirect) {
          document.cookie = "post_auth_redirect=; path=/; max-age=0";
        }

        console.log("Redirecting to:", redirectPath);

        await new Promise((resolve) => setTimeout(resolve, 100));

        router.push(redirectPath);
        router.refresh();
      } catch (err) {
        console.error("Callback error:", err);
        setError(getSessionErrorMessage(err instanceof Error ? err.message : "Authentication failed"));
      }
    };

    handleCallback();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-destructive">
              Oops! Something went wrong
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="w-full"
            >
              Try Again
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Signing you in...</CardTitle>
          <CardDescription>
            Please wait while we complete your authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthCallbackPage() {
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
      <AuthCallbackContent />
    </Suspense>
  );
}
