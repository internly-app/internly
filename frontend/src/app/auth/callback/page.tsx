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
      <div>
        <h1>Authentication Error</h1>
        <p>{error}</p>
        <button onClick={() => router.push("/")}>Back to Home</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Signing you in...</h1>
      <p>Please wait a moment</p>
    </div>
  );
}
