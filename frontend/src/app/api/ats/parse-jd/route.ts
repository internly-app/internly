import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  parseJobDescription,
  ParsedJobDescription,
} from "@/lib/ats/parse-job-description";
import {
  checkRateLimit,
  getClientIdentifier,
  getIpAddress,
} from "@/lib/security/rate-limit";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Input validation schema
// ---------------------------------------------------------------------------

const parseJdRequestSchema = z.object({
  jobDescription: z
    .string()
    .min(50, "Job description must be at least 50 characters.")
    .max(50_000, "Job description must be at most 50,000 characters."),
});

// ---------------------------------------------------------------------------
// POST /api/ats/parse-jd
// Parse a job description using OpenAI (authenticated, rate-limited)
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest
): Promise<NextResponse<{ data: ParsedJobDescription } | { error: string }>> {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting - reuse existing rate limit config or use a custom one
    const ipAddress = getIpAddress(request);
    const identifier = getClientIdentifier(user.id, ipAddress);

    // Use a moderate rate limit for AI calls (10 per minute)
    const rateLimit = checkRateLimit(identifier, {
      maxRequests: 10,
      windowMs: 60_000, // 1 minute
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(
              (rateLimit.resetTime - Date.now()) / 1000
            ).toString(),
          },
        }
      );
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body." },
        { status: 400 }
      );
    }

    const validationResult = parseJdRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message ?? "Invalid input." },
        { status: 400 }
      );
    }

    const { jobDescription } = validationResult.data;

    // Call the parsing function (server-side only)
    // The function reads OPENAI_API_KEY from process.env automatically
    const parsed = await parseJobDescription(jobDescription);

    return NextResponse.json({ data: parsed }, { status: 200 });
  } catch (error: unknown) {
    // Log the full error server-side for debugging
    console.error("[API /api/ats/parse-jd] Error:", error);

    // Determine user-safe error message
    let userMessage = "An error occurred while parsing the job description.";
    let statusCode = 500;

    if (error instanceof Error) {
      const msg = error.message.toLowerCase();

      // Input validation errors (safe to expose)
      if (msg.includes("cannot be empty") || msg.includes("too long")) {
        userMessage = error.message;
        statusCode = 400;
      }
      // OpenAI rate limit errors
      else if (
        msg.includes("rate limit") ||
        msg.includes("rate_limit") ||
        msg.includes("429")
      ) {
        userMessage =
          "AI service is temporarily busy. Please try again in a moment.";
        statusCode = 503;
      }
      // OpenAI quota/billing errors
      else if (
        msg.includes("quota") ||
        msg.includes("billing") ||
        msg.includes("insufficient")
      ) {
        userMessage =
          "AI service is temporarily unavailable. Please try again later.";
        statusCode = 503;
      }
      // API key issues (don't expose details)
      else if (
        msg.includes("api key") ||
        msg.includes("authentication") ||
        msg.includes("401")
      ) {
        userMessage = "AI service configuration error. Please contact support.";
        statusCode = 503;
      }
      // Schema validation failures (should be rare with strict mode)
      else if (msg.includes("schema validation")) {
        userMessage =
          "Failed to parse job description. Please try with a different format.";
        statusCode = 422;
      }
    }

    return NextResponse.json({ error: userMessage }, { status: statusCode });
  }
}
