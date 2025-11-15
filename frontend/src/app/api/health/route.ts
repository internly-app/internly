/**
 * Health Check API Route
 *
 * Simple endpoint to verify the Next.js API is running.
 *
 * GET /api/health
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "Internly API (Next.js)",
    environment: process.env.NODE_ENV,
  });
}
