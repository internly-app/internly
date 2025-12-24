import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  checkRateLimit,
  getClientIdentifier,
  getIpAddress,
  RATE_LIMITS,
} from "@/lib/security/rate-limit";
import { z } from "zod";

// ATS utilities
import { extractResumeText } from "@/lib/ats/extract-resume-text";
import { normalizeResume } from "@/lib/ats/normalize-resume";
import { parseJobDescription } from "@/lib/ats/parse-job-description";
import { compareSkills } from "@/lib/ats/compare-skills";
import { matchResponsibilities } from "@/lib/ats/match-responsibilities";
import { calculateATSScore } from "@/lib/ats/calculate-score";
import { atsLogger, createTimer } from "@/lib/ats/logger";
import type { ATSAnalysisResponse } from "@/lib/ats/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// File size limits
const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_RESUME_SIZE_DISPLAY = "5MB";
const MIN_RESUME_SIZE_BYTES = 1024; // 1KB - anything smaller is likely invalid

// JD limits
const MIN_JD_LENGTH = 50;
const MAX_JD_LENGTH = 50_000;

// Allowed file types
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

const FILE_TYPE_NAMES: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "DOCX",
};

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

const analyzeRequestSchema = z.object({
  jobDescription: z
    .string()
    .min(
      MIN_JD_LENGTH,
      `Job description must be at least ${MIN_JD_LENGTH} characters.`
    )
    .max(
      MAX_JD_LENGTH,
      `Job description must be at most ${MAX_JD_LENGTH.toLocaleString()} characters.`
    ),
});

// ---------------------------------------------------------------------------
// Rate limit check helper
// ---------------------------------------------------------------------------

interface RateLimitCheckResult {
  allowed: boolean;
  limitType?: string;
  retryAfter?: number;
}

function checkAllRateLimits(identifier: string): RateLimitCheckResult {
  // Check burst limit first (most restrictive short-term)
  const burstCheck = checkRateLimit(
    `${identifier}:ats:burst`,
    RATE_LIMITS.ATS_ANALYZE_BURST
  );
  if (!burstCheck.allowed) {
    return {
      allowed: false,
      limitType: "burst",
      retryAfter: Math.ceil((burstCheck.resetTime - Date.now()) / 1000),
    };
  }

  // Check hourly limit
  const hourlyCheck = checkRateLimit(
    `${identifier}:ats:hourly`,
    RATE_LIMITS.ATS_ANALYZE_HOURLY
  );
  if (!hourlyCheck.allowed) {
    return {
      allowed: false,
      limitType: "hourly",
      retryAfter: Math.ceil((hourlyCheck.resetTime - Date.now()) / 1000),
    };
  }

  // Check daily limit
  const dailyCheck = checkRateLimit(
    `${identifier}:ats:daily`,
    RATE_LIMITS.ATS_ANALYZE_DAILY
  );
  if (!dailyCheck.allowed) {
    return {
      allowed: false,
      limitType: "daily",
      retryAfter: Math.ceil((dailyCheck.resetTime - Date.now()) / 1000),
    };
  }

  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Error response helper
// ---------------------------------------------------------------------------

function errorResponse(
  message: string,
  status: number,
  headers?: Record<string, string>
): NextResponse<{ error: string }> {
  return NextResponse.json({ error: message }, { status, headers });
}

// ---------------------------------------------------------------------------
// POST /api/ats/analyze
// Full ATS analysis: resume + job description
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest
): Promise<NextResponse<{ data: ATSAnalysisResponse } | { error: string }>> {
  const timer = createTimer();
  const ipAddress = getIpAddress(request);
  let userId: string | undefined;
  let fileSize: number | undefined;
  let fileType: string | undefined;
  let jdLength: number | undefined;

  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      atsLogger.validationFailure({ ipAddress }, "unauthorized");
      return errorResponse("Please sign in to use ATS analysis.", 401);
    }

    userId = user.id;
    const identifier = getClientIdentifier(userId, ipAddress);
    const logContext = { userId, ipAddress };

    // ---------------------------------------------------------------------------
    // Rate limiting (tiered: burst, hourly, daily)
    // ---------------------------------------------------------------------------
    const rateLimitResult = checkAllRateLimits(identifier);

    if (!rateLimitResult.allowed) {
      atsLogger.rateLimitHit(logContext, rateLimitResult.limitType!);

      const friendlyMessages: Record<string, string> = {
        burst:
          "You're analyzing too quickly. Please wait a minute before trying again.",
        hourly:
          "You've reached the hourly limit (20 analyses). Please try again later.",
        daily:
          "You've reached the daily limit (50 analyses). Please try again tomorrow.",
      };

      return errorResponse(
        friendlyMessages[rateLimitResult.limitType!] || "Rate limit exceeded.",
        429,
        { "Retry-After": rateLimitResult.retryAfter!.toString() }
      );
    }

    // ---------------------------------------------------------------------------
    // Parse multipart form data
    // ---------------------------------------------------------------------------
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      atsLogger.validationFailure(logContext, "invalid_form_data");
      return errorResponse(
        "Invalid request format. Please try uploading your resume again.",
        400
      );
    }

    // ---------------------------------------------------------------------------
    // Validate resume file
    // ---------------------------------------------------------------------------
    const resumeFile = formData.get("resume");
    if (!resumeFile || !(resumeFile instanceof File)) {
      atsLogger.validationFailure(logContext, "missing_resume");
      return errorResponse("Please upload a resume file (PDF or DOCX).", 400);
    }

    fileSize = resumeFile.size;
    fileType = resumeFile.type;

    // Check file size limits
    if (fileSize < MIN_RESUME_SIZE_BYTES) {
      atsLogger.validationFailure(
        { ...logContext, fileSize, fileType },
        "file_too_small"
      );
      return errorResponse(
        "The uploaded file appears to be empty or corrupted. Please upload a valid resume.",
        400
      );
    }

    if (fileSize > MAX_RESUME_SIZE_BYTES) {
      atsLogger.validationFailure(
        { ...logContext, fileSize, fileType },
        "file_too_large"
      );
      return errorResponse(
        `Resume file is too large (${(fileSize / 1024 / 1024).toFixed(
          1
        )}MB). Maximum size is ${MAX_RESUME_SIZE_DISPLAY}.`,
        400
      );
    }

    // Check file type
    if (
      !ALLOWED_FILE_TYPES.includes(
        fileType as (typeof ALLOWED_FILE_TYPES)[number]
      )
    ) {
      atsLogger.validationFailure(
        { ...logContext, fileSize, fileType },
        "invalid_file_type"
      );
      return errorResponse(
        `Unsupported file type. Please upload a PDF or DOCX file. (Received: ${
          fileType || "unknown"
        })`,
        400
      );
    }

    // ---------------------------------------------------------------------------
    // Validate job description
    // ---------------------------------------------------------------------------
    const jobDescriptionRaw = formData.get("jobDescription");
    if (!jobDescriptionRaw || typeof jobDescriptionRaw !== "string") {
      atsLogger.validationFailure(logContext, "missing_jd");
      return errorResponse("Please paste a job description.", 400);
    }

    jdLength = jobDescriptionRaw.length;

    const jdValidation = analyzeRequestSchema.safeParse({
      jobDescription: jobDescriptionRaw,
    });

    if (!jdValidation.success) {
      const firstError = jdValidation.error.issues[0];
      atsLogger.validationFailure(
        { ...logContext, jdLength },
        `invalid_jd:${firstError?.code}`
      );
      return errorResponse(
        firstError?.message ?? "Invalid job description.",
        400
      );
    }

    const { jobDescription } = jdValidation.data;

    // ---------------------------------------------------------------------------
    // Log analysis start
    // ---------------------------------------------------------------------------
    atsLogger.analysisStart({
      userId,
      ipAddress,
      fileSize,
      fileType: FILE_TYPE_NAMES[fileType] || fileType,
      jdLength,
    });

    // ---------------------------------------------------------------------------
    // Step 1: Extract text from resume
    // ---------------------------------------------------------------------------
    const resumeArrayBuffer = await resumeFile.arrayBuffer();
    const resumeBuffer = Buffer.from(resumeArrayBuffer);

    const extractionResult = await extractResumeText(resumeBuffer, {
      mimeType: resumeFile.type,
    });

    if (!extractionResult.success) {
      atsLogger.analysisFailure(
        { ...logContext, fileSize, fileType, step: "extract_text" },
        {
          message: extractionResult.error.message,
          code: extractionResult.error.code,
        }
      );

      // User-friendly error messages for extraction failures
      const extractionErrors: Record<string, string> = {
        UNSUPPORTED_FILE_TYPE:
          "This file type is not supported. Please upload a PDF or DOCX file.",
        CORRUPT_FILE:
          "The file appears to be corrupted or password-protected. Please try a different file.",
        EMPTY_FILE:
          "No text could be extracted from this file. Please ensure it's not a scanned image.",
        EXTRACTION_FAILED:
          "Failed to read the resume. Please try a different file format.",
      };

      return errorResponse(
        extractionErrors[extractionResult.error.code] ||
          extractionResult.error.message,
        400
      );
    }

    // ---------------------------------------------------------------------------
    // Step 2: Parse JD and normalize resume in parallel
    // ---------------------------------------------------------------------------
    const [parsedJDResult, normalizedResumeResult] = await Promise.all([
      parseJobDescription(jobDescription).catch((err) => {
        return {
          error: err instanceof Error ? err.message : "JD parsing failed",
        };
      }),
      normalizeResume(extractionResult.data.text).catch((err) => {
        return {
          success: false as const,
          error: {
            code: "LLM_ERROR" as const,
            message:
              err instanceof Error ? err.message : "Resume parsing failed",
          },
        };
      }),
    ]);

    // Check for JD parsing errors
    if ("error" in parsedJDResult) {
      atsLogger.analysisFailure(
        { ...logContext, fileSize, fileType, jdLength, step: "parse_jd" },
        { message: parsedJDResult.error }
      );

      // Check for quota/billing errors
      if (
        parsedJDResult.error.includes("quota") ||
        parsedJDResult.error.includes("billing") ||
        parsedJDResult.error.includes("429")
      ) {
        return errorResponse(
          "The AI service is temporarily unavailable. Please try again later.",
          503
        );
      }

      return errorResponse(
        "Failed to analyze the job description. Please check the format and try again.",
        500
      );
    }

    // Check for resume normalization errors
    if (!normalizedResumeResult.success) {
      atsLogger.analysisFailure(
        {
          ...logContext,
          fileSize,
          fileType,
          jdLength,
          step: "normalize_resume",
        },
        {
          message: normalizedResumeResult.error.message,
          code: normalizedResumeResult.error.code,
        }
      );
      return errorResponse(
        "Failed to analyze the resume content. Please try a different file.",
        500
      );
    }

    const parsedJD = parsedJDResult;
    const normalizedResume = normalizedResumeResult.data;

    // ---------------------------------------------------------------------------
    // Step 3: Compare skills (deterministic, no AI)
    // ---------------------------------------------------------------------------
    const skillComparison = compareSkills(parsedJD, normalizedResume);

    // ---------------------------------------------------------------------------
    // Step 4: Match responsibilities (lightweight AI)
    // ---------------------------------------------------------------------------
    const responsibilityResult = await matchResponsibilities(
      parsedJD,
      normalizedResume
    );

    if (!responsibilityResult.success) {
      atsLogger.analysisFailure(
        {
          ...logContext,
          fileSize,
          fileType,
          jdLength,
          step: "match_responsibilities",
        },
        {
          message: responsibilityResult.error.message,
          code: responsibilityResult.error.code,
        }
      );
      return errorResponse(
        "Failed to match responsibilities. Please try again.",
        500
      );
    }

    const responsibilityMatching = responsibilityResult.data;

    // ---------------------------------------------------------------------------
    // Step 5: Calculate ATS score (deterministic)
    // ---------------------------------------------------------------------------
    const score = calculateATSScore({
      skillComparison,
      responsibilityMatching,
      jobDescription: parsedJD,
      resume: normalizedResume,
    });

    // ---------------------------------------------------------------------------
    // Build response
    // ---------------------------------------------------------------------------
    const response: ATSAnalysisResponse = {
      score,
      details: {
        skillComparison: {
          matchedRequired: skillComparison.matched.required.map(
            (m) => m.jdSkill
          ),
          matchedPreferred: skillComparison.matched.preferred.map(
            (m) => m.jdSkill
          ),
          missingRequired: skillComparison.missing,
          missingPreferred: skillComparison.missingPreferred,
          extraSkills: skillComparison.extra,
        },
        responsibilityCoverage: {
          covered: responsibilityMatching.coveredResponsibilities.map((r) => ({
            responsibility: r.responsibility,
            explanation: r.explanation,
          })),
          weaklyCovered: responsibilityMatching.weaklyCovered.map((r) => ({
            responsibility: r.responsibility,
            explanation: r.explanation,
          })),
          notCovered: responsibilityMatching.notCovered.map((r) => ({
            responsibility: r.responsibility,
            explanation: r.explanation,
          })),
        },
        parsedResume: {
          name: normalizedResume.contactInfo.name,
          skillCount:
            normalizedResume.skills.technical.length +
            normalizedResume.skills.soft.length +
            normalizedResume.skills.other.length,
          experienceCount: normalizedResume.experience.length,
          educationCount: normalizedResume.education.length,
        },
        parsedJD: {
          requiredSkillCount: parsedJD.requiredSkills.length,
          preferredSkillCount: parsedJD.preferredSkills.length,
          responsibilityCount: parsedJD.responsibilities.length,
        },
      },
    };

    // ---------------------------------------------------------------------------
    // Log success
    // ---------------------------------------------------------------------------
    atsLogger.analysisSuccess({
      userId,
      ipAddress,
      fileSize,
      fileType: FILE_TYPE_NAMES[fileType] || fileType,
      jdLength,
      duration: timer.elapsed(),
      score: score.overallScore,
      grade: score.grade,
    });

    return NextResponse.json({ data: response }, { status: 200 });
  } catch (error: unknown) {
    // Log the full error for debugging
    console.error("[API /api/ats/analyze] Unhandled error:", error);

    // Log unexpected errors
    atsLogger.analysisFailure(
      { userId, ipAddress, fileSize, fileType, jdLength, step: "unexpected" },
      error instanceof Error ? error : { message: String(error) }
    );

    // Don't expose internal error details to client
    return errorResponse(
      "An unexpected error occurred. Please try again later.",
      500
    );
  }
}
