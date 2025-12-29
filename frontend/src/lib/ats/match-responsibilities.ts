/**
 * Responsibility matching utility using lightweight OpenAI semantic analysis.
 *
 * Compares job description responsibilities against resume experience bullets
 * to evaluate coverage. Uses gpt-4o-mini with structured outputs.
 *
 * Server-side only. No numeric scoring.
 */

import OpenAI from "openai";
import { z } from "zod";

import type { ParsedJobDescription } from "./parse-job-description";
import type { NormalizedResume } from "./normalize-resume";

// ---------------------------------------------------------------------------
// Types / Zod Schemas
// ---------------------------------------------------------------------------

/**
 * Coverage level for a responsibility.
 */
export const CoverageLevelSchema = z.enum([
  "covered", // Strong evidence in resume
  "weakly_covered", // Partial or indirect evidence
  "not_covered", // No relevant experience found
]);
export type CoverageLevel = z.infer<typeof CoverageLevelSchema>;

/**
 * Analysis result for a single responsibility.
 */
export const ResponsibilityMatchSchema = z.object({
  responsibility: z
    .string()
    .describe("The job description responsibility being evaluated."),
  coverage: CoverageLevelSchema.describe(
    "How well the resume covers this responsibility."
  ),
  explanation: z
    .string()
    .describe(
      "Brief explanation (1-2 sentences) of why this coverage level was assigned."
    ),
  relevantExperience: z
    .array(z.string())
    .describe(
      "Resume bullets that support this responsibility. Empty if not_covered."
    ),
});
export type ResponsibilityMatch = z.infer<typeof ResponsibilityMatchSchema>;

/**
 * Full responsibility matching result.
 */
export const ResponsibilityMatchingResultSchema = z.object({
  coveredResponsibilities: z
    .array(ResponsibilityMatchSchema)
    .describe("Responsibilities with strong evidence in the resume."),
  weaklyCovered: z
    .array(ResponsibilityMatchSchema)
    .describe("Responsibilities with partial or indirect evidence."),
  notCovered: z
    .array(ResponsibilityMatchSchema)
    .describe("Responsibilities with no relevant experience found."),
});
export type ResponsibilityMatchingResult = z.infer<
  typeof ResponsibilityMatchingResultSchema
>;

// ---------------------------------------------------------------------------
// OpenAI JSON Schema (for response_format)
// ---------------------------------------------------------------------------

const RESPONSIBILITY_MATCH_ITEM_SCHEMA = {
  type: "object" as const,
  properties: {
    responsibility: {
      type: "string" as const,
      description: "The job description responsibility being evaluated.",
    },
    coverage: {
      type: "string" as const,
      enum: ["covered", "weakly_covered", "not_covered"],
      description: "How well the resume covers this responsibility.",
    },
    explanation: {
      type: "string" as const,
      description:
        "Brief explanation (1-2 sentences) of why this coverage level was assigned.",
    },
    relevantExperience: {
      type: "array" as const,
      items: { type: "string" as const },
      description:
        "Resume bullets that support this responsibility. Empty if not_covered.",
    },
  },
  required: ["responsibility", "coverage", "explanation", "relevantExperience"],
  additionalProperties: false,
};

const RESPONSIBILITY_MATCHING_JSON_SCHEMA = {
  name: "responsibility_matching_result",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      coveredResponsibilities: {
        type: "array" as const,
        items: RESPONSIBILITY_MATCH_ITEM_SCHEMA,
        description: "Responsibilities with strong evidence in the resume.",
      },
      weaklyCovered: {
        type: "array" as const,
        items: RESPONSIBILITY_MATCH_ITEM_SCHEMA,
        description: "Responsibilities with partial or indirect evidence.",
      },
      notCovered: {
        type: "array" as const,
        items: RESPONSIBILITY_MATCH_ITEM_SCHEMA,
        description: "Responsibilities with no relevant experience found.",
      },
    },
    required: ["coveredResponsibilities", "weaklyCovered", "notCovered"],
    additionalProperties: false,
  },
};

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an ATS (Applicant Tracking System) analyst. Your task is to evaluate whether a candidate's resume experience supports the responsibilities listed in a job description.

For each responsibility, determine coverage level:
- "covered": The resume has clear, direct experience that demonstrates this responsibility. The candidate has explicitly done this or very similar work.
- "weakly_covered": The resume has partial, indirect, or tangentially related experience. The candidate may have touched on this area but hasn't clearly demonstrated it.
- "not_covered": No relevant experience found in the resume for this responsibility.

Rules:
1. Be objective and evidence-based. Only cite experience actually present in the resume.
2. For "relevantExperience", quote or closely paraphrase the actual resume bullets that support the responsibility.
  - Include at most 2 bullets per responsibility.
  - Prefer the single strongest bullet rather than multiple weak ones.
3. Keep explanations brief (1 sentence preferred, max 2) and factual.
  - For "weakly_covered", say what part is missing/unclear in the resume (without inventing).
4. Do NOT infer skills or experience not explicitly stated.
5. Do NOT penalize for minor wording differences if the substance matches.
6. Consider project experience and education achievements as valid experience.
7. Each responsibility must appear in exactly one category.
8. Avoid repetition:
  - Do not reuse the same explanation template for many items.
  - Do not repeat the same resume bullet across many responsibilities unless it is genuinely the best evidence.`;

// ---------------------------------------------------------------------------
// Helper: Extract all experience bullets from resume
// ---------------------------------------------------------------------------

function extractAllExperienceBullets(resume: NormalizedResume): string[] {
  const bullets: string[] = [];

  // Work experience bullets
  for (const exp of resume.experience) {
    bullets.push(...exp.bullets);
  }

  // Project bullets
  for (const project of resume.projects) {
    bullets.push(...project.bullets);
    // Also include project description if present
    if (project.description) {
      bullets.push(project.description);
    }
  }

  // Education highlights (relevant coursework, achievements)
  for (const edu of resume.education) {
    bullets.push(...edu.highlights);
  }

  return bullets;
}

// ---------------------------------------------------------------------------
// Main Function
// ---------------------------------------------------------------------------

export interface MatchResponsibilitiesOptions {
  /**
   * OpenAI API key. If not provided, falls back to OPENAI_API_KEY env var.
   */
  apiKey?: string;
  /**
   * Model to use. Defaults to gpt-4o-mini for cost efficiency.
   */
  model?: string;
}

export interface MatchResponsibilitiesSuccessResult {
  success: true;
  data: ResponsibilityMatchingResult;
}

export interface MatchResponsibilitiesErrorResult {
  success: false;
  error: {
    code: "NO_RESPONSIBILITIES" | "NO_EXPERIENCE" | "LLM_ERROR" | "PARSE_ERROR";
    message: string;
  };
}

export type MatchResponsibilitiesResponse =
  | MatchResponsibilitiesSuccessResult
  | MatchResponsibilitiesErrorResult;

/**
 * Match job description responsibilities against resume experience.
 *
 * Uses lightweight OpenAI semantic analysis to evaluate coverage.
 *
 * @param jd - Parsed job description (needs responsibilities).
 * @param resume - Normalized resume (needs experience, projects, education).
 * @param options - Optional configuration.
 * @returns Categorized responsibilities with explanations.
 *
 * @example
 * ```ts
 * const result = await matchResponsibilities(parsedJD, normalizedResume);
 *
 * if (result.success) {
 *   console.log("Covered:", result.data.coveredResponsibilities);
 *   console.log("Weak:", result.data.weaklyCovered);
 *   console.log("Missing:", result.data.notCovered);
 * }
 * ```
 */
export async function matchResponsibilities(
  jd: Pick<ParsedJobDescription, "responsibilities">,
  resume: Pick<NormalizedResume, "experience" | "projects" | "education">,
  options: MatchResponsibilitiesOptions = {}
): Promise<MatchResponsibilitiesResponse> {
  const { apiKey, model = "gpt-4o-mini" } = options;

  // Validate inputs
  if (!jd.responsibilities || jd.responsibilities.length === 0) {
    return {
      success: false,
      error: {
        code: "NO_RESPONSIBILITIES",
        message: "Job description has no responsibilities to match.",
      },
    };
  }

  const allBullets = extractAllExperienceBullets(resume as NormalizedResume);

  if (allBullets.length === 0) {
    return {
      success: false,
      error: {
        code: "NO_EXPERIENCE",
        message: "Resume has no experience bullets to match against.",
      },
    };
  }

  try {
    const openai = new OpenAI({
      apiKey: apiKey ?? process.env.OPENAI_API_KEY,
    });

    // Build user prompt with structured data
    const userPrompt = `## Job Description Responsibilities
${jd.responsibilities.map((r, i) => `${i + 1}. ${r}`).join("\n")}

## Resume Experience (all bullets from work, projects, education)
${allBullets.map((b) => `- ${b}`).join("\n")}

Evaluate each responsibility and categorize into covered, weakly_covered, or not_covered.`;

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: RESPONSIBILITY_MATCHING_JSON_SCHEMA,
      },
      temperature: 0.1,
      max_tokens: 4000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return {
        success: false,
        error: {
          code: "LLM_ERROR",
          message: "No response received from the language model.",
        },
      };
    }

    // Parse JSON response
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return {
        success: false,
        error: {
          code: "PARSE_ERROR",
          message: "Failed to parse language model response as JSON.",
        },
      };
    }

    // Validate against Zod schema
    const result = ResponsibilityMatchingResultSchema.safeParse(parsed);
    if (!result.success) {
      return {
        success: false,
        error: {
          code: "PARSE_ERROR",
          message: `Response failed schema validation: ${result.error.message}`,
        },
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error occurred";

    return {
      success: false,
      error: {
        code: "LLM_ERROR",
        message: `Language model error: ${message}`,
      },
    };
  }
}

/**
 * Get a human-readable summary of responsibility coverage.
 */
export function getResponsibilitySummaryText(
  result: ResponsibilityMatchingResult
): string {
  const total =
    result.coveredResponsibilities.length +
    result.weaklyCovered.length +
    result.notCovered.length;

  const lines = [
    `Responsibility Coverage: ${result.coveredResponsibilities.length}/${total} fully covered`,
  ];

  if (result.weaklyCovered.length > 0) {
    lines.push(`Partially covered: ${result.weaklyCovered.length}`);
  }

  if (result.notCovered.length > 0) {
    lines.push(
      `Not covered: ${result.notCovered
        .map((r) => r.responsibility)
        .join(", ")}`
    );
  }

  return lines.join("\n");
}
