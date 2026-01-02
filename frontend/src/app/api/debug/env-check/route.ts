/**
 * Debug endpoint to check environment variable availability.
 * IMPORTANT: Remove this endpoint after debugging!
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Check various env vars (without exposing values)
  const envCheck = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    
    // OpenAI key check
    openai: {
      exists: !!process.env.OPENAI_API_KEY,
      length: process.env.OPENAI_API_KEY?.length ?? 0,
      prefix: process.env.OPENAI_API_KEY?.slice(0, 7) ?? "not-set",
      suffix: process.env.OPENAI_API_KEY?.slice(-4) ?? "not-set",
      hasWhitespace: process.env.OPENAI_API_KEY !== process.env.OPENAI_API_KEY?.trim(),
      startsWithSk: process.env.OPENAI_API_KEY?.startsWith("sk-") ?? false,
    },
    
    // Other env vars for comparison
    supabase: {
      urlExists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKeyExists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceRoleExists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    
    // Check if NEXT_PUBLIC vars work
    publicSiteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "not-set",
    
    // List all env var names (not values) that contain "OPENAI" or "API"
    envVarNames: Object.keys(process.env).filter(
      (key) => key.includes("OPENAI") || key.includes("API_KEY")
    ),
  };

  return NextResponse.json(envCheck, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
