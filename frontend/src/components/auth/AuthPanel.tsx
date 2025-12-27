"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { sanitizeText } from "@/lib/security/content-filter";
import { buildSiteUrl } from "@/lib/site-url";

interface AuthPanelProps {
  redirectTo?: string;
  onSuccess?: () => void;
  onModeChange?: (mode: AuthMode) => void;
}

type AuthMode = "sign-in" | "sign-up";
type FormStatus = "idle" | "loading";

export function AuthPanel({
  redirectTo = "/",
  onSuccess,
  onModeChange,
}: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = createClient();

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    setMessage(null);

    try {
      // Store redirect path in cookie for post-auth navigation
      if (typeof document !== "undefined") {
        document.cookie = `post_auth_redirect=${encodeURIComponent(
          redirectTo
        )}; path=/; max-age=600`;
      }

      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: buildSiteUrl("/auth/callback"),
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      // OAuth will redirect, so we don't need to do anything else
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

    if (mode === "sign-up") {
      if (!firstName.trim()) {
        setError("First name is required");
        setFormStatus("idle");
        return;
      }

      const sanitizedFirstName = sanitizeText(firstName.trim());
      if (sanitizedFirstName !== firstName.trim()) {
        setError("First name contains inappropriate content");
        setFormStatus("idle");
        return;
      }
    }

    try {
      if (mode === "sign-in") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw new Error(signInError.message);
        }

        setMessage("Signed in successfully!");

        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        } else {
          // Redirect to specified path
          window.location.href = redirectTo;
        }
      } else {
        // Sign up mode
        const sanitizedFirstName = sanitizeText(firstName.trim());

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: sanitizedFirstName,
            },
            emailRedirectTo: buildSiteUrl("/auth/callback"),
          },
        });

        if (signUpError) {
          throw new Error(signUpError.message);
        }

        // If no session was created, email confirmation is required
        if (!data.session) {
          setMessage("Check your email for a confirmation link to complete your signup.");
          setFormStatus("idle");
          return;
        }

        // Session exists - user is signed in (email confirmation disabled)
        setMessage("Account created! You're all set to continue.");

        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        } else {
          // Redirect to specified path
          window.location.href = redirectTo;
        }
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
    <div className="space-y-6">
      {/* Google OAuth Button */}
      <Button
        onClick={handleGoogleSignIn}
        disabled={googleLoading || formStatus === "loading"}
        variant="outline"
        className="w-full h-11 text-base transition-colors duration-200 disabled:opacity-50"
      >
        {googleLoading ? (
          "Redirecting to Google..."
        ) : (
          <>
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </>
        )}
      </Button>

      <div className="relative">
        <Separator />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="bg-card px-2 text-sm text-muted-foreground">Or</span>
        </div>
      </div>

      {/* Email/Password Form */}
      <form onSubmit={handleEmailAuth} className="space-y-4">
        {mode === "sign-up" && (
          <div className="space-y-2">
            <label htmlFor="firstName" className="text-sm font-medium">
              First name
            </label>
            <Input
              id="firstName"
              type="text"
              placeholder="John"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              disabled={formStatus === "loading" || googleLoading}
              autoComplete="given-name"
            />
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email address
          </label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={formStatus === "loading" || googleLoading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={formStatus === "loading" || googleLoading}
            minLength={6}
          />
          <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
        </div>

        {error && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {message && (
          <div className="p-3 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-700 dark:text-green-300">
              {message}
            </p>
          </div>
        )}

        <Button
          type="submit"
          disabled={formStatus === "loading" || googleLoading}
          className="w-full"
        >
          {formStatus === "loading"
            ? mode === "sign-in"
              ? "Signing in..."
              : "Creating account..."
            : mode === "sign-in"
            ? "Sign in"
            : "Create account"}
        </Button>
      </form>

      {/* Toggle Mode */}
      <div className="text-center text-sm">
        <button
          type="button"
          onClick={() => {
            const nextMode = mode === "sign-in" ? "sign-up" : "sign-in";
            setMode(nextMode);
            onModeChange?.(nextMode);
            if (nextMode === "sign-in") {
              setFirstName("");
            }
            setError(null);
            setMessage(null);
          }}
          disabled={formStatus === "loading" || googleLoading}
          className="text-primary cursor-pointer hover:underline transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
        >
          {mode === "sign-in"
            ? "Don't have an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
