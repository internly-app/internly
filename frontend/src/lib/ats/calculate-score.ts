/**
 * ATS Score Calculator
 *
 * Scoring Philosophy:
 * - Start at 100 points
 * - Each deduction is explicit and traceable
 * - No double-counting: each issue only reduces the score once
 * - Deductions sum exactly to (100 - overallScore)
 *
 * Category Weight Caps (maximum points that can be lost per category):
 * - Required Skills: 40 points max
 * - Preferred Skills: 15 points max
 * - Responsibilities/Experience: 30 points max
 * - Education: 15 points max
 */

import type { ParsedJobDescription } from "./parse-job-description";
import type { NormalizedResume, EducationEntry } from "./normalize-resume";
import type { SkillComparisonResult } from "./compare-skills";
import type { ResponsibilityMatchingResult } from "./match-responsibilities";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScoreDeduction {
  reason: string;
  points: number;
  category:
    | "requiredSkills"
    | "preferredSkills"
    | "responsibilities"
    | "education";
}

export interface ResponsibilityScoreMatch {
  responsibility: string;
  status: "covered" | "partially_covered" | "not_covered";
  matchedExperience?: string;
}

export interface CategoryScores {
  requiredSkills: {
    score: number;
    maxScore: number;
    matchedSkills: string[];
    missingSkills: string[];
  };
  preferredSkills: {
    score: number;
    maxScore: number;
    matchedSkills: string[];
    missingSkills: string[];
  };
  responsibilities: {
    score: number;
    maxScore: number;
    matches: ResponsibilityScoreMatch[];
  };
  education: {
    score: number;
    maxScore: number;
    meetsRequirements: boolean;
    details: string;
  };
}

export interface CategoryBreakdown {
  name: string;
  percentage: number;
  weight: number;
  weightedScore: number;
}

export interface ATSScoreResult {
  overallScore: number;
  grade: string;
  summary: string;
  categoryScores: CategoryScores;
  deductions: ScoreDeduction[];
  // Legacy fields for backward compatibility
  breakdown: Record<string, CategoryBreakdown>;
  allDeductions: ScoreDeduction[];
}

// Input type for calculateATSScore
interface ScoreInput {
  skillComparison: SkillComparisonResult;
  responsibilityMatching: ResponsibilityMatchingResult;
  jobDescription: ParsedJobDescription;
  resume: NormalizedResume;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Category weight caps - maximum points that can be lost per category
const CATEGORY_CAPS = {
  requiredSkills: 40,
  preferredSkills: 15,
  responsibilities: 30,
  education: 15,
} as const;

// Per-item deduction amounts
const DEDUCTION_PER_MISSING_REQUIRED_SKILL = 8; // With cap of 40, allows ~5 missing skills to hit max
const DEDUCTION_PER_MISSING_RESPONSIBILITY = 6; // With cap of 30, allows ~5 missing to hit max

// CS-related fields for education matching
const CS_RELATED_FIELDS = [
  "computer science",
  "software engineering",
  "computer engineering",
  "information technology",
  "information systems",
  "data science",
  "cybersecurity",
  "artificial intelligence",
  "machine learning",
  "web development",
  "programming",
  "computing",
  "informatics",
  "electrical engineering",
  "mathematics",
  "applied mathematics",
  "statistics",
  "physics",
  "engineering",
  "management engineering",
  "applied science", // Bachelor of Applied Science (BASc) - common in engineering/tech programs
  "systems design",
  "system design",
  "systems engineering",
];

// ---------------------------------------------------------------------------
// Main Scoring Function
// ---------------------------------------------------------------------------

/**
 * Calculate ATS score from pre-computed skill comparison and responsibility matching.
 *
 * The score is calculated by starting at 100 and subtracting deductions.
 * Each deduction is explicit and traceable - no hidden category penalties.
 */
export function calculateATSScore(input: ScoreInput): ATSScoreResult {
  const { skillComparison, responsibilityMatching, jobDescription, resume } =
    input;
  const allDeductions: ScoreDeduction[] = [];

  // 1. Required Skills Analysis
  const requiredSkillsResult = analyzeRequiredSkills(skillComparison);
  allDeductions.push(...requiredSkillsResult.deductions);

  // 2. Preferred Skills Analysis (category-level only, no itemized deductions)
  const preferredSkillsResult = analyzePreferredSkills(skillComparison);
  allDeductions.push(...preferredSkillsResult.deductions);

  // 3. Responsibilities/Experience Analysis
  const responsibilitiesResult = analyzeResponsibilities(
    responsibilityMatching
  );
  allDeductions.push(...responsibilitiesResult.deductions);

  // 4. Education Analysis (max one deduction)
  const educationResult = analyzeEducation(resume, jobDescription);
  allDeductions.push(...educationResult.deductions);

  // Calculate final score
  const totalDeductions = allDeductions.reduce((sum, d) => sum + d.points, 0);
  const overallScore = Math.max(0, 100 - totalDeductions);

  // Build category scores for UI display
  // Handle edge case: if no required skills exist, score should be N/A (represented as -1)
  const hasRequiredSkills = skillComparison.summary.totalRequired > 0;
  const hasPreferredSkills = skillComparison.summary.totalPreferred > 0;

  const categoryScores: CategoryScores = {
    requiredSkills: {
      score: hasRequiredSkills
        ? Math.max(
            0,
            100 -
              (requiredSkillsResult.categoryLoss /
                CATEGORY_CAPS.requiredSkills) *
                100
          )
        : -1, // -1 indicates N/A (no required skills in JD)
      maxScore: 100,
      matchedSkills: skillComparison.matched.required.map((m) => m.jdSkill),
      missingSkills: skillComparison.missing,
    },
    preferredSkills: {
      score: hasPreferredSkills
        ? Math.max(
            0,
            100 -
              (preferredSkillsResult.categoryLoss /
                CATEGORY_CAPS.preferredSkills) *
                100
          )
        : -1, // -1 indicates N/A (no preferred skills in JD)
      maxScore: 100,
      matchedSkills: skillComparison.matched.preferred.map((m) => m.jdSkill),
      missingSkills: skillComparison.missingPreferred,
    },
    responsibilities: {
      score: Math.max(
        0,
        100 -
          (responsibilitiesResult.categoryLoss /
            CATEGORY_CAPS.responsibilities) *
            100
      ),
      maxScore: 100,
      matches: responsibilitiesResult.matches,
    },
    education: {
      score: Math.max(
        0,
        100 - (educationResult.categoryLoss / CATEGORY_CAPS.education) * 100
      ),
      maxScore: 100,
      meetsRequirements: educationResult.meetsRequirements,
      details: educationResult.details,
    },
  };

  // Log for debugging
  if (process.env.NODE_ENV === "development") {
    console.log("[ATS Score]", {
      overallScore,
      totalDeductions,
      deductionCount: allDeductions.length,
    });
  }

  // Compute grade based on score
  const grade = getGrade(overallScore);

  // Generate summary
  const summary = generateSummary(overallScore, allDeductions, categoryScores);

  // Build legacy breakdown for backward compatibility
  // Handle N/A scores (-1) by showing them as -1 in percentage (UI will handle display)
  const breakdown: Record<string, CategoryBreakdown> = {
    requiredSkills: {
      name: "Required Skills",
      percentage:
        categoryScores.requiredSkills.score === -1
          ? -1
          : Math.round(categoryScores.requiredSkills.score),
      weight: CATEGORY_CAPS.requiredSkills,
      weightedScore:
        categoryScores.requiredSkills.score === -1
          ? CATEGORY_CAPS.requiredSkills // Full points when N/A
          : Math.round(
              (categoryScores.requiredSkills.score / 100) *
                CATEGORY_CAPS.requiredSkills
            ),
    },
    preferredSkills: {
      name: "Preferred Skills",
      percentage:
        categoryScores.preferredSkills.score === -1
          ? -1
          : Math.round(categoryScores.preferredSkills.score),
      weight: CATEGORY_CAPS.preferredSkills,
      weightedScore:
        categoryScores.preferredSkills.score === -1
          ? CATEGORY_CAPS.preferredSkills // Full points when N/A
          : Math.round(
              (categoryScores.preferredSkills.score / 100) *
                CATEGORY_CAPS.preferredSkills
            ),
    },
    responsibilities: {
      name: "Experience Alignment",
      percentage: Math.round(categoryScores.responsibilities.score),
      weight: CATEGORY_CAPS.responsibilities,
      weightedScore: Math.round(
        (categoryScores.responsibilities.score / 100) *
          CATEGORY_CAPS.responsibilities
      ),
    },
    education: {
      name: "Education",
      percentage: Math.round(categoryScores.education.score),
      weight: CATEGORY_CAPS.education,
      weightedScore: Math.round(
        (categoryScores.education.score / 100) * CATEGORY_CAPS.education
      ),
    },
  };

  return {
    overallScore,
    grade,
    summary,
    categoryScores,
    deductions: allDeductions,
    // Legacy fields
    breakdown,
    allDeductions,
  };
}

// ---------------------------------------------------------------------------
// Category Analysis Functions
// ---------------------------------------------------------------------------

/**
 * Required Skills Analysis
 * - One deduction per missing required skill
 * - Capped at CATEGORY_CAPS.requiredSkills total
 * - Includes context about related skills the resume DOES have
 */
function analyzeRequiredSkills(skillComparison: SkillComparisonResult): {
  deductions: ScoreDeduction[];
  categoryLoss: number;
} {
  const deductions: ScoreDeduction[] = [];
  let runningTotal = 0;

  // Build list of all resume skills we matched for context
  const matchedResumeSkills = [
    ...skillComparison.matched.required.map((m) => m.resumeSkill),
    ...skillComparison.matched.preferred.map((m) => m.resumeSkill),
  ];

  // Calculate deductions for missing skills, respecting cap
  for (const skill of skillComparison.missing) {
    const deductionAmount = Math.min(
      DEDUCTION_PER_MISSING_REQUIRED_SKILL,
      CATEGORY_CAPS.requiredSkills - runningTotal
    );

    if (deductionAmount > 0) {
      // Find related skills the candidate DOES have for better feedback
      const relatedSkills = findRelatedSkills(skill, matchedResumeSkills);
      const reason =
        relatedSkills.length > 0
          ? `Missing required skill: ${skill} (you have related: ${relatedSkills
              .slice(0, 2)
              .join(", ")})`
          : `Missing required skill: ${skill}`;

      deductions.push({
        reason,
        points: deductionAmount,
        category: "requiredSkills",
      });
      runningTotal += deductionAmount;
    }

    if (runningTotal >= CATEGORY_CAPS.requiredSkills) break;
  }

  return {
    deductions,
    categoryLoss: runningTotal,
  };
}

/**
 * Find related skills in the resume that might be relevant to a missing skill.
 * Uses simple heuristics to find skills in the same category/ecosystem.
 */
function findRelatedSkills(
  missingSkill: string,
  resumeSkills: string[]
): string[] {
  const missing = missingSkill.toLowerCase();
  const related: string[] = [];

  // Define skill categories for finding related skills
  const skillCategories: Record<string, string[]> = {
    // Frontend frameworks
    frontend: ["react", "vue", "angular", "svelte", "next", "nuxt", "gatsby"],
    // Backend frameworks
    backend: [
      "node",
      "express",
      "django",
      "flask",
      "fastapi",
      "spring",
      "rails",
      "laravel",
      "nest",
    ],
    // Languages
    languages: [
      "javascript",
      "typescript",
      "python",
      "java",
      "c#",
      "go",
      "rust",
      "ruby",
      "php",
      "kotlin",
      "swift",
    ],
    // Databases
    databases: [
      "postgresql",
      "mysql",
      "mongodb",
      "redis",
      "elasticsearch",
      "dynamodb",
      "sqlite",
      "sql server",
    ],
    // Cloud
    cloud: [
      "aws",
      "gcp",
      "azure",
      "heroku",
      "vercel",
      "netlify",
      "digitalocean",
    ],
    // DevOps/Containers
    devops: [
      "docker",
      "kubernetes",
      "terraform",
      "ansible",
      "jenkins",
      "github actions",
      "gitlab ci",
      "ci/cd",
    ],
    // Testing
    testing: [
      "jest",
      "mocha",
      "pytest",
      "junit",
      "cypress",
      "playwright",
      "selenium",
    ],
    // Mobile
    mobile: ["react native", "flutter", "swift", "kotlin", "ios", "android"],
    // Data/ML
    data: [
      "pandas",
      "numpy",
      "tensorflow",
      "pytorch",
      "scikit-learn",
      "machine learning",
      "data science",
    ],
  };

  // Find which category the missing skill belongs to
  let missingCategory: string | null = null;
  for (const [category, skills] of Object.entries(skillCategories)) {
    if (skills.some((s) => missing.includes(s) || s.includes(missing))) {
      missingCategory = category;
      break;
    }
  }

  if (!missingCategory) return [];

  // Find resume skills in the same category
  const categorySkills = skillCategories[missingCategory];
  for (const resumeSkill of resumeSkills) {
    const resume = resumeSkill.toLowerCase();
    if (categorySkills.some((s) => resume.includes(s) || s.includes(resume))) {
      // Don't include the missing skill itself
      if (!resume.includes(missing) && !missing.includes(resume)) {
        related.push(resumeSkill);
      }
    }
  }

  return related;
}

/**
 * Preferred Skills Analysis
 * - NO itemized deductions (user requested)
 * - Only a single category-level deduction based on match percentage
 * - Capped at CATEGORY_CAPS.preferredSkills
 */
function analyzePreferredSkills(skillComparison: SkillComparisonResult): {
  deductions: ScoreDeduction[];
  categoryLoss: number;
} {
  const deductions: ScoreDeduction[] = [];

  const totalPreferred = skillComparison.summary.totalPreferred;
  if (totalPreferred === 0) {
    return { deductions, categoryLoss: 0 };
  }

  const matchedPreferred = skillComparison.summary.matchedPreferred;
  const matchPercentage = matchedPreferred / totalPreferred;
  const categoryLoss = Math.round(
    (1 - matchPercentage) * CATEGORY_CAPS.preferredSkills
  );

  if (categoryLoss > 0) {
    deductions.push({
      reason: `Preferred skills: ${matchedPreferred}/${totalPreferred} matched`,
      points: categoryLoss,
      category: "preferredSkills",
    });
  }

  return {
    deductions,
    categoryLoss,
  };
}

/**
 * Responsibilities/Experience Analysis
 * - Deduct for ALL missing or partially covered responsibilities
 * - Only skip: learning-oriented soft skills and preferred traits
 * - Be strict! Users need actionable feedback to improve
 * - Each responsibility can only cause one deduction
 * - Capped at CATEGORY_CAPS.responsibilities
 */
function analyzeResponsibilities(
  responsibilityMatching: ResponsibilityMatchingResult
): {
  deductions: ScoreDeduction[];
  categoryLoss: number;
  matches: ResponsibilityScoreMatch[];
} {
  const deductions: ScoreDeduction[] = [];
  const matches: ResponsibilityScoreMatch[] = [];
  let runningTotal = 0;

  // Process covered responsibilities
  for (const r of responsibilityMatching.coveredResponsibilities) {
    matches.push({
      responsibility: r.responsibility,
      status: "covered",
      matchedExperience: r.explanation,
    });
  }

  // Process weakly covered responsibilities
  for (const r of responsibilityMatching.weaklyCovered) {
    matches.push({
      responsibility: r.responsibility,
      status: "partially_covered",
      matchedExperience: r.explanation,
    });

    // Skip preferred traits - they should not trigger deductions
    if (isPreferredTrait(r.responsibility)) {
      continue;
    }

    // Skip behavioral/learning expectations
    if (isLearningOrientedResponsibility(r.responsibility)) {
      continue;
    }

    // Deduct for partial coverage - we want to be strict
    // Partial match = half the deduction of missing
    const deductionAmount = Math.min(
      Math.floor(DEDUCTION_PER_MISSING_RESPONSIBILITY / 2),
      CATEGORY_CAPS.responsibilities - runningTotal
    );
    if (deductionAmount > 0) {
      deductions.push({
        reason: `Partial experience match: ${truncateText(
          r.responsibility,
          50
        )}`,
        points: deductionAmount,
        category: "responsibilities",
      });
      runningTotal += deductionAmount;
    }
  }

  // Process not covered responsibilities
  for (const r of responsibilityMatching.notCovered) {
    matches.push({
      responsibility: r.responsibility,
      status: "not_covered",
      matchedExperience: undefined,
    });

    // Skip behavioral/learning expectations - these are soft skills, not hard requirements
    if (isLearningOrientedResponsibility(r.responsibility)) {
      continue;
    }

    // Skip preferred traits - they should not trigger deductions
    if (isPreferredTrait(r.responsibility)) {
      continue;
    }

    // Deduct for missing responsibilities - be strict!
    // Only skip soft skills and preferred traits, everything else matters
    const deductionAmount = Math.min(
      DEDUCTION_PER_MISSING_RESPONSIBILITY,
      CATEGORY_CAPS.responsibilities - runningTotal
    );
    if (deductionAmount > 0) {
      deductions.push({
        reason: `Missing experience: ${truncateText(r.responsibility, 50)}`,
        points: deductionAmount,
        category: "responsibilities",
      });
      runningTotal += deductionAmount;
    }

    if (runningTotal >= CATEGORY_CAPS.responsibilities) break;
  }

  return {
    deductions,
    categoryLoss: runningTotal,
    matches,
  };
}

/**
 * Education Analysis
 * - At most ONE deduction for education
 * - Management Engineering counts as CS-related for software roles
 * - Capped at CATEGORY_CAPS.education
 */
function analyzeEducation(
  resume: NormalizedResume,
  jobDescription: ParsedJobDescription
): {
  deductions: ScoreDeduction[];
  categoryLoss: number;
  meetsRequirements: boolean;
  details: string;
} {
  const deductions: ScoreDeduction[] = [];

  // If no education requirements, full points
  const eduReqs = jobDescription.educationRequirements || [];
  if (eduReqs.length === 0) {
    return {
      deductions,
      categoryLoss: 0,
      meetsRequirements: true,
      details: "No specific education requirements",
    };
  }

  // If no education on resume
  const resumeEducation = resume.education || [];
  if (resumeEducation.length === 0) {
    deductions.push({
      reason: "No education listed on resume",
      points: CATEGORY_CAPS.education,
      category: "education",
    });
    return {
      deductions,
      categoryLoss: CATEGORY_CAPS.education,
      meetsRequirements: false,
      details: "No education information provided",
    };
  }

  // Check education requirements
  const reqText = eduReqs.join(" ").toLowerCase();
  const isSoftwareRole = isSoftwareEngineeringRole(jobDescription);

  // Check if resume education meets requirements
  let bestMatch = { level: 0, fieldMatch: false, details: "" };

  for (const edu of resumeEducation) {
    const eduText = buildEducationText(edu);

    // Determine degree level
    const level = getDegreeLevel(eduText);

    // Check field match
    const fieldMatch = isFieldMatch(
      (edu.field || "").toLowerCase(),
      reqText,
      isSoftwareRole
    );

    if (
      level > bestMatch.level ||
      (level === bestMatch.level && fieldMatch && !bestMatch.fieldMatch)
    ) {
      bestMatch = {
        level,
        fieldMatch,
        details: `${edu.degree || "Degree"} in ${
          edu.field || "unspecified field"
        } from ${edu.institution || "institution"}`,
      };
    }
  }

  // Determine required degree level
  const requiredLevel = getRequiredDegreeLevel(reqText);

  // Calculate education score
  if (bestMatch.level >= requiredLevel && bestMatch.fieldMatch) {
    // Fully meets requirements
    return {
      deductions,
      categoryLoss: 0,
      meetsRequirements: true,
      details: bestMatch.details,
    };
  } else if (bestMatch.level >= requiredLevel) {
    // Degree level OK but field doesn't match
    const loss = Math.round(CATEGORY_CAPS.education * 0.5);
    deductions.push({
      reason: "Degree field does not match job requirements",
      points: loss,
      category: "education",
    });
    return {
      deductions,
      categoryLoss: loss,
      meetsRequirements: false,
      details: `${bestMatch.details} (field mismatch)`,
    };
  } else if (bestMatch.fieldMatch) {
    // Field matches but degree level insufficient
    const loss = Math.round(CATEGORY_CAPS.education * 0.5);
    deductions.push({
      reason: "Degree level below job requirements",
      points: loss,
      category: "education",
    });
    return {
      deductions,
      categoryLoss: loss,
      meetsRequirements: false,
      details: `${bestMatch.details} (level below requirement)`,
    };
  } else {
    // Neither matches
    deductions.push({
      reason: "Education does not meet job requirements",
      points: CATEGORY_CAPS.education,
      category: "education",
    });
    return {
      deductions,
      categoryLoss: CATEGORY_CAPS.education,
      meetsRequirements: false,
      details: `${bestMatch.details} (does not meet requirements)`,
    };
  }
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Check if responsibility is just a learning/behavioral expectation
 */
function isLearningOrientedResponsibility(resp: string): boolean {
  const respLower = resp.toLowerCase();
  const learningPatterns = [
    /^(learn|grow|develop|improve)\s+(new\s+)?skills?/i,
    /^learn\s+quickly/i,
    /willing\s+to\s+learn/i,
    /eager\s+to\s+(learn|grow)/i,
    /continuous\s+(learning|improvement)/i,
    /stay\s+(up[- ]to[- ]date|current)/i,
    /team\s+player/i,
    /strong\s+(communication|interpersonal)/i,
    /attention\s+to\s+detail/i,
    /self[- ]motivated/i,
    /work\s+independently/i,
    /collaborate\s+with\s+team/i,
    /fast[- ]paced\s+environment/i,
    /problem[- ]solving\s+skills/i,
    /ask\s+(good\s+)?questions/i,
    /growth\s+mindset/i,
    /adaptable/i,
    /flexible/i,
    /positive\s+attitude/i,
    /take\s+initiative/i,
    /proactive/i,
  ];

  return learningPatterns.some((pattern) => pattern.test(respLower));
}

/**
 * Check if responsibility explicitly requires prior experience
 * These are hard requirements that SHOULD generate deductions if missing.
 */
function isExplicitExperienceRequirement(resp: string): boolean {
  const respLower = resp.toLowerCase();
  const experiencePatterns = [
    /\b(must|required|proven|demonstrated)\b.*\b(experience|expertise)\b/i,
    /\bexperience\s+(with|in|using)\b/i,
    /\bhands[- ]on\s+experience\b/i,
    /\bprior\s+experience\b/i,
    /\bprofessional\s+experience\b/i,
    /\b\d+\+?\s*years?\s+(of\s+)?experience\b/i,
    /\btrack\s+record\b/i,
    /\bbackground\s+in\b/i,
    /\bworked\s+(with|on)\b/i,
    /\bbuilt\b.*\b(applications?|systems?|products?)\b/i,
    /\bdeveloped\b.*\b(applications?|software|systems?)\b/i,
  ];

  // Don't treat preferred traits as explicit requirements
  if (isPreferredTrait(resp)) {
    return false;
  }

  return experiencePatterns.some((pattern) => pattern.test(respLower));
}

/**
 * Check if responsibility is a "preferred" or "nice to have" trait.
 * These should NOT generate deductions if missing - only guidance.
 *
 * Examples:
 * - "Interest in machine learning"
 * - "Exposure to cloud technologies"
 * - "Familiarity with agile methodologies"
 * - "Nice to have: experience with Docker"
 * - "Bonus: knowledge of AWS"
 */
function isPreferredTrait(resp: string): boolean {
  const respLower = resp.toLowerCase();
  const preferredPatterns = [
    // Interest/exposure language
    /\binterest\s+in\b/i,
    /\bexposure\s+to\b/i,
    /\bfamiliarity\s+with\b/i,
    /\bfamiliar\s+with\b/i,
    /\bawareness\s+of\b/i,

    // Explicit "nice to have" markers
    /\bnice\s+to\s+have\b/i,
    /\bbonus\b/i,
    /\bplus\b/i,
    /\bpreferred\b/i,
    /\bdesirable\b/i,
    /\badvantage\b/i,
    /\bnot\s+required\b/i,

    // Soft interest indicators
    /\bpassion\s+for\b/i,
    /\benthusiasm\s+for\b/i,
    /\bcuriosity\s+about\b/i,
    /\bwillingness\s+to\s+explore\b/i,
    /\bopenness\s+to\b/i,

    // Optional experience language
    /\bsome\s+experience\b/i,
    /\bbasic\s+(knowledge|understanding)\b/i,
    /\bgeneral\s+understanding\b/i,
  ];

  return preferredPatterns.some((pattern) => pattern.test(respLower));
}

/**
 * Check if this is a software engineering role
 */
function isSoftwareEngineeringRole(jd: ParsedJobDescription): boolean {
  const softwareKeywords = [
    "software",
    "developer",
    "engineer",
    "programming",
    "coding",
    "frontend",
    "backend",
    "full stack",
    "web",
    "mobile",
    "devops",
    "sre",
    "data engineer",
    "computer science",
    "computer engineering",
  ];

  const jdText = `${(jd.requiredSkills || []).join(" ")} ${(
    jd.responsibilities || []
  ).join(" ")} ${(jd.educationRequirements || []).join(" ")}`.toLowerCase();

  return softwareKeywords.some((kw) => jdText.includes(kw));
}

/**
 * Check if education field matches requirements
 * Both field and requirements should be pre-lowercased.
 */
function isFieldMatch(
  field: string,
  requirements: string,
  isSoftwareRole: boolean
): boolean {
  // Direct field mention
  if (requirements.includes(field) && field.length > 0) {
    return true;
  }

  // For software roles, check CS-related fields
  if (isSoftwareRole) {
    const hasRelatedRequirement =
      requirements.includes("computer") ||
      requirements.includes("software") ||
      requirements.includes("engineering") ||
      requirements.includes("technical") ||
      requirements.includes("related field") ||
      requirements.includes("stem");

    if (hasRelatedRequirement && isCSRelatedField(field)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if field is CS-related
 */
function isCSRelatedField(field: string): boolean {
  const fieldLower = field.toLowerCase();
  return CS_RELATED_FIELDS.some(
    (csField) => fieldLower.includes(csField) || csField.includes(fieldLower)
  );
}

/**
 * Build education text for degree level detection
 */
function buildEducationText(edu: EducationEntry): string {
  return `${edu.degree || ""} ${edu.field || ""} ${
    edu.institution || ""
  }`.toLowerCase();
}

/**
 * Get degree level (higher = better)
 */
function getDegreeLevel(eduText: string): number {
  const text = eduText.toLowerCase();

  if (
    text.includes("phd") ||
    text.includes("doctorate") ||
    text.includes("doctoral")
  ) {
    return 5;
  }
  if (
    text.includes("master") ||
    text.includes("mba") ||
    text.includes("m.s.") ||
    text.includes("m.a.") ||
    text.includes("msc") ||
    text.includes("meng")
  ) {
    return 4;
  }
  if (
    text.includes("bachelor") ||
    text.includes("b.s.") ||
    text.includes("b.a.") ||
    text.includes("b.eng") ||
    text.includes("basc") || // Bachelor of Applied Science
    text.includes("bsc") || // Bachelor of Science (no periods)
    text.includes("beng") || // Bachelor of Engineering (no periods)
    text.includes("undergraduate") ||
    /\bb\.?a\.?sc\.?\b/.test(text) // B.A.Sc, BASc, etc.
  ) {
    return 3;
  }
  if (
    text.includes("associate") ||
    text.includes("a.s.") ||
    text.includes("a.a.")
  ) {
    return 2;
  }
  if (
    text.includes("diploma") ||
    text.includes("certificate") ||
    text.includes("high school")
  ) {
    return 1;
  }

  return 3; // Default to bachelor's if unclear
}

/**
 * Get required degree level from job requirements
 * When "OR" alternatives are present, return the lowest acceptable level.
 */
function getRequiredDegreeLevel(reqText: string): number {
  const text = reqText.toLowerCase();

  // Check for "or" patterns - return the MINIMUM acceptable level
  // e.g., "Bachelor's or Master's" means Bachelor's is acceptable
  const hasOr =
    text.includes(" or ") || text.includes("/") || text.includes(",");

  if (hasOr) {
    // Parse levels and return minimum
    const levels: number[] = [];
    if (text.includes("phd") || text.includes("doctorate")) levels.push(5);
    if (text.includes("master") || /\bms\b/.test(text) || /\bm\.s\./.test(text))
      levels.push(4);
    if (
      text.includes("bachelor") ||
      /\bbs\b/.test(text) ||
      /\bb\.s\./.test(text) ||
      /\bba\b/.test(text) ||
      /\bb\.a\./.test(text) ||
      text.includes("degree")
    )
      levels.push(3);
    if (text.includes("associate")) levels.push(2);

    if (levels.length > 0) {
      return Math.min(...levels);
    }
  }

  // No "or" pattern - return the highest mentioned level
  if (text.includes("phd") || text.includes("doctorate")) {
    return 5;
  }
  if (text.includes("master") || /\bms\b/.test(text) || /\bm\.s\./.test(text)) {
    return 4;
  }
  if (
    text.includes("bachelor") ||
    /\bbs\b/.test(text) ||
    /\bb\.s\./.test(text) ||
    /\bba\b/.test(text) ||
    /\bb\.a\./.test(text) ||
    text.includes("degree")
  ) {
    return 3;
  }
  if (text.includes("associate")) {
    return 2;
  }

  return 3; // Default requirement is bachelor's
}

/**
 * Truncate text for display
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Get letter grade based on score
 */
function getGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

/**
 * Generate a human-readable summary of the score
 */
function generateSummary(
  overallScore: number,
  deductions: ScoreDeduction[],
  categoryScores: CategoryScores
): string {
  if (overallScore >= 90) {
    return "Excellent match! Your resume aligns very well with this job description.";
  }

  if (overallScore >= 80) {
    return "Good match. Your resume covers most requirements with some room for improvement.";
  }

  if (overallScore >= 70) {
    return "Moderate match. Consider addressing the gaps highlighted above.";
  }

  if (overallScore >= 60) {
    const mainIssues: string[] = [];
    const requiredMissing = deductions.filter(
      (d) => d.category === "requiredSkills"
    ).length;
    const respIssues = deductions.filter(
      (d) => d.category === "responsibilities"
    ).length;

    if (requiredMissing > 0) mainIssues.push("missing required skills");
    if (respIssues > 0) mainIssues.push("experience gaps");
    if (!categoryScores.education.meetsRequirements)
      mainIssues.push("education mismatch");

    if (mainIssues.length > 0) {
      return `Below average match due to ${mainIssues.join(
        " and "
      )}. Review the deductions above for specific improvements.`;
    }
    return "Below average match. Review the deductions above for specific improvements.";
  }

  return "Significant gaps between your resume and job requirements. Consider tailoring your resume or looking for a closer match.";
}

// Export for testing
export {
  analyzeRequiredSkills,
  analyzePreferredSkills,
  analyzeResponsibilities,
  analyzeEducation,
  isCSRelatedField,
  isExplicitExperienceRequirement,
  isLearningOrientedResponsibility,
};
