/**
 * Supabase Client for Client-Side Usage
 *
 * Use this in Client Components (components with "use client" directive).
 * This handles browser-side interactions with Supabase.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
