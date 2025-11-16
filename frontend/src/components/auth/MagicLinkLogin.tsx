"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/supabaseClient";

interface MagicLinkLoginProps {
  redirectTo?: string;
}

export function MagicLinkLogin({ redirectTo = "/" }: MagicLinkLoginProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("sending");
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const origin =
        typeof window !== "undefined" ? window.location.origin : undefined;

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: origin
            ? `${origin}/auth/callback?redirect=${encodeURIComponent(
                redirectTo
              )}`
            : undefined,
        },
      });

      if (signInError) {
        throw new Error(signInError.message);
      }

      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error ? err.message : "Failed to send magic link"
      );
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            className="block text-sm font-medium text-gray-200 mb-2"
            htmlFor="login-email"
          >
            Enter your email to get a magic link
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-gray-950 text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="you@example.com"
          />
        </div>

        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full py-3 px-4 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-400 transition-colors disabled:opacity-50"
        >
          {status === "sending" ? "Sending magic link..." : "Send magic link"}
        </button>
      </form>

      {status === "sent" && (
        <p className="mt-4 text-sm text-green-300">
          Magic link sent! Check your inbox and open the link on this device to
          continue.
        </p>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
