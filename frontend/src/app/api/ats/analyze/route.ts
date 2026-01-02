import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
import { atsLogger } from "@/lib/ats/logger";
import { buildScoreRecoveryPlan } from "@/lib/ats/score-recovery";
import { postProcessResumeFeedback } from "@/lib/ats/resume-feedback-postprocess";
import type { ATSAnalysisResponse } from "@/lib/ats/types";
import type { ParsedJobDescription } from "@/lib/ats/parse-job-description";

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

    // We'll stream stage updates to the client as newline-delimited JSON
    // (NDJSON). Each stage event is a small object like:
    // { stage: 'resume_parsing', message: 'Extracting resume text', progress: 10 }
    // Final result is sent as: { done: true, data: {...} }

    // Read the resume into a buffer once (we'll reuse it during extraction)
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
    // Step 2+: The remaining work is done inside the stream producer below.
    // We stream stage-by-stage so the client only shows progress for completed
    // backend stages (truthful progress).

    // The remainder of the work will be done inside the stream producer below.
    // Create a ReadableStream that performs each step and writes an NDJSON
    // event after each completed stage.

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const push = (obj: unknown) => {
          try {
            controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
          } catch {
            // ignore enqueue errors
          }
        };

        try {
          // Stage: resume parsing
          push({
            stage: "resume_parsing",
            message: "Reading resume content",
            progress: 8,
          });

          // extractionResult already computed above
          push({
            stage: "resume_parsed",
            message: "Resume text extracted",
            progress: 12,
          });

          // Stage: JD parsing
          push({
            stage: "jd_parsing",
            message: "Understanding job requirements",
            progress: 25,
          });
          let parsedJD: ParsedJobDescription;
          try {
            parsedJD = await parseJobDescription(jobDescription);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);

            // Log full error details for debugging
            console.error("[ATS parse_jd ERROR]", {
              error: msg,
              stack: err instanceof Error ? err.stack : undefined,
              hasApiKey: !!process.env.OPENAI_API_KEY,
              apiKeyPrefix: process.env.OPENAI_API_KEY?.slice(0, 7) || "not-set",
            });

            atsLogger.analysisFailure(
              { ...logContext, fileSize, fileType, jdLength, step: "parse_jd" },
              { message: msg }
            );

            const lowered = msg.toLowerCase();
            const isQuotaError =
              lowered.includes("quota") ||
              lowered.includes("billing") ||
              lowered.includes("429") ||
              lowered.includes("rate limit");
            const isApiKeyError =
              lowered.includes("api key") ||
              lowered.includes("authentication") ||
              lowered.includes("unauthorized");

            let userMessage: string;
            let status: number;

            if (isApiKeyError) {
              userMessage = "AI service configuration error. Please contact support.";
              status = 503;
            } else if (isQuotaError) {
              userMessage = "The AI service is temporarily unavailable. Please try again later.";
              status = 503;
            } else {
              // Include partial error info for debugging (sanitized)
              userMessage = `Failed to analyze the job description: ${msg.slice(0, 100)}`;
              status = 500;
            }

            push({
              error: userMessage,
              status,
            });
            controller.close();
            return;
          }

          push({
            stage: "jd_parsed",
            message: "Job description parsed",
            progress: 34,
          });

          // Stage: normalize resume
          push({
            stage: "resume_normalize",
            message: "Normalizing resume",
            progress: 42,
          });
          const normalizedResumeResult = await normalizeResume(
            extractionResult.data.text
          );

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
            push({
              error:
                "Failed to analyze the resume content. Please try a different file.",
              status: 500,
            });
            controller.close();
            return;
          }

          const normalizedResume = normalizedResumeResult.data;
          push({
            stage: "normalized",
            message: "Resume normalized",
            progress: 50,
          });

          // Stage: compare skills
          push({
            stage: "skills_compare",
            message: "Comparing experience and skills",
            progress: 62,
          });
          const skillComparison = compareSkills(parsedJD, normalizedResume);
          push({
            stage: "skills_compared",
            message: "Skills comparison complete",
            progress: 68,
          });

          // Stage: match responsibilities
          push({
            stage: "responsibilities_match",
            message: "Matching responsibilities",
            progress: 74,
          });
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
            push({
              error: "Failed to match responsibilities. Please try again.",
              status: 500,
            });
            controller.close();
            return;
          }
          const responsibilityMatching = responsibilityResult.data;
          push({
            stage: "responsibilities_matched",
            message: "Responsibilities matched",
            progress: 80,
          });

          // Stage: scoring
          push({
            stage: "scoring",
            message: "Calculating alignment score",
            progress: 85,
          });

          const score = calculateATSScore({
            skillComparison,
            responsibilityMatching,
            jobDescription: parsedJD,
            resume: normalizedResume,
          });

          push({ stage: "scored", message: "Score calculated", progress: 94 });

          const details: ATSAnalysisResponse["details"] = {
            skillComparison: {
              // Include full match info (jdSkill, resumeSkill, matchType) for richer feedback
              matchedRequired: skillComparison.matched.required.map((m) => ({
                jdSkill: m.jdSkill,
                resumeSkill: m.resumeSkill,
                matchType: m.matchType,
              })),
              matchedPreferred: skillComparison.matched.preferred.map((m) => ({
                jdSkill: m.jdSkill,
                resumeSkill: m.resumeSkill,
                matchType: m.matchType,
              })),
              missingRequired: skillComparison.missing,
              missingPreferred: skillComparison.missingPreferred,
              extraSkills: skillComparison.extra,
            },
            responsibilityCoverage: {
              covered: responsibilityMatching.coveredResponsibilities.map(
                (r) => ({
                  responsibility: r.responsibility,
                  explanation: r.explanation,
                })
              ),
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
          };

          // JD-agnostic resume quality feedback (Output B)
          // Produced by normalizeResume in the *same* LLM call
          // Does NOT affect score - purely advisory
          const resumeFeedback = postProcessResumeFeedback(
            normalizedResume,
            normalizedResume.resumeQualityFeedback
          );

          // Job-specific recovery guidance derived from the score deductions
          const scoreRecovery = buildScoreRecoveryPlan({ score, details });

          // Build final payload
          const response: ATSAnalysisResponse = {
            score,
            details,
            resumeFeedback,
            scoreRecovery,
          };

          // Finalize
          push({
            stage: "finalizing",
            message: "Finalizing results",
            progress: 98,
          });
          push({ done: true, data: response });
          controller.close();
          return;
        } catch (err) {
          console.error("[API /api/ats/analyze] stream error:", err);
          push({
            error: "An unexpected error occurred. Please try again later.",
            status: 500,
          });
          controller.close();
          return;
        }
      },
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-store",
      },
    });
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
