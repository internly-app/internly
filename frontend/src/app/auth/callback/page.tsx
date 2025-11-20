"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AuthCallbackPage() {
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

          let userMessage = errorDescription || errorParam;
          if (
            errorParam === "server_error" &&
            errorDescription?.includes("Unable to exchange external code")
          ) {
            userMessage =
              "Google authentication failed. Please check that your Google OAuth credentials are correctly configured in Supabase.";
          }

          setError(userMessage);
          return;
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError);
          setError(sessionError.message);
          return;
        }

        if (!session) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          const {
            data: { session: retrySession },
            error: retryError,
          } = await supabase.auth.getSession();

          if (retryError || !retrySession) {
            setError("Failed to establish session. Please try again.");
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
        setError(err instanceof Error ? err.message : "Authentication failed");
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
              Authentication Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{error}</p>
            </div>
            <Button
              onClick={() => router.push("/")}
              className="w-full bg-[#7748F6] text-white hover:bg-[#6636E5]"
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
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <div className="w-12 h-12 border-4 border-[#7748F6] border-t-transparent rounded-full animate-spin" />
        </CardContent>
      </Card>
    </div>
  );
}
