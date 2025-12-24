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
  /** Resume skills not mentioned in JD (neither required nor preferred). */
  extra: string[];
  /** Summary counts for quick reference. */
  summary: {
    totalRequired: number;
    totalPreferred: number;
    matchedRequired: number;
    matchedPreferred: number;
    missingRequired: number;
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
 * Normalize a skill string for comparison:
 * - Lowercase
 * - Trim whitespace
 * - Remove trailing punctuation
 * - Collapse multiple spaces
 * - Handle common plural forms
 */
function normalizeSkill(skill: string): string {
  let normalized = skill
    .toLowerCase()
    .trim()
    // Remove trailing punctuation
    .replace(/[.,;:!?]+$/, "")
    // Collapse multiple spaces
    .replace(/\s+/g, " ")
    // Remove parenthetical version info like "(v3)" or "(latest)"
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();

  // Handle common plural forms
  if (normalized.endsWith("ies") && normalized.length > 4) {
    // e.g., "technologies" -> keep as-is (too aggressive to change)
  } else if (normalized.endsWith("s") && normalized.length > 2) {
    // Try without trailing 's' for simple plurals
    // But be careful with things like "css", "aws", "kubernetes"
    const withoutS = normalized.slice(0, -1);
    // Only de-pluralize if it's a common English plural pattern
    if (
      !["ss", "us", "is", "as", "os"].some((ending) =>
        normalized.endsWith(ending)
      )
    ) {
      // Check if singular form exists in our synonym map
      if (REVERSE_SYNONYM_MAP.has(withoutS)) {
        normalized = withoutS;
      }
    }
  }

  return normalized;
}

/**
 * Get canonical form of a skill (via synonym map).
 */
function getCanonicalSkill(skill: string): string {
  const normalized = normalizeSkill(skill);
  return REVERSE_SYNONYM_MAP.get(normalized) ?? normalized;
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

  for (const skill of allResumeSkills) {
    const normalized = normalizeSkill(skill);
    const canonical = getCanonicalSkill(skill);

    resumeSkillsNormalized.set(normalized, skill);
    resumeSkillsCanonical.set(canonical, skill);
  }

  // Track which resume skills were matched (to find extras)
  const matchedResumeSkills = new Set<string>();

  /**
   * Try to match a JD skill against resume skills.
   */
  function findMatch(jdSkill: string): SkillMatch | null {
    const jdNormalized = normalizeSkill(jdSkill);
    const jdCanonical = getCanonicalSkill(jdSkill);

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

  for (const skill of jd.preferredSkills) {
    const match = findMatch(skill);
    if (match) {
      matchedPreferred.push(match);
    }
    // Note: we don't track missing preferred skills (by design)
  }

  // Find extra skills (in resume but not in JD)
  const allJdSkills = [...jd.requiredSkills, ...jd.preferredSkills];
  const jdCanonicals = new Set(allJdSkills.map(getCanonicalSkill));

  const extra: string[] = [];
  for (const skill of allResumeSkills) {
    // Skip if already matched
    if (matchedResumeSkills.has(skill)) continue;

    // Check if skill's canonical form is in JD (might have been matched differently)
    const canonical = getCanonicalSkill(skill);
    if (!jdCanonicals.has(canonical)) {
      extra.push(skill);
    }
  }

  return {
    matched: {
      required: matchedRequired,
      preferred: matchedPreferred,
    },
    missing,
    extra,
    summary: {
      totalRequired: jd.requiredSkills.length,
      totalPreferred: jd.preferredSkills.length,
      matchedRequired: matchedRequired.length,
      matchedPreferred: matchedPreferred.length,
      missingRequired: missing.length,
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
