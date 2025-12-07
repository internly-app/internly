/**
 * Supabase Middleware Helper
 *
 * This refreshes auth sessions automatically on every request.
 * Import this in your middleware.ts file.
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Skip auth check for public static pages (optimization for cold start)
  const publicPaths = ['/', '/about'];
  const isPublicStaticPage = publicPaths.includes(request.nextUrl.pathname);

  // Also skip if no auth cookies exist (user not logged in)
  const hasAuthCookie = request.cookies.has('sb-access-token') ||
                        request.cookies.has('sb-refresh-token');

  // Only do auth refresh if:
  // 1. User has auth cookies (potentially logged in), OR
  // 2. Not a public static page
  if (!isPublicStaticPage || hasAuthCookie) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value,
              ...options,
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value: "",
              ...options,
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({
              name,
              value: "",
              ...options,
            });
          },
        },
      }
    );

    // Refresh session if needed
    await supabase.auth.getUser();
  }

  return response;
}
