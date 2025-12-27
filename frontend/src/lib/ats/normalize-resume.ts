/**
 * Resume normalization utility using LLM with strict JSON schema.
 *
 * Extracts structured information from raw resume text:
 * - Skills (categorized by type)
 * - Experience bullets
 * - Education entries
 * - Projects (if present)
 *
 * Uses OpenAI's structured outputs (response_format with JSON schema) to
 * guarantee schema compliance.
 *
 * Server-side only. No scoring, no comparison, no inference.
 */

import OpenAI from "openai";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Types / Zod Schemas
// ---------------------------------------------------------------------------

/**
 * A single work experience entry.
 */
export const ExperienceEntrySchema = z.object({
  company: z
    .string()
    .describe("Company or organization name. Empty string if not specified."),
  title: z
    .string()
    .describe("Job title or role. Empty string if not specified."),
  duration: z
    .string()
    .nullable()
    .describe(
      "Duration or date range (e.g., 'Jan 2022 - Present'). Null if not specified."
    ),
  location: z
    .string()
    .nullable()
    .describe("Location if mentioned. Null if not specified."),
  bullets: z
    .array(z.string())
    .describe(
      "Key accomplishments or responsibilities as concise bullet points."
    ),
});
export type ExperienceEntry = z.infer<typeof ExperienceEntrySchema>;

/**
 * A single education entry.
 */
export const EducationEntrySchema = z.object({
  institution: z
    .string()
    .describe(
      "School, university, or institution name. Empty string if not specified."
    ),
  degree: z
    .string()
    .nullable()
    .describe("Degree type (e.g., 'B.S.', 'Master's'). Null if not specified."),
  field: z
    .string()
    .nullable()
    .describe("Field of study or major. Null if not specified."),
  graduationDate: z
    .string()
    .nullable()
    .describe(
      "Graduation date or expected graduation (e.g., 'May 2024'). Null if not specified."
    ),
  gpa: z
    .string()
    .nullable()
    .describe("GPA if explicitly mentioned. Null if not specified."),
  highlights: z
    .array(z.string())
    .describe(
      "Notable achievements, honors, or coursework. Empty array if none."
    ),
});
export type EducationEntry = z.infer<typeof EducationEntrySchema>;

/**
 * A single project entry.
 */
export const ProjectEntrySchema = z.object({
  name: z
    .string()
    .describe("Project name or title. Empty string if not specified."),
  description: z
    .string()
    .nullable()
    .describe("Brief description of the project. Null if not specified."),
  technologies: z
    .array(z.string())
    .describe("Technologies, tools, or languages used. Empty array if none."),
  bullets: z
    .array(z.string())
    .describe("Key features or accomplishments. Empty array if none."),
  url: z
    .string()
    .nullable()
    .describe("Project URL or link if mentioned. Null if not specified."),
});
export type ProjectEntry = z.infer<typeof ProjectEntrySchema>;

/**
 * Normalized resume output.
 */
export const NormalizedResumeSchema = z.object({
  contactInfo: z
    .object({
      name: z.string().nullable().describe("Full name. Null if not found."),
      email: z
        .string()
        .nullable()
        .describe("Email address. Null if not found."),
      phone: z.string().nullable().describe("Phone number. Null if not found."),
      location: z
        .string()
        .nullable()
        .describe("City/state/country. Null if not found."),
      linkedin: z
        .string()
        .nullable()
        .describe("LinkedIn URL or username. Null if not found."),
      github: z
        .string()
        .nullable()
        .describe("GitHub URL or username. Null if not found."),
      portfolio: z
        .string()
        .nullable()
        .describe("Portfolio/website URL. Null if not found."),
    })
    .describe("Contact information extracted from the resume."),
  summary: z
    .string()
    .nullable()
    .describe(
      "Professional summary or objective if present. Null if not found."
    ),
  skills: z
    .object({
      technical: z
        .array(z.string())
        .describe(
          "Technical skills: programming languages, frameworks, tools, databases, etc."
        ),
      soft: z
        .array(z.string())
        .describe(
          "Soft skills: communication, leadership, teamwork, etc. Empty if none explicitly listed."
        ),
      other: z
        .array(z.string())
        .describe("Other skills that don't fit above categories."),
    })
    .describe("Skills categorized by type."),
  experience: z
    .array(ExperienceEntrySchema)
    .describe("Work experience entries in order as they appear."),
  education: z
    .array(EducationEntrySchema)
    .describe("Education entries in order as they appear."),
  projects: z
    .array(ProjectEntrySchema)
    .describe("Project entries if present. Empty array if none."),
  certifications: z
    .array(z.string())
    .describe("Certifications or licenses mentioned. Empty array if none."),
  languages: z
    .array(z.string())
    .describe(
      "Spoken/written languages if mentioned (e.g., 'English (fluent)'). Empty array if none."
    ),
});

export type NormalizedResume = z.infer<typeof NormalizedResumeSchema>;

// ---------------------------------------------------------------------------
// OpenAI JSON Schema (for response_format)
// ---------------------------------------------------------------------------

/**
 * JSON Schema representation for OpenAI's structured output.
 * Must match NormalizedResumeSchema exactly.
 */
const RESUME_JSON_SCHEMA = {
  name: "normalized_resume",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      contactInfo: {
        type: "object" as const,
        properties: {
          name: {
            type: ["string", "null"] as const,
            description: "Full name. Null if not found.",
          },
          email: {
            type: ["string", "null"] as const,
            description: "Email address. Null if not found.",
          },
          phone: {
            type: ["string", "null"] as const,
            description: "Phone number. Null if not found.",
          },
          location: {
            type: ["string", "null"] as const,
            description: "City/state/country. Null if not found.",
          },
          linkedin: {
            type: ["string", "null"] as const,
            description: "LinkedIn URL or username. Null if not found.",
          },
          github: {
            type: ["string", "null"] as const,
            description: "GitHub URL or username. Null if not found.",
          },
          portfolio: {
            type: ["string", "null"] as const,
            description: "Portfolio/website URL. Null if not found.",
          },
        },
        required: [
          "name",
          "email",
          "phone",
          "location",
          "linkedin",
          "github",
          "portfolio",
        ],
        additionalProperties: false,
      },
      summary: {
        type: ["string", "null"] as const,
        description:
          "Professional summary or objective if present. Null if not found.",
      },
      skills: {
        type: "object" as const,
        properties: {
          technical: {
            type: "array" as const,
            items: { type: "string" as const },
            description:
              "Technical skills: programming languages, frameworks, tools, databases, etc.",
          },
          soft: {
            type: "array" as const,
            items: { type: "string" as const },
            description:
              "Soft skills: communication, leadership, teamwork, etc. Empty if none explicitly listed.",
          },
          other: {
            type: "array" as const,
            items: { type: "string" as const },
            description: "Other skills that don't fit above categories.",
          },
        },
        required: ["technical", "soft", "other"],
        additionalProperties: false,
      },
      experience: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            company: {
              type: "string" as const,
              description:
                "Company or organization name. Empty string if not specified.",
            },
            title: {
              type: "string" as const,
              description: "Job title or role. Empty string if not specified.",
            },
            duration: {
              type: ["string", "null"] as const,
              description:
                "Duration or date range (e.g., 'Jan 2022 - Present'). Null if not specified.",
            },
            location: {
              type: ["string", "null"] as const,
              description: "Location if mentioned. Null if not specified.",
            },
            bullets: {
              type: "array" as const,
              items: { type: "string" as const },
              description:
                "Key accomplishments or responsibilities as concise bullet points.",
            },
          },
          required: ["company", "title", "duration", "location", "bullets"],
          additionalProperties: false,
        },
        description: "Work experience entries in order as they appear.",
      },
      education: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            institution: {
              type: "string" as const,
              description:
                "School, university, or institution name. Empty string if not specified.",
            },
            degree: {
              type: ["string", "null"] as const,
              description:
                "Degree type (e.g., 'B.S.', 'Master's'). Null if not specified.",
            },
            field: {
              type: ["string", "null"] as const,
              description: "Field of study or major. Null if not specified.",
            },
            graduationDate: {
              type: ["string", "null"] as const,
              description:
                "Graduation date or expected graduation (e.g., 'May 2024'). Null if not specified.",
            },
            gpa: {
              type: ["string", "null"] as const,
              description:
                "GPA if explicitly mentioned. Null if not specified.",
            },
            highlights: {
              type: "array" as const,
              items: { type: "string" as const },
              description:
                "Notable achievements, honors, or coursework. Empty array if none.",
            },
          },
          required: [
            "institution",
            "degree",
            "field",
            "graduationDate",
            "gpa",
            "highlights",
          ],
          additionalProperties: false,
        },
        description: "Education entries in order as they appear.",
      },
      projects: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            name: {
              type: "string" as const,
              description:
                "Project name or title. Empty string if not specified.",
            },
            description: {
              type: ["string", "null"] as const,
              description:
                "Brief description of the project. Null if not specified.",
            },
            technologies: {
              type: "array" as const,
              items: { type: "string" as const },
              description:
                "Technologies, tools, or languages used. Empty array if none.",
            },
            bullets: {
              type: "array" as const,
              items: { type: "string" as const },
              description:
                "Key features or accomplishments. Empty array if none.",
            },
            url: {
              type: ["string", "null"] as const,
              description:
                "Project URL or link if mentioned. Null if not specified.",
            },
          },
          required: ["name", "description", "technologies", "bullets", "url"],
          additionalProperties: false,
        },
        description: "Project entries if present. Empty array if none.",
      },
      certifications: {
        type: "array" as const,
        items: { type: "string" as const },
        description:
          "Certifications or licenses mentioned. Empty array if none.",
      },
      languages: {
        type: "array" as const,
        items: { type: "string" as const },
        description:
          "Spoken/written languages if mentioned (e.g., 'English (fluent)'). Empty array if none.",
      },
    },
    required: [
      "contactInfo",
      "summary",
      "skills",
      "experience",
      "education",
      "projects",
      "certifications",
      "languages",
    ],
    additionalProperties: false,
  },
};

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a resume parser. Given raw resume text, extract structured information.

Rules:
1. Only extract information explicitly present in the text. Do NOT invent, assume, or infer.
2. Preserve the original wording where appropriate, but normalize formatting.
3. For skills, categorize into technical (programming, tools, frameworks) vs soft skills.
4. Experience bullets should be concise summaries of accomplishments or responsibilities.
5. Keep entries in the order they appear in the resume.
6. Use null for missing optional fields, empty arrays for missing lists.
7. Do NOT score, rate, or assess quality of the resume or candidate.
8. Do NOT infer seniority level, years of experience, or skill proficiency.
9. Extract URLs (LinkedIn, GitHub, portfolio) if explicitly present.
10. For duration/dates, preserve the original format from the resume.`;

// ---------------------------------------------------------------------------
// Main Function
// ---------------------------------------------------------------------------

export interface NormalizeResumeOptions {
  /**
   * OpenAI API key. If not provided, falls back to OPENAI_API_KEY env var.
   */
  apiKey?: string;
  /**
   * Model to use. Defaults to gpt-4o-mini for cost efficiency.
   */
  model?: string;
}

export interface NormalizeResumeResult {
  success: true;
  data: NormalizedResume;
}

export interface NormalizeResumeError {
  success: false;
  error: {
    code: "EMPTY_INPUT" | "INPUT_TOO_LONG" | "LLM_ERROR" | "PARSE_ERROR";
    message: string;
  };
}

export type NormalizeResumeResponse =
  | NormalizeResumeResult
  | NormalizeResumeError;

/**
 * Normalize raw resume text into structured JSON using an LLM.
 *
 * @param resumeText - The raw resume text (e.g., from PDF extraction).
 * @param options - Optional configuration.
 * @returns Normalized resume data on success, or error details on failure.
 *
 * @example
 * ```ts
 * const result = await normalizeResume(rawText);
 *
 * if (result.success) {
 *   console.log(result.data.skills.technical);
 *   console.log(result.data.experience);
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 */
export async function normalizeResume(
  resumeText: string,
  options: NormalizeResumeOptions = {}
): Promise<NormalizeResumeResponse> {
  const { apiKey, model = "gpt-4o-mini" } = options;

  // Validate input
  const trimmed = resumeText.trim();
  if (!trimmed) {
    return {
      success: false,
      error: {
        code: "EMPTY_INPUT",
        message: "Resume text cannot be empty.",
      },
    };
  }

  // Limit to ~30k chars (resumes should be much shorter, but allow some buffer)
  if (trimmed.length > 30_000) {
    return {
      success: false,
      error: {
        code: "INPUT_TOO_LONG",
        message: "Resume text too long. Maximum 30,000 characters allowed.",
      },
    };
  }

  try {
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey ?? process.env.OPENAI_API_KEY,
    });

    // Call OpenAI with structured output
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: trimmed },
      ],
      response_format: {
        type: "json_schema",
        json_schema: RESUME_JSON_SCHEMA,
      },
      temperature: 0.1, // Low temperature for deterministic extraction
      max_tokens: 4000, // Resumes can be longer than JDs
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

    // Validate against Zod schema (belt + suspenders with OpenAI's strict mode)
    const result = NormalizedResumeSchema.safeParse(parsed);
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
    // Handle OpenAI API errors gracefully
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
