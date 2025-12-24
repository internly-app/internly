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
  educationRequirements: z
    .array(z.string())
    .describe(
      "Education requirements explicitly mentioned (e.g., 'Bachelor's in Computer Science'). Empty array if not specified."
    ),
  seniorityLevel: SeniorityLevelSchema.describe(
    "Seniority level based on explicit title or stated requirements. Use 'unknown' if unclear or not stated."
  ),
  senioritySignals: z
    .array(z.string())
    .describe(
      "Specific phrases or requirements that indicate seniority (e.g., '5+ years', 'lead a team'). Empty if none found."
    ),
  yearsOfExperience: z
    .number()
    .nullable()
    .describe(
      "Minimum years of experience explicitly mentioned, or null if not specified."
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
      educationRequirements: {
        type: "array" as const,
        items: { type: "string" as const },
        description:
          "Education requirements explicitly mentioned (e.g., 'Bachelor's in Computer Science'). Empty array if not specified.",
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
          "Seniority level based on explicit title or stated requirements. Use 'unknown' if unclear or not stated.",
      },
      senioritySignals: {
        type: "array" as const,
        items: { type: "string" as const },
        description:
          "Specific phrases or requirements that indicate seniority (e.g., '5+ years', 'lead a team'). Empty if none found.",
      },
      yearsOfExperience: {
        type: ["number", "null"] as const,
        description:
          "Minimum years of experience explicitly mentioned, or null if not specified.",
      },
    },
    required: [
      "requiredSkills",
      "preferredSkills",
      "responsibilities",
      "educationRequirements",
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
2. Do not invent, assume, or infer information not present.
3. For seniorityLevel, only use values when explicitly stated in the title or requirements. Use "unknown" if the seniority is unclear or not mentioned.
4. For educationRequirements, only extract when explicitly mentioned (e.g., "Bachelor's degree required"). Return empty array if not specified.
5. If years of experience is mentioned as a range (e.g., "3-5 years"), use the minimum. Return null if not specified.
6. Keep skill names concise (e.g., "React" not "React.js framework experience").
7. Responsibilities should be brief summaries, not full sentences.
8. Critical: classify requiredSkills VERY conservatively.
   - Only put a skill into requiredSkills if the JD clearly implies it is REQUIRED, using words like: "must", "required", "need", "have to", "mandatory".
   - Languages/tools mentioned as context (e.g., "we work mostly in X, Y, Z", "our stack includes X", "tech we use") are NOT requirements. Put those in preferredSkills.
   - If the JD says languages can be learned (e.g., "new programming languages can be learned"), treat mentioned languages as preferredSkills unless explicitly marked required.
9. When in doubt, prefer preferredSkills over requiredSkills (or omit the skill) rather than incorrectly marking it required.`;

// ---------------------------------------------------------------------------
// Post-processing (deterministic guardrails)
// ---------------------------------------------------------------------------

function normalizeSkillName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ").replace(/\.+$/g, "");
}

function uniqueByNormalized(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = normalizeSkillName(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item.trim());
  }
  return out;
}

function isGenericCategorySkill(skill: string): boolean {
  const s = normalizeSkillName(skill);
  // Phrases that are categories rather than actual skills.
  const genericPhrases: RegExp[] = [
    /^programming\s+language(s)?$/i,
    /^one\s+or\s+more\s+languages$/i,
    /^one\s+or\s+more\s+programming\s+languages$/i,
    /^a\s+programming\s+language$/i,
    /^any\s+programming\s+language$/i,
    /^software\s+development\s+experience$/i,
    /^strong\s+foundation\s+in\s+computer\s+science\s+fundamentals$/i,
    /^computer\s+science\s+fundamentals$/i,
    /^strong\s+foundation\s+in\s+cs\s+fundamentals$/i,
    /^cs\s+fundamentals$/i,
  ];
  return genericPhrases.some((re) => re.test(s));
}

function isSoftCompetencyPhrase(skill: string): boolean {
  const s = normalizeSkillName(skill);
  // These are often written as requirements, but aren't ATS "skills" in the
  // same way as concrete tools/languages. We keep them out of requiredSkills
  // to avoid unfair penalties.
  const patterns: RegExp[] = [
    /\bstrong\s+foundation\b/i,
    /\bsolid\s+foundation\b/i,
    /\bfundamentals\b/i,
    /\bcomputer\s+science\b.*\bfundamentals\b/i,
    /\bdata\s+structures\s+and\s+algorithms\b/i,
    /\bos\b.*\bconcepts\b/i,
    /\boperating\s+systems\b/i,
    /\bcomputer\s+networks\b/i,
    /\bdistributed\s+systems\b/i,
  ];
  return patterns.some((re) => re.test(s));
}

/**
 * Strip generic category phrases that should never be treated as literal skills.
 *
 * Example problem: JD text like "Experience in at least one programming language
 * like Python, Java, or JavaScript" can lead the model to output
 * requiredSkills: ["programming language", "Python", ...].
 *
 * We remove "programming language" and keep concrete examples.
 */
function removeGenericCategorySkills(
  parsed: ParsedJobDescription
): ParsedJobDescription {
  return {
    ...parsed,
    requiredSkills: uniqueByNormalized(
      parsed.requiredSkills.filter(
        (s) => !isGenericCategorySkill(s) && !isSoftCompetencyPhrase(s)
      )
    ),
    preferredSkills: uniqueByNormalized(
      parsed.preferredSkills.filter(
        (s) => !isGenericCategorySkill(s) && !isSoftCompetencyPhrase(s)
      )
    ),
  };
}

/**
 * If a skill appears in a "like/such as" list, treat it as preferred unless
 * the JD explicitly marks the specific skill as required.
 */
function applyExampleListHeuristics(
  rawJdText: string,
  parsed: ParsedJobDescription
): ParsedJobDescription {
  const required = [...parsed.requiredSkills];
  const preferred = [...parsed.preferredSkills];

  // Keep in required only if the JD explicitly marks that exact skill as required.
  const explicitRequirementRe = (skill: string) => {
    const s = skill
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\s+/g, "\\s+");
    return new RegExp(
      `(?:must|required|mandatory|need|have to)\\s+(?:have\\s+)?(?:experience\\s+with\\s+)?${s}\\b`,
      "i"
    );
  };

  function appearsInExampleList(skill: string): boolean {
    const escaped = skill
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\s+/g, "\\s+");

    const patterns: RegExp[] = [
      // "... like Python, Java, or JavaScript"
      new RegExp(`\\b(?:like|such as)\\b[^\n]{0,120}\\b${escaped}\\b`, "i"),
      // "... a language such as Python"
      new RegExp(
        `\\b(?:a|one)\\s+language\\s+such\\s+as\\b[^\n]{0,120}\\b${escaped}\\b`,
        "i"
      ),
    ];
    return patterns.some((re) => re.test(rawJdText));
  }

  const newRequired: string[] = [];
  for (const skill of required) {
    if (explicitRequirementRe(skill).test(rawJdText)) {
      newRequired.push(skill);
      continue;
    }

    if (appearsInExampleList(skill)) {
      preferred.push(skill);
      continue;
    }

    newRequired.push(skill);
  }

  return {
    ...parsed,
    requiredSkills: uniqueByNormalized(newRequired),
    preferredSkills: uniqueByNormalized(preferred),
  };
}

// ---------------------------------------------------------------------------
// Interchangeable skill groups (deterministic)
// ---------------------------------------------------------------------------

/**
 * Some JDs phrase requirements as "at least one of X/Y/Z".
 *
 * We treat these as interchangeable: candidates shouldn't be penalized for
 * missing any one specific option if they have another.
 *
 * Implementation approach (deterministic):
 * - Keep the concrete example skills (X/Y/Z)
 * - Remove the generic phrase "programming language" (handled elsewhere)
 * - Add a synthetic required skill token representing the group, and move
 *   the individual examples to preferred so they don't become hard requirements.
 */
function applyAtLeastOneOfHeuristics(
  rawJdText: string,
  parsed: ParsedJobDescription
): ParsedJobDescription {
  const jdText = rawJdText;

  // Matches: "at least one ... like Python, Java, or JavaScript"
  // Capture the list tail after like/such as.
  const re =
    /at\s+least\s+one\s+(?:programming\s+language|language)s?\b[^\n]{0,80}\b(?:like|such as)\b([^\n]{0,180})/gi;

  const groups: string[][] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(jdText))) {
    const tail = match[1] ?? "";
    // Split on commas / "or" / slashes.
    const parts = tail
      .split(/,|\bor\b|\//i)
      .map((p) => p.replace(/[()]/g, " ").trim())
      .filter(Boolean);

    // Only keep items that look like concrete skills (and are not generic).
    const skills = parts.filter((p) => !isGenericCategorySkill(p));
    if (skills.length >= 2) groups.push(skills);
  }

  if (groups.length === 0) return parsed;

  const preferred = [...parsed.preferredSkills];
  const required = [...parsed.requiredSkills];

  // Flatten and normalize for comparisons.
  const requiredNorm = new Set(required.map(normalizeSkillName));
  const preferredNorm = new Set(preferred.map(normalizeSkillName));

  const syntheticRequired: string[] = [];

  for (const group of groups) {
    const normalizedGroup = uniqueByNormalized(group);

    // If any group member is explicitly required (must/required/etc), skip grouping.
    const anyExplicitRequired = normalizedGroup.some((skill) => {
      const s = skill
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\s+/g, "\\s+");
      const sr = new RegExp(
        `(?:must|required|mandatory|need|have to)\\s+(?:have\\s+)?(?:experience\\s+with\\s+)?${s}\\b`,
        "i"
      );
      return sr.test(jdText);
    });
    if (anyExplicitRequired) continue;

    // Remove group members from required to avoid "missing one option" penalties.
    for (const skill of normalizedGroup) {
      const key = normalizeSkillName(skill);
      if (requiredNorm.has(key)) {
        requiredNorm.delete(key);
      }
      if (!preferredNorm.has(key)) {
        preferredNorm.add(key);
        preferred.push(skill);
      }
    }

    // Add a synthetic group token which we can score as a single requirement.
    syntheticRequired.push(`At least one of: ${normalizedGroup.join(", ")}`);
  }

  const newRequired = required.filter((s) =>
    requiredNorm.has(normalizeSkillName(s))
  );
  newRequired.push(...syntheticRequired);

  return {
    ...parsed,
    requiredSkills: uniqueByNormalized(newRequired),
    preferredSkills: uniqueByNormalized(preferred),
  };
}

/**
 * Deterministic post-processing for a ParsedJobDescription, separate from
 * the OpenAI call. Exported to make unit testing possible.
 */
export function postProcessParsedJobDescription(
  rawJdText: string,
  parsed: ParsedJobDescription
): ParsedJobDescription {
  const cleaned = removeGenericCategorySkills(parsed);
  const withExamples = applyExampleListHeuristics(rawJdText, cleaned);
  const withAtLeastOne = applyAtLeastOneOfHeuristics(rawJdText, withExamples);
  return applySkillRequirementHeuristics(rawJdText, withAtLeastOne);
}

/**
 * Downgrade skills that are likely NOT required based on the exact JD text.
 *
 * This specifically catches patterns like:
 * - "We work mostly in Java, Ruby, JavaScript, Scala, and Go"
 * - "Our stack includes ..."
 * - "We believe new programming languages can be learned ..."
 */
function applySkillRequirementHeuristics(
  rawJdText: string,
  parsed: ParsedJobDescription
): ParsedJobDescription {
  const jdLower = rawJdText.toLowerCase();

  const descriptiveListSignals: RegExp[] = [
    /we\s+work\s+mostly\s+in\b/i,
    /our\s+stack\b/i,
    /tech\s+stack\b/i,
    /our\s+tech\s+stack\b/i,
    /we\s+use\b/i,
    /technologies\s+we\s+use\b/i,
    /languages\s+we\s+use\b/i,
  ];

  const learningSignals: RegExp[] = [
    /can\s+be\s+learned\b/i,
    /willing\s+to\s+learn\b/i,
    /learn\s+new\s+languages\b/i,
    /new\s+programming\s+languages\s+can\s+be\s+learned\b/i,
  ];

  const hasDescriptiveSignal = descriptiveListSignals.some((re) =>
    re.test(jdLower)
  );
  const hasLearningSignal = learningSignals.some((re) => re.test(jdLower));
  if (!hasDescriptiveSignal && !hasLearningSignal) return parsed;

  const required = [...parsed.requiredSkills];
  const preferred = [...parsed.preferredSkills];

  // Keep in required only if the JD explicitly marks that exact skill as required.
  const explicitRequirementRe = (skill: string) => {
    const s = skill
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\s+/g, "\\s+");
    return new RegExp(
      `(?:must|required|mandatory|need|have to)\\s+(?:have\\s+)?(?:experience\\s+with\\s+)?${s}\\b`,
      "i"
    );
  };

  const newRequired: string[] = [];
  for (const skill of required) {
    if (explicitRequirementRe(skill).test(rawJdText)) {
      newRequired.push(skill);
    } else {
      preferred.push(skill);
    }
  }

  return {
    ...parsed,
    requiredSkills: uniqueByNormalized(newRequired),
    preferredSkills: uniqueByNormalized(preferred),
  };
}

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

  return postProcessParsedJobDescription(trimmed, result.data);
}
