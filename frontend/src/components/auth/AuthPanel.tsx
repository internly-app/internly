"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/supabaseClient";

interface AuthPanelProps {
  redirectTo?: string;
}

type AuthMode = "sign-in" | "sign-up";

export function AuthPanel({ redirectTo = "/" }: AuthPanelProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formStatus, setFormStatus] = useState<"idle" | "loading">("idle");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getCallbackUrl = () => {
    if (typeof window === "undefined") return undefined;
    const origin = window.location.origin;
    return `${origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`;
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getCallbackUrl(),
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }
    } catch (err) {
      console.error("Google OAuth error", err);
      setError(
        err instanceof Error ? err.message : "Failed to start Google sign in"
      );
      setGoogleLoading(false);
    }
  };

  const handleEmailAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormStatus("loading");
    setError(null);
    setMessage(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setFormStatus("idle");
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();

      if (mode === "sign-in") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw new Error(signInError.message);
        }

        setMessage("Signed in successfully");

        if (typeof window !== "undefined" && redirectTo) {
          const currentPath = window.location.pathname;
          if (currentPath !== redirectTo) {
            router.push(redirectTo);
          } else {
            router.refresh();
          }
        } else {
          router.refresh();
        }
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getCallbackUrl(),
          },
        });

        if (signUpError) {
          throw new Error(signUpError.message);
        }

        setMessage(
          "Account created! Check your inbox to confirm your email, then sign in."
        );
        setMode("sign-in");
      }
    } catch (err) {
      console.error("Email auth error", err);
      setError(
        err instanceof Error ? err.message : "Unable to authenticate with email"
      );
    } finally {
      setFormStatus("idle");
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 text-left">
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 rounded-lg border border-gray-700 bg-gray-900/60 px-4 py-3 text-sm font-semibold text-white hover:border-gray-500 transition disabled:opacity-50"
        >
          {googleLoading ? "Redirecting to Google..." : "Continue with Google"}
        </button>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
          <span className="h-px flex-1 bg-gray-800" aria-hidden="true" />
          <span>or use email</span>
          <span className="h-px flex-1 bg-gray-800" aria-hidden="true" />
        </div>
      </div>

      <form onSubmit={handleEmailAuth} className="space-y-4">
        <div>
          <label
            htmlFor="auth-email"
            className="mb-2 block text-sm font-medium text-gray-200"
          >
            Email address
          </label>
          <input
            id="auth-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-gray-100 placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="auth-password"
            className="mb-2 block text-sm font-medium text-gray-200"
          >
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-gray-100 placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={
              mode === "sign-up" ? "Create a password" : "Enter your password"
            }
          />
          {mode === "sign-up" && (
            <p className="mt-2 text-xs text-gray-400">
              You&apos;ll get a confirmation email before your account is
              active.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={formStatus === "loading"}
          className="w-full rounded-lg bg-blue-500 px-4 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:opacity-50"
        >
          {formStatus === "loading"
            ? "Working..."
            : mode === "sign-in"
            ? "Sign in with email"
            : "Create account"}
        </button>
      </form>

      {(message || error) && (
        <div className="rounded-lg border border-gray-800 bg-gray-900/70 px-4 py-3 text-sm">
          {message && <p className="text-green-300">{message}</p>}
          {error && <p className="text-red-300">{error}</p>}
        </div>
      )}

      <p className="text-center text-sm text-gray-400">
        {mode === "sign-in" ? "Need an account?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
          className="font-semibold text-blue-300 hover:text-blue-200"
        >
          {mode === "sign-in" ? "Sign up with email" : "Sign in"}
        </button>
      </p>
    </div>
  );
}
