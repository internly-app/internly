import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectPath = requestUrl.searchParams.get("redirect") ?? "/";
  const redirectUrl = new URL(redirectPath, requestUrl.origin);

  if (!code) {
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  } catch (error) {
    console.error("Supabase auth callback error", error);
    redirectUrl.searchParams.set("auth", "error");
  }

  return NextResponse.redirect(redirectUrl);
}
