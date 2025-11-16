"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = getSupabaseBrowserClient();

        // Check for error from OAuth provider
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

          // User-friendly error messages
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
        } // For OAuth, Supabase handles the code exchange automatically via URL hash
        // We just need to check if there's a session now
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
          // No session yet, might still be processing. Give it a moment.
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

        // Check for redirect cookie or query param
        const getCookie = (name: string) => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop()?.split(";").shift();
          return null;
        };

        const cookieRedirect = getCookie("post_auth_redirect");
        let redirectPath =
          searchParams.get("redirect") ?? cookieRedirect ?? "/reviews/new";

        // Decode if it's URL-encoded
        try {
          redirectPath = decodeURIComponent(redirectPath);
        } catch {
          console.warn("Could not decode redirect path:", redirectPath);
        }

        // Ensure it starts with / and doesn't have double slashes
        if (!redirectPath.startsWith("/")) {
          redirectPath = "/" + redirectPath;
        }
        redirectPath = redirectPath.replace(/\/+/g, "/");

        // Clear the redirect cookie
        if (cookieRedirect) {
          document.cookie = "post_auth_redirect=; path=/; max-age=0";
        }

        console.log("Redirecting to:", redirectPath);

        // Small delay to ensure session is fully propagated to UI
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Redirect to the target page
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-950 via-gray-900 to-black">
        <div className="max-w-md rounded-xl border border-red-800 bg-red-900/30 p-6 text-center">
          <h1 className="mb-2 text-xl font-bold text-red-300">
            Authentication Error
          </h1>
          <p className="mb-4 text-sm text-red-400">{error}</p>
          <button
            onClick={() => router.push("/reviews/new")}
            className="rounded-lg bg-red-500 px-4 py-2 font-semibold text-white transition hover:bg-red-400"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-950 via-gray-900 to-black">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-400"></div>
        <h1 className="mb-2 text-xl font-semibold text-white">
          Signing you in...
        </h1>
        <p className="text-sm text-gray-400">Please wait a moment</p>
      </div>
    </div>
  );
}
