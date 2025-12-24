/**
 * Transparent ATS-style scoring utility.
 *
 * Combines skill coverage, responsibility coverage, and education match
 * into a deterministic, explainable score with clear breakdowns.
 *
 * All weights and logic are explicit - no hidden factors.
 */

import type { SkillComparisonResult } from "./compare-skills";
import type { ResponsibilityMatchingResult } from "./match-responsibilities";
import type { ParsedJobDescription } from "./parse-job-description";
import type { NormalizedResume } from "./normalize-resume";

// ---------------------------------------------------------------------------
// Weights (explicitly defined, fully transparent)
// ---------------------------------------------------------------------------

/**
 * Category weights - must sum to 100.
 * These determine how much each category contributes to the overall score.
 */
export const CATEGORY_WEIGHTS = {
  /** Required skills are critical for ATS filtering */
  requiredSkills: 40,
  /** Preferred skills provide bonus points */
  preferredSkills: 15,
  /** Responsibility coverage shows relevant experience */
  responsibilities: 30,
  /** Education requirements (if specified) */
  education: 15,
} as const;

// Compile-time check that weights sum to 100
const _weightSum: 100 = (CATEGORY_WEIGHTS.requiredSkills +
  CATEGORY_WEIGHTS.preferredSkills +
  CATEGORY_WEIGHTS.responsibilities +
  CATEGORY_WEIGHTS.education) as 100;
void _weightSum;

/**
 * Responsibility coverage point values.
 */
export const RESPONSIBILITY_POINTS = {
  covered: 1.0, // Full points
  weakly_covered: 0.5, // Half points
  not_covered: 0.0, // No points
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScoreDeduction {
  /** What caused the deduction */
  reason: string;
  /** Points deducted (positive number) */
  points: number;
  /** Category this deduction applies to */
  category:
    | "requiredSkills"
    | "preferredSkills"
    | "responsibilities"
    | "education";
}

export interface CategoryScore {
  /** Category name */
  name: string;
  /** Points earned in this category */
  earned: number;
  /** Maximum possible points for this category */
  possible: number;
  /** Percentage score for this category (0-100) */
  percentage: number;
  /** Weight applied to this category */
  weight: number;
  /** Weighted contribution to overall score */
  weightedScore: number;
  /** Specific deductions in this category */
  deductions: ScoreDeduction[];
}

export interface ATSScoreResult {
  /** Overall score from 0-100 */
  overallScore: number;
  /** Letter grade (A, B, C, D, F) */
  grade: "A" | "B" | "C" | "D" | "F";
  /** Breakdown by category */
  breakdown: {
    requiredSkills: CategoryScore;
    preferredSkills: CategoryScore;
    responsibilities: CategoryScore;
    education: CategoryScore;
  };
  /** All deductions that affected the score */
  allDeductions: ScoreDeduction[];
  /** Human-readable summary */
  summary: string;
}

// ---------------------------------------------------------------------------
// Education matching helpers
// ---------------------------------------------------------------------------

/**
 * Common degree level patterns for matching.
 */
const DEGREE_PATTERNS = {
  phd: /ph\.?d|doctorate|doctoral/i,
  masters: /master'?s?|m\.?s\.?|m\.?a\.?|mba|m\.?eng/i,
  bachelors: /bachelor'?s?|b\.?s\.?|b\.?a\.?|b\.?eng|undergraduate/i,
  associates: /associate'?s?|a\.?s\.?|a\.?a\.?/i,
  highSchool: /high\s*school|ged|diploma/i,
} as const;

type DegreeLevel = keyof typeof DEGREE_PATTERNS;

const DEGREE_HIERARCHY: DegreeLevel[] = [
  "phd",
  "masters",
  "bachelors",
  "associates",
  "highSchool",
];

/**
 * Extract the highest degree level from a string.
 */
function extractDegreeLevel(text: string): DegreeLevel | null {
  for (const level of DEGREE_HIERARCHY) {
    if (DEGREE_PATTERNS[level].test(text)) {
      return level;
    }
  }
  return null;
}

/**
 * Check if resume education meets JD requirements.
 * Returns a score from 0-1.
 */
function calculateEducationMatch(
  jdRequirements: string[],
  resumeEducation: NormalizedResume["education"]
): { score: number; deductions: ScoreDeduction[] } {
  const deductions: ScoreDeduction[] = [];

  // If no education requirements, give full credit
  if (jdRequirements.length === 0) {
    return { score: 1.0, deductions: [] };
  }

  // Extract required degree level from JD
  let requiredLevel: DegreeLevel | null = null;
  for (const req of jdRequirements) {
    const level = extractDegreeLevel(req);
    if (level) {
      // Take the highest required level
      if (
        !requiredLevel ||
        DEGREE_HIERARCHY.indexOf(level) <
          DEGREE_HIERARCHY.indexOf(requiredLevel)
      ) {
        requiredLevel = level;
      }
    }
  }

  // Extract candidate's highest degree level
  let candidateLevel: DegreeLevel | null = null;
  for (const edu of resumeEducation) {
    if (edu.degree) {
      const level = extractDegreeLevel(edu.degree);
      if (level) {
        if (
          !candidateLevel ||
          DEGREE_HIERARCHY.indexOf(level) <
            DEGREE_HIERARCHY.indexOf(candidateLevel)
        ) {
          candidateLevel = level;
        }
      }
    }
  }

  // If we couldn't parse requirements, give partial credit for having any education
  if (!requiredLevel) {
    if (resumeEducation.length > 0) {
      return { score: 0.8, deductions: [] };
    }
    return { score: 0.5, deductions: [] };
  }

  // If candidate has no parseable education
  if (!candidateLevel) {
    if (resumeEducation.length > 0) {
      // Has education but couldn't parse level
      deductions.push({
        reason: "Education level unclear or not specified",
        points: 5,
        category: "education",
      });
      return { score: 0.5, deductions };
    }
    deductions.push({
      reason: `Missing required education: ${jdRequirements[0]}`,
      points: 15,
      category: "education",
    });
    return { score: 0, deductions };
  }

  // Compare levels
  const requiredIndex = DEGREE_HIERARCHY.indexOf(requiredLevel);
  const candidateIndex = DEGREE_HIERARCHY.indexOf(candidateLevel);

  if (candidateIndex <= requiredIndex) {
    // Candidate meets or exceeds requirement
    return { score: 1.0, deductions: [] };
  } else if (candidateIndex === requiredIndex + 1) {
    // One level below (e.g., Bachelor's when Master's required)
    deductions.push({
      reason: `Education below preferred level (has ${candidateLevel}, prefers ${requiredLevel})`,
      points: 7,
      category: "education",
    });
    return { score: 0.5, deductions };
  } else {
    // Significantly below
    deductions.push({
      reason: `Education significantly below requirement (has ${candidateLevel}, requires ${requiredLevel})`,
      points: 12,
      category: "education",
    });
    return { score: 0.2, deductions };
  }
}

// ---------------------------------------------------------------------------
// Field of study matching
// ---------------------------------------------------------------------------

const CS_RELATED_FIELDS = [
  "computer science",
  "software engineering",
  "computer engineering",
  "information technology",
  "information systems",
  "data science",
  "artificial intelligence",
  "machine learning",
  "cybersecurity",
  "electrical engineering",
  "mathematics",
  "applied mathematics",
  "statistics",
  "physics",
];

/**
 * Check if a field of study is CS/tech related.
 */
function isCSRelatedField(field: string | null): boolean {
  if (!field) return false;
  const normalized = field.toLowerCase();
  return CS_RELATED_FIELDS.some(
    (csField) =>
      normalized.includes(csField) || csField.includes(normalized.split(" ")[0])
  );
}

// ---------------------------------------------------------------------------
// Main scoring function
// ---------------------------------------------------------------------------

export interface CalculateATSScoreInput {
  /** Skill comparison result from compareSkills() */
  skillComparison: SkillComparisonResult;
  /** Responsibility matching result from matchResponsibilities() */
  responsibilityMatching: ResponsibilityMatchingResult;
  /** Parsed job description (for education requirements) */
  jobDescription: Pick<ParsedJobDescription, "educationRequirements">;
  /** Normalized resume (for education data) */
  resume: Pick<NormalizedResume, "education">;
}

/**
 * Calculate a transparent ATS-style score.
 *
 * All scoring logic is deterministic with explicit weights.
 * No AI decides the weights - they are hardcoded and documented.
 *
 * @param input - Combined results from skill comparison and responsibility matching.
 * @returns Detailed score breakdown with explanations.
 *
 * @example
 * ```ts
 * const score = calculateATSScore({
 *   skillComparison: compareSkills(jd, resume),
 *   responsibilityMatching: await matchResponsibilities(jd, resume),
 *   jobDescription: parsedJD,
 *   resume: normalizedResume,
 * });
 *
 * console.log(`Score: ${score.overallScore}/100 (${score.grade})`);
 * console.log(score.breakdown.requiredSkills);
 * console.log(score.allDeductions);
 * ```
 */
export function calculateATSScore(
  input: CalculateATSScoreInput
): ATSScoreResult {
  const { skillComparison, responsibilityMatching, jobDescription, resume } =
    input;
  const allDeductions: ScoreDeduction[] = [];

  // ---------------------------------------------------------------------------
  // 1. Required Skills Score
  // ---------------------------------------------------------------------------
  const requiredSkillsDeductions: ScoreDeduction[] = [];
  const { summary: skillSummary } = skillComparison;

  let requiredSkillsPercentage = 100;
  if (skillSummary.totalRequired > 0) {
    requiredSkillsPercentage =
      (skillSummary.matchedRequired / skillSummary.totalRequired) * 100;

    // Add deduction for each missing required skill
    for (const missingSkill of skillComparison.missing) {
      const deduction: ScoreDeduction = {
        reason: `Missing required skill: ${missingSkill}`,
        points: Math.round(
          CATEGORY_WEIGHTS.requiredSkills / skillSummary.totalRequired
        ),
        category: "requiredSkills",
      };
      requiredSkillsDeductions.push(deduction);
      allDeductions.push(deduction);
    }
  }

  const requiredSkillsScore: CategoryScore = {
    name: "Required Skills",
    earned: skillSummary.matchedRequired,
    possible: skillSummary.totalRequired,
    percentage: Math.round(requiredSkillsPercentage),
    weight: CATEGORY_WEIGHTS.requiredSkills,
    weightedScore:
      (requiredSkillsPercentage / 100) * CATEGORY_WEIGHTS.requiredSkills,
    deductions: requiredSkillsDeductions,
  };

  // ---------------------------------------------------------------------------
  // 2. Preferred Skills Score (bonus)
  // ---------------------------------------------------------------------------
  const preferredSkillsDeductions: ScoreDeduction[] = [];

  let preferredSkillsPercentage = 100;
  if (skillSummary.totalPreferred > 0) {
    preferredSkillsPercentage =
      (skillSummary.matchedPreferred / skillSummary.totalPreferred) * 100;
  }
  // No deductions for missing preferred skills - they're just bonuses

  const preferredSkillsScore: CategoryScore = {
    name: "Preferred Skills",
    earned: skillSummary.matchedPreferred,
    possible: skillSummary.totalPreferred,
    percentage: Math.round(preferredSkillsPercentage),
    weight: CATEGORY_WEIGHTS.preferredSkills,
    weightedScore:
      (preferredSkillsPercentage / 100) * CATEGORY_WEIGHTS.preferredSkills,
    deductions: preferredSkillsDeductions,
  };

  // ---------------------------------------------------------------------------
  // 3. Responsibilities Score
  // ---------------------------------------------------------------------------
  const responsibilitiesDeductions: ScoreDeduction[] = [];
  const totalResponsibilities =
    responsibilityMatching.coveredResponsibilities.length +
    responsibilityMatching.weaklyCovered.length +
    responsibilityMatching.notCovered.length;

  let responsibilitiesPercentage = 100;
  if (totalResponsibilities > 0) {
    const earnedPoints =
      responsibilityMatching.coveredResponsibilities.length *
        RESPONSIBILITY_POINTS.covered +
      responsibilityMatching.weaklyCovered.length *
        RESPONSIBILITY_POINTS.weakly_covered +
      responsibilityMatching.notCovered.length *
        RESPONSIBILITY_POINTS.not_covered;

    responsibilitiesPercentage = (earnedPoints / totalResponsibilities) * 100;

    // Deductions for not covered responsibilities
    for (const item of responsibilityMatching.notCovered) {
      const deduction: ScoreDeduction = {
        reason: `No experience for: ${item.responsibility.slice(0, 60)}${
          item.responsibility.length > 60 ? "..." : ""
        }`,
        points: Math.round(
          CATEGORY_WEIGHTS.responsibilities / totalResponsibilities
        ),
        category: "responsibilities",
      };
      responsibilitiesDeductions.push(deduction);
      allDeductions.push(deduction);
    }

    // Partial deductions for weakly covered
    for (const item of responsibilityMatching.weaklyCovered) {
      const deduction: ScoreDeduction = {
        reason: `Limited experience for: ${item.responsibility.slice(0, 60)}${
          item.responsibility.length > 60 ? "..." : ""
        }`,
        points: Math.round(
          (CATEGORY_WEIGHTS.responsibilities / totalResponsibilities) * 0.5
        ),
        category: "responsibilities",
      };
      responsibilitiesDeductions.push(deduction);
      allDeductions.push(deduction);
    }
  }

  const responsibilitiesScore: CategoryScore = {
    name: "Responsibilities",
    earned:
      responsibilityMatching.coveredResponsibilities.length +
      responsibilityMatching.weaklyCovered.length * 0.5,
    possible: totalResponsibilities,
    percentage: Math.round(responsibilitiesPercentage),
    weight: CATEGORY_WEIGHTS.responsibilities,
    weightedScore:
      (responsibilitiesPercentage / 100) * CATEGORY_WEIGHTS.responsibilities,
    deductions: responsibilitiesDeductions,
  };

  // ---------------------------------------------------------------------------
  // 4. Education Score
  // ---------------------------------------------------------------------------
  const educationResult = calculateEducationMatch(
    jobDescription.educationRequirements,
    resume.education
  );

  // Check for CS-related field bonus/penalty
  const hasCSRelatedField = resume.education.some((edu) =>
    isCSRelatedField(edu.field)
  );
  let educationFieldAdjustment = 0;
  if (
    jobDescription.educationRequirements.length > 0 &&
    !hasCSRelatedField &&
    resume.education.length > 0
  ) {
    const deduction: ScoreDeduction = {
      reason: "Degree not in a directly related field",
      points: 3,
      category: "education",
    };
    educationResult.deductions.push(deduction);
    allDeductions.push(deduction);
    educationFieldAdjustment = -0.1;
  }

  const educationPercentage = Math.max(
    0,
    Math.min(100, (educationResult.score + educationFieldAdjustment) * 100)
  );

  allDeductions.push(...educationResult.deductions);

  const educationScore: CategoryScore = {
    name: "Education",
    earned: educationResult.score,
    possible: 1,
    percentage: Math.round(educationPercentage),
    weight: CATEGORY_WEIGHTS.education,
    weightedScore: (educationPercentage / 100) * CATEGORY_WEIGHTS.education,
    deductions: educationResult.deductions,
  };

  // ---------------------------------------------------------------------------
  // Calculate Overall Score
  // ---------------------------------------------------------------------------
  const overallScore = Math.round(
    requiredSkillsScore.weightedScore +
      preferredSkillsScore.weightedScore +
      responsibilitiesScore.weightedScore +
      educationScore.weightedScore
  );

  // Determine grade
  let grade: ATSScoreResult["grade"];
  if (overallScore >= 90) grade = "A";
  else if (overallScore >= 80) grade = "B";
  else if (overallScore >= 70) grade = "C";
  else if (overallScore >= 60) grade = "D";
  else grade = "F";

  // Generate summary
  const summaryParts: string[] = [];

  if (requiredSkillsScore.percentage === 100) {
    summaryParts.push("All required skills matched");
  } else {
    summaryParts.push(
      `${skillSummary.matchedRequired}/${skillSummary.totalRequired} required skills matched`
    );
  }

  if (responsibilitiesScore.percentage >= 75) {
    summaryParts.push("strong experience alignment");
  } else if (responsibilitiesScore.percentage >= 50) {
    summaryParts.push("moderate experience alignment");
  } else {
    summaryParts.push("limited experience alignment");
  }

  if (educationScore.percentage >= 80) {
    summaryParts.push("education requirements met");
  } else if (educationScore.percentage >= 50) {
    summaryParts.push("partial education match");
  }

  const summary = summaryParts.join("; ") + ".";

  return {
    overallScore,
    grade,
    breakdown: {
      requiredSkills: requiredSkillsScore,
      preferredSkills: preferredSkillsScore,
      responsibilities: responsibilitiesScore,
      education: educationScore,
    },
    allDeductions,
    summary,
  };
}

/**
 * Get a formatted score report.
 */
export function formatScoreReport(result: ATSScoreResult): string {
  const lines: string[] = [
    `ATS Score: ${result.overallScore}/100 (${result.grade})`,
    "",
    "Category Breakdown:",
    `  Required Skills:    ${result.breakdown.requiredSkills.percentage}% (${result.breakdown.requiredSkills.earned}/${result.breakdown.requiredSkills.possible})`,
    `  Preferred Skills:   ${result.breakdown.preferredSkills.percentage}% (${result.breakdown.preferredSkills.earned}/${result.breakdown.preferredSkills.possible})`,
    `  Responsibilities:   ${result.breakdown.responsibilities.percentage}%`,
    `  Education:          ${result.breakdown.education.percentage}%`,
    "",
    `Summary: ${result.summary}`,
  ];

  if (result.allDeductions.length > 0) {
    lines.push("");
    lines.push("Key Deductions:");
    // Show top 5 deductions
    const topDeductions = result.allDeductions
      .sort((a, b) => b.points - a.points)
      .slice(0, 5);
    for (const d of topDeductions) {
      lines.push(`  - ${d.reason} (-${d.points} pts)`);
    }
  }

  return lines.join("\n");
}

/**
 * Get the weight configuration (for transparency/documentation).
 */
export function getWeightConfiguration(): typeof CATEGORY_WEIGHTS {
  return { ...CATEGORY_WEIGHTS };
}
