/**
 * Job description parsing utility using LLM with strict JSON schema.
 *
 * Extracts:
 * - Required skills
 * - Preferred/nice-to-have skills
 * - Key responsibilities
 * - Seniority signals (entry/mid/senior/lead/etc.)
 *
 * Uses OpenAI's structured outputs (response_format with JSON schema) to
 * guarantee schema compliance.
 */

import OpenAI from "openai";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Types / Zod Schemas
// ---------------------------------------------------------------------------

/**
 * Seniority level inferred from the job description.
 */
export const SeniorityLevelSchema = z.enum([
  "intern",
  "entry",
  "mid",
  "senior",
  "lead",
  "manager",
  "director",
  "executive",
  "unknown",
]);
export type SeniorityLevel = z.infer<typeof SeniorityLevelSchema>;

/**
 * Parsed job description output.
 */
export const ParsedJobDescriptionSchema = z.object({
  requiredSkills: z
    .array(z.string())
    .describe("Skills explicitly listed as required or must-have."),
  preferredSkills: z
    .array(z.string())
    .describe(
      "Skills listed as preferred, nice-to-have, or bonus qualifications."
    ),
  responsibilities: z
    .array(z.string())
    .describe("Key job responsibilities or duties mentioned."),
  seniorityLevel: SeniorityLevelSchema.describe(
    "Inferred seniority level based on title, years of experience, and language."
  ),
  senioritySignals: z
    .array(z.string())
    .describe(
      "Specific phrases or requirements that indicate seniority (e.g., '5+ years', 'lead a team')."
    ),
  yearsOfExperience: z
    .number()
    .nullable()
    .describe(
      "Minimum years of experience mentioned, or null if not specified."
    ),
});

export type ParsedJobDescription = z.infer<typeof ParsedJobDescriptionSchema>;

// ---------------------------------------------------------------------------
// OpenAI JSON Schema (for response_format)
// ---------------------------------------------------------------------------

/**
 * JSON Schema representation for OpenAI's structured output.
 * Must match ParsedJobDescriptionSchema exactly.
 */
const JD_JSON_SCHEMA = {
  name: "parsed_job_description",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      requiredSkills: {
        type: "array" as const,
        items: { type: "string" as const },
        description: "Skills explicitly listed as required or must-have.",
      },
      preferredSkills: {
        type: "array" as const,
        items: { type: "string" as const },
        description:
          "Skills listed as preferred, nice-to-have, or bonus qualifications.",
      },
      responsibilities: {
        type: "array" as const,
        items: { type: "string" as const },
        description: "Key job responsibilities or duties mentioned.",
      },
      seniorityLevel: {
        type: "string" as const,
        enum: [
          "intern",
          "entry",
          "mid",
          "senior",
          "lead",
          "manager",
          "director",
          "executive",
          "unknown",
        ],
        description:
          "Inferred seniority level based on title, years of experience, and language.",
      },
      senioritySignals: {
        type: "array" as const,
        items: { type: "string" as const },
        description:
          "Specific phrases or requirements that indicate seniority (e.g., '5+ years', 'lead a team').",
      },
      yearsOfExperience: {
        type: ["number", "null"] as const,
        description:
          "Minimum years of experience mentioned, or null if not specified.",
      },
    },
    required: [
      "requiredSkills",
      "preferredSkills",
      "responsibilities",
      "seniorityLevel",
      "senioritySignals",
      "yearsOfExperience",
    ],
    additionalProperties: false,
  },
};

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a job description parser. Given a job description, extract structured information.

Rules:
1. Only include skills/responsibilities explicitly mentioned in the text.
2. Do not invent or assume information not present.
3. For seniorityLevel, infer from title, required years, and language used.
4. If years of experience is mentioned as a range (e.g., "3-5 years"), use the minimum.
5. Keep skill names concise (e.g., "React" not "React.js framework experience").
6. Responsibilities should be brief summaries, not full sentences.`;

// ---------------------------------------------------------------------------
// Main Function
// ---------------------------------------------------------------------------

export interface ParseJobDescriptionOptions {
  /**
   * OpenAI API key. If not provided, falls back to OPENAI_API_KEY env var.
   */
  apiKey?: string;
  /**
   * Model to use. Defaults to gpt-4o-mini for cost efficiency.
   */
  model?: string;
}

/**
 * Parse a job description string and extract structured information using an LLM.
 *
 * @param jobDescription - The raw job description text.
 * @param options - Optional configuration.
 * @returns Parsed job description with required/preferred skills, responsibilities, and seniority.
 * @throws Error if LLM call fails or response doesn't match schema.
 */
export async function parseJobDescription(
  jobDescription: string,
  options: ParseJobDescriptionOptions = {}
): Promise<ParsedJobDescription> {
  const { apiKey, model = "gpt-4o-mini" } = options;

  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: apiKey ?? process.env.OPENAI_API_KEY,
  });

  // Validate input
  const trimmed = jobDescription.trim();
  if (!trimmed) {
    throw new Error("Job description cannot be empty.");
  }
  if (trimmed.length > 50_000) {
    throw new Error(
      "Job description too long. Maximum 50,000 characters allowed."
    );
  }

  // Call OpenAI with structured output
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: trimmed },
    ],
    response_format: {
      type: "json_schema",
      json_schema: JD_JSON_SCHEMA,
    },
    temperature: 0.1, // Low temperature for deterministic extraction
    max_tokens: 2000,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from LLM.");
  }

  // Parse and validate response
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`LLM returned invalid JSON: ${content.slice(0, 200)}`);
  }

  // Validate against Zod schema (belt + suspenders with OpenAI's strict mode)
  const result = ParsedJobDescriptionSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `LLM response failed schema validation: ${result.error.message}`
    );
  }

  return result.data;
}
