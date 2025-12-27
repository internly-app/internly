/**
 * Skill comparison utility for ATS resume analysis.
 *
 * Compares resume skills against job description requirements using
 * deterministic logic (no ML, no OpenAI):
 * - Exact matching
 * - Normalized matching (case, plurals, common variations)
 * - Simple synonym mapping (manual curated list)
 *
 * Classifies skills into: matched, missing (required), extra
 */

import type { ParsedJobDescription } from "./parse-job-description";
import type { NormalizedResume } from "./normalize-resume";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SkillMatch {
  /** The skill as it appears in the job description. */
  jdSkill: string;
  /** The matching skill from the resume (may differ in casing/format). */
  resumeSkill: string;
  /** How the match was made. */
  matchType: "exact" | "normalized" | "synonym";
}

export interface SkillComparisonResult {
  /** Skills from JD that were found in the resume. */
  matched: {
    required: SkillMatch[];
    preferred: SkillMatch[];
  };
  /** Required skills from JD not found in the resume. */
  missing: string[];
  /** Preferred skills from JD not found in the resume. */
  missingPreferred: string[];
  /** Resume skills not mentioned in JD (neither required nor preferred). */
  extra: string[];
  /** Summary counts for quick reference. */
  summary: {
    totalRequired: number;
    totalPreferred: number;
    matchedRequired: number;
    matchedPreferred: number;
    missingRequired: number;
    missingPreferred: number;
    extraSkills: number;
  };
}

// ---------------------------------------------------------------------------
// Synonym Map (manually curated, common tech synonyms)
// ---------------------------------------------------------------------------

/**
 * Maps skill variations to a canonical form.
 * Key: lowercase canonical name
 * Value: array of lowercase aliases/synonyms
 */
const SYNONYM_MAP: Record<string, string[]> = {
  // JavaScript ecosystem
  javascript: ["js", "ecmascript", "es6", "es2015", "es2020", "vanilla js"],
  typescript: ["ts"],
  react: ["reactjs", "react.js", "react js"],
  "react native": ["reactnative", "rn"],
  vue: ["vuejs", "vue.js", "vue js", "vue 3", "vue3"],
  angular: ["angularjs", "angular.js", "angular 2+"],
  nextjs: ["next.js", "next js", "next"],
  nodejs: ["node.js", "node js", "node"],
  express: ["expressjs", "express.js"],
  nestjs: ["nest.js", "nest js", "nest"],

  // Python ecosystem
  python: ["python3", "python 3", "py"],
  django: ["django rest framework", "drf"],
  flask: ["flask api"],
  fastapi: ["fast api"],
  pandas: ["pandas library"],
  numpy: ["numpy library"],

  // Databases
  postgresql: ["postgres", "psql", "pg"],
  mysql: ["my sql"],
  mongodb: ["mongo", "mongo db"],
  redis: ["redis cache"],
  elasticsearch: ["elastic search", "elastic"],
  dynamodb: ["dynamo db", "dynamo", "aws dynamodb"],

  // Cloud & DevOps
  aws: ["amazon web services", "amazon aws"],
  gcp: ["google cloud", "google cloud platform"],
  azure: ["microsoft azure", "ms azure"],
  docker: ["docker containers", "containerization"],
  kubernetes: ["k8s", "kube"],
  terraform: ["tf", "terraform iac"],
  "ci/cd": ["cicd", "ci cd", "continuous integration", "continuous deployment"],
  github: ["github actions", "gh"],
  gitlab: ["gitlab ci", "gitlab ci/cd"],

  // Languages
  java: ["java se", "java ee", "core java"],
  csharp: ["c#", "c sharp", ".net c#"],
  cpp: ["c++", "cplusplus"],
  golang: ["go", "go lang"],
  rust: ["rust lang"],
  swift: ["swift ui", "swiftui"],
  kotlin: ["kotlin android"],
  ruby: ["ruby on rails", "ror", "rails"],
  php: ["php 7", "php 8", "laravel php"],

  // Frontend
  html: ["html5", "html 5"],
  css: ["css3", "css 3"],
  sass: ["scss", "sass/scss"],
  tailwind: ["tailwindcss", "tailwind css"],
  bootstrap: ["bootstrap 5", "bootstrap css"],
  webpack: ["webpack 5"],
  vite: ["vitejs", "vite.js"],

  // Testing
  jest: ["jest testing"],
  mocha: ["mocha testing"],
  cypress: ["cypress testing", "cypress.io"],
  playwright: ["playwright testing"],
  pytest: ["py test", "python pytest"],
  junit: ["junit testing", "junit 5"],

  // Mobile
  ios: ["ios development", "ios dev"],
  android: ["android development", "android dev"],
  flutter: ["flutter dart"],

  // Data & ML
  sql: ["structured query language"],
  "machine learning": ["ml", "machine-learning"],
  "deep learning": ["dl", "deep-learning"],
  tensorflow: ["tf", "tensor flow"],
  pytorch: ["py torch", "torch"],

  // Tools & Misc
  git: ["git version control", "github", "gitlab", "bitbucket"],
  jira: ["jira software", "atlassian jira"],
  figma: ["figma design"],
  api: ["rest api", "restful api", "rest apis", "apis"],
  graphql: ["graph ql", "gql"],
  agile: ["agile methodology", "scrum", "agile/scrum"],
  linux: ["linux/unix", "unix", "ubuntu", "debian"],
};

/**
 * Build reverse lookup: alias -> canonical
 */
function buildReverseSynonymMap(): Map<string, string> {
  const reverseMap = new Map<string, string>();

  for (const [canonical, aliases] of Object.entries(SYNONYM_MAP)) {
    // Add canonical itself
    reverseMap.set(canonical, canonical);
    // Add all aliases
    for (const alias of aliases) {
      reverseMap.set(alias, canonical);
    }
  }

  return reverseMap;
}

const REVERSE_SYNONYM_MAP = buildReverseSynonymMap();

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

/**
 * Split a raw skill into candidate tokens.
 *
 * Example: "JavaScript/ES6" -> ["JavaScript", "ES6"]
 *          "React (Hooks)"  -> ["React", "Hooks"]
 */
function splitSkillTokens(skill: string): string[] {
  return skill
    .split(/[\/,|()]/g)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Version-ish tokens that should be ignored for matching.
 */
function isVersionToken(token: string): boolean {
  const t = token.toLowerCase().trim();
  if (!t) return true;

  // ECMAScript versions
  if (/^es\d+$/i.test(t)) return true; // es6, es7, ...
  if (/^es\d{4}$/i.test(t)) return true; // es2015, es2020, ...
  if (t === "ecma" || t === "ecmascript") return true;

  // Generic versions
  if (/^v\d+(\.\d+){0,2}$/i.test(t)) return true; // v3, v18.2, v1.2.3
  if (/^\d+(\.\d+){1,2}$/.test(t)) return true; // 1.2, 18.2.0

  // Common fluff in parentheses
  if (["latest", "current", "new", "modern"].includes(t)) return true;

  return false;
}

/**
 * Normalize a string chunk for comparison (single token).
 */
function normalizeSkillToken(token: string): string {
  let normalized = token
    .toLowerCase()
    .trim()
    // Remove trailing punctuation
    .replace(/[.,;:!?]+$/, "")
    // Collapse multiple spaces
    .replace(/\s+/g, " ")
    .trim();

  // Handle simple plural forms (same logic as before)
  if (normalized.endsWith("ies") && normalized.length > 4) {
    // intentionally no-op
  } else if (normalized.endsWith("s") && normalized.length > 2) {
    const withoutS = normalized.slice(0, -1);
    if (
      !["ss", "us", "is", "as", "os"].some((ending) =>
        normalized.endsWith(ending)
      )
    ) {
      if (REVERSE_SYNONYM_MAP.has(withoutS)) {
        normalized = withoutS;
      }
    }
  }

  return normalized;
}

/**
 * Normalize a raw skill string into a set of canonical skills.
 *
 * - Lowercase
 * - Split on / , | ( )
 * - Remove version tokens (es6, es2015, vX)
 * - Map aliases to canonical using the synonym groups
 */
function getCanonicalSkillSet(skill: string): Set<string> {
  const tokens = splitSkillTokens(skill);
  const canonicals = new Set<string>();

  for (const token of tokens.length > 0 ? tokens : [skill]) {
    if (isVersionToken(token)) continue;
    const normalized = normalizeSkillToken(token);
    if (!normalized) continue;
    const canonical = REVERSE_SYNONYM_MAP.get(normalized) ?? normalized;
    canonicals.add(canonical);
  }

  // Fallback: if everything got filtered out (e.g., skill === "ES6"), keep original
  if (canonicals.size === 0) {
    const normalized = normalizeSkillToken(skill);
    if (normalized)
      canonicals.add(REVERSE_SYNONYM_MAP.get(normalized) ?? normalized);
  }

  return canonicals;
}

/**
 * Normalize a skill string for comparison:
 * - Lowercase
 * - Trim whitespace
 * - Remove trailing punctuation
 * - Collapse multiple spaces
 * - Handle common plural forms
 */
function normalizeSkill(skill: string): string {
  // Keep backwards-compatible single-key normalization used for Map lookups.
  // (We now do richer token normalization via getCanonicalSkillSet.)
  return normalizeSkillToken(skill);
}

/**
 * Get canonical form of a skill (via synonym map).
 */
function getCanonicalSkill(skill: string): string {
  // Backwards-compatible "single canonical" form.
  // Prefer the first canonical from the richer set (deterministic by iteration).
  const canonicals = getCanonicalSkillSet(skill);
  return canonicals.values().next().value ?? normalizeSkill(skill);
}

// ---------------------------------------------------------------------------
// Main comparison function
// ---------------------------------------------------------------------------

/**
 * Compare skills from a parsed job description against a normalized resume.
 *
 * Uses deterministic matching:
 * 1. Exact match (case-insensitive)
 * 2. Normalized match (handles plurals, variations)
 * 3. Synonym match (manual curated list)
 *
 * @param jd - Parsed job description with required/preferred skills.
 * @param resume - Normalized resume with categorized skills.
 * @returns Structured comparison result with matched, missing, and extra skills.
 *
 * @example
 * ```ts
 * const result = compareSkills(parsedJD, normalizedResume);
 *
 * console.log(result.matched.required);  // Skills found in resume
 * console.log(result.missing);           // Required skills not in resume
 * console.log(result.extra);             // Resume skills not in JD
 * ```
 */
export function compareSkills(
  jd: Pick<ParsedJobDescription, "requiredSkills" | "preferredSkills">,
  resume: Pick<NormalizedResume, "skills">
): SkillComparisonResult {
  // Flatten all resume skills
  const allResumeSkills = [
    ...resume.skills.technical,
    ...resume.skills.soft,
    ...resume.skills.other,
  ];

  // Build lookup structures for resume skills
  const resumeSkillsNormalized = new Map<string, string>(); // normalized -> original
  const resumeSkillsCanonical = new Map<string, string>(); // canonical -> original
  const resumeCanonicalsToOriginals = new Map<string, Set<string>>(); // canonical -> originals

  for (const skill of allResumeSkills) {
    const normalized = normalizeSkill(skill);
    const canonical = getCanonicalSkill(skill);
    const canonicals = getCanonicalSkillSet(skill);

    resumeSkillsNormalized.set(normalized, skill);
    resumeSkillsCanonical.set(canonical, skill);

    for (const c of canonicals) {
      const set = resumeCanonicalsToOriginals.get(c) ?? new Set<string>();
      set.add(skill);
      resumeCanonicalsToOriginals.set(c, set);
    }
  }

  // Track which resume skills were matched (to find extras)
  const matchedResumeSkills = new Set<string>();

  /**
   * Try to match a JD skill against resume skills.
   */
  function findMatch(jdSkill: string): SkillMatch | null {
    const jdNormalized = normalizeSkill(jdSkill);
    const jdCanonical = getCanonicalSkill(jdSkill);
    const jdCanonicals = getCanonicalSkillSet(jdSkill);

    // 1. Exact match (case-insensitive via normalized)
    const exactMatch = resumeSkillsNormalized.get(jdNormalized);
    if (exactMatch) {
      matchedResumeSkills.add(exactMatch);
      return {
        jdSkill,
        resumeSkill: exactMatch,
        matchType:
          jdNormalized === normalizeSkill(exactMatch) ? "exact" : "normalized",
      };
    }

    // 2. Synonym/canonical match
    const canonicalMatch = resumeSkillsCanonical.get(jdCanonical);
    if (canonicalMatch) {
      matchedResumeSkills.add(canonicalMatch);
      return {
        jdSkill,
        resumeSkill: canonicalMatch,
        matchType: "synonym",
      };
    }

    // 2b. Canonical set overlap (handles compound/versioned skills)
    for (const jdC of jdCanonicals) {
      const originals = resumeCanonicalsToOriginals.get(jdC);
      if (!originals || originals.size === 0) continue;

      const resumeSkill = originals.values().next().value as string;
      matchedResumeSkills.add(resumeSkill);
      return {
        jdSkill,
        resumeSkill,
        matchType: "synonym",
      };
    }

    // 3. Check if any resume skill's canonical matches JD's canonical
    for (const [canonical, original] of resumeSkillsCanonical) {
      if (canonical === jdCanonical) {
        matchedResumeSkills.add(original);
        return {
          jdSkill,
          resumeSkill: original,
          matchType: "synonym",
        };
      }
    }

    return null;
  }

  // Match required skills
  const matchedRequired: SkillMatch[] = [];
  const missing: string[] = [];

  for (const skill of jd.requiredSkills) {
    const match = findMatch(skill);
    if (match) {
      matchedRequired.push(match);
    } else {
      missing.push(skill);
    }
  }

  // Match preferred skills
  const matchedPreferred: SkillMatch[] = [];
  const missingPreferred: string[] = [];

  for (const skill of jd.preferredSkills) {
    const match = findMatch(skill);
    if (match) {
      matchedPreferred.push(match);
    } else {
      missingPreferred.push(skill);
    }
  }

  // Find extra skills (in resume but not in JD)
  const allJdSkills = [...jd.requiredSkills, ...jd.preferredSkills];
  const jdCanonicals = new Set<string>();
  for (const s of allJdSkills) {
    for (const c of getCanonicalSkillSet(s)) jdCanonicals.add(c);
  }

  const extra: string[] = [];
  for (const skill of allResumeSkills) {
    // Skip if already matched
    if (matchedResumeSkills.has(skill)) continue;

    // Check if skill's canonical form is in JD (might have been matched differently)
    const canonicals = getCanonicalSkillSet(skill);
    const overlaps = [...canonicals].some((c) => jdCanonicals.has(c));
    if (!overlaps) {
      extra.push(skill);
    }
  }

  return {
    matched: {
      required: matchedRequired,
      preferred: matchedPreferred,
    },
    missing,
    missingPreferred,
    extra,
    summary: {
      totalRequired: jd.requiredSkills.length,
      totalPreferred: jd.preferredSkills.length,
      matchedRequired: matchedRequired.length,
      matchedPreferred: matchedPreferred.length,
      missingRequired: missing.length,
      missingPreferred: missingPreferred.length,
      extraSkills: extra.length,
    },
  };
}

/**
 * Get a human-readable match summary.
 */
export function getMatchSummaryText(result: SkillComparisonResult): string {
  const { summary } = result;
  const requiredPercent =
    summary.totalRequired > 0
      ? Math.round((summary.matchedRequired / summary.totalRequired) * 100)
      : 100;

  const lines = [
    `Required Skills: ${summary.matchedRequired}/${summary.totalRequired} matched (${requiredPercent}%)`,
    `Preferred Skills: ${summary.matchedPreferred}/${summary.totalPreferred} matched`,
  ];

  if (summary.missingRequired > 0) {
    lines.push(`Missing Required: ${result.missing.join(", ")}`);
  }

  return lines.join("\n");
}
