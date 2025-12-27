import assert from "assert";

import { calculateATSScore } from "./calculate-score";
import type { SkillComparisonResult } from "./compare-skills";
import type { ResponsibilityMatchingResult } from "./match-responsibilities";
import type { NormalizedResume } from "./normalize-resume";
import type { ParsedJobDescription } from "./parse-job-description";

/**
 * Test: Preferred skills only affect score via single category deduction, not itemized.
 * The deductions list should exactly sum to (100 - overallScore).
 */
function test_preferred_skills_single_deduction() {
  const skillComparison: SkillComparisonResult = {
    matched: {
      required: [
        {
          jdSkill: "TypeScript",
          resumeSkill: "TypeScript",
          matchType: "exact",
        },
      ],
      preferred: [],
    },
    missing: [],
    missingPreferred: ["React", "Next.js"],
    extra: [],
    summary: {
      matchedRequired: 1,
      totalRequired: 1,
      matchedPreferred: 0,
      totalPreferred: 2,
      missingRequired: 0,
      missingPreferred: 2,
      extraSkills: 0,
    },
  };

  const responsibilityMatching: ResponsibilityMatchingResult = {
    coveredResponsibilities: [],
    weaklyCovered: [],
    notCovered: [],
  };

  const jobDescription: Partial<ParsedJobDescription> = {
    requiredSkills: ["TypeScript"],
    preferredSkills: ["React", "Next.js"],
    responsibilities: [],
    educationRequirements: [],
  };

  const resume: Partial<NormalizedResume> = {
    education: [],
  };

  const score = calculateATSScore({
    skillComparison,
    responsibilityMatching:
      responsibilityMatching as ResponsibilityMatchingResult,
    jobDescription: jobDescription as ParsedJobDescription,
    resume: resume as NormalizedResume,
  });

  // Should lose points for missing preferred skills
  assert.ok(score.overallScore < 100, "Score should be less than 100");

  // The deductions should sum exactly to the score loss
  const totalDeducted = score.deductions.reduce((sum, d) => sum + d.points, 0);
  const expectedLoss = 100 - score.overallScore;
  assert.strictEqual(
    totalDeducted,
    expectedLoss,
    `Deductions (${totalDeducted}) should equal score loss (${expectedLoss})`
  );

  // Should have exactly one deduction for preferred skills category
  const preferredDeductions = score.deductions.filter(
    (d) => d.category === "preferredSkills"
  );
  assert.strictEqual(
    preferredDeductions.length,
    1,
    "Should have exactly one preferred skills deduction"
  );

  console.log("✓ test_preferred_skills_single_deduction passed");
}

/**
 * Test: Missing required skills get individual deductions.
 */
function test_missing_required_skills_itemized() {
  const skillComparison: SkillComparisonResult = {
    matched: {
      required: [
        {
          jdSkill: "TypeScript",
          resumeSkill: "TypeScript",
          matchType: "exact",
        },
      ],
      preferred: [],
    },
    missing: ["Docker", "Kubernetes"],
    missingPreferred: [],
    extra: [],
    summary: {
      matchedRequired: 1,
      totalRequired: 3,
      matchedPreferred: 0,
      totalPreferred: 0,
      missingRequired: 2,
      missingPreferred: 0,
      extraSkills: 0,
    },
  };

  const responsibilityMatching: ResponsibilityMatchingResult = {
    coveredResponsibilities: [],
    weaklyCovered: [],
    notCovered: [],
  };

  const jobDescription: Partial<ParsedJobDescription> = {
    requiredSkills: ["TypeScript", "Docker", "Kubernetes"],
    preferredSkills: [],
    responsibilities: [],
    educationRequirements: [],
  };

  const resume: Partial<NormalizedResume> = {
    education: [],
  };

  const score = calculateATSScore({
    skillComparison,
    responsibilityMatching:
      responsibilityMatching as ResponsibilityMatchingResult,
    jobDescription: jobDescription as ParsedJobDescription,
    resume: resume as NormalizedResume,
  });

  // Should have individual deductions for each missing required skill
  const requiredDeductions = score.deductions.filter(
    (d) => d.category === "requiredSkills"
  );
  assert.strictEqual(
    requiredDeductions.length,
    2,
    "Should have 2 deductions for 2 missing required skills"
  );

  // Deductions should sum to score loss
  const totalDeducted = score.deductions.reduce((sum, d) => sum + d.points, 0);
  const expectedLoss = 100 - score.overallScore;
  assert.strictEqual(
    totalDeducted,
    expectedLoss,
    "Deductions should sum to score loss"
  );

  console.log("✓ test_missing_required_skills_itemized passed");
}

/**
 * Test: Combined scenario with required skills, preferred skills, and responsibilities.
 * Deductions must sum exactly to (100 - overallScore).
 */
function test_combined_deductions_sum_exactly() {
  const skillComparison: SkillComparisonResult = {
    matched: {
      required: [
        {
          jdSkill: "TypeScript",
          resumeSkill: "TypeScript",
          matchType: "exact",
        },
      ],
      preferred: [],
    },
    missing: ["Docker"],
    missingPreferred: ["React"],
    extra: [],
    summary: {
      matchedRequired: 1,
      totalRequired: 2,
      matchedPreferred: 0,
      totalPreferred: 1,
      missingRequired: 1,
      missingPreferred: 1,
      extraSkills: 0,
    },
  };

  const responsibilityMatching: ResponsibilityMatchingResult = {
    coveredResponsibilities: [
      {
        responsibility: "Build APIs",
        coverage: "covered",
        explanation: "Has API experience",
        relevantExperience: ["Built REST APIs"],
      },
    ],
    weaklyCovered: [],
    notCovered: [
      {
        responsibility: "Must have experience with microservices architecture",
        coverage: "not_covered",
        explanation: "No microservices mentioned",
        relevantExperience: [],
      },
    ],
  };

  const jobDescription: Partial<ParsedJobDescription> = {
    requiredSkills: ["TypeScript", "Docker"],
    preferredSkills: ["React"],
    responsibilities: [
      "Build APIs",
      "Must have experience with microservices architecture",
    ],
    educationRequirements: [],
  };

  const resume: Partial<NormalizedResume> = {
    education: [],
  };

  const score = calculateATSScore({
    skillComparison,
    responsibilityMatching:
      responsibilityMatching as ResponsibilityMatchingResult,
    jobDescription: jobDescription as ParsedJobDescription,
    resume: resume as NormalizedResume,
  });

  // THE KEY INVARIANT: deductions must sum exactly to score loss
  const totalDeducted = score.deductions.reduce((sum, d) => sum + d.points, 0);
  const scoreLoss = 100 - score.overallScore;

  assert.strictEqual(
    totalDeducted,
    scoreLoss,
    `INVARIANT VIOLATED: Deductions (${totalDeducted}) != Score loss (${scoreLoss})\n` +
      `Deductions: ${JSON.stringify(score.deductions, null, 2)}`
  );

  console.log("✓ test_combined_deductions_sum_exactly passed");
}

/**
 * Test: Perfect score when everything matches.
 */
function test_perfect_score_no_deductions() {
  const skillComparison: SkillComparisonResult = {
    matched: {
      required: [
        {
          jdSkill: "TypeScript",
          resumeSkill: "TypeScript",
          matchType: "exact",
        },
      ],
      preferred: [
        { jdSkill: "React", resumeSkill: "React", matchType: "exact" },
      ],
    },
    missing: [],
    missingPreferred: [],
    extra: [],
    summary: {
      matchedRequired: 1,
      totalRequired: 1,
      matchedPreferred: 1,
      totalPreferred: 1,
      missingRequired: 0,
      missingPreferred: 0,
      extraSkills: 0,
    },
  };

  const responsibilityMatching: ResponsibilityMatchingResult = {
    coveredResponsibilities: [
      {
        responsibility: "Build web applications",
        coverage: "covered",
        explanation: "Has web experience",
        relevantExperience: ["Built web apps"],
      },
    ],
    weaklyCovered: [],
    notCovered: [],
  };

  const jobDescription: Partial<ParsedJobDescription> = {
    requiredSkills: ["TypeScript"],
    preferredSkills: ["React"],
    responsibilities: ["Build web applications"],
    educationRequirements: [],
  };

  const resume: Partial<NormalizedResume> = {
    education: [],
  };

  const score = calculateATSScore({
    skillComparison,
    responsibilityMatching:
      responsibilityMatching as ResponsibilityMatchingResult,
    jobDescription: jobDescription as ParsedJobDescription,
    resume: resume as NormalizedResume,
  });

  assert.strictEqual(score.overallScore, 100, "Perfect match should score 100");
  assert.strictEqual(
    score.deductions.length,
    0,
    "Perfect match should have no deductions"
  );

  console.log("✓ test_perfect_score_no_deductions passed");
}

// Run all tests
test_preferred_skills_single_deduction();
test_missing_required_skills_itemized();
test_combined_deductions_sum_exactly();
test_perfect_score_no_deductions();

console.log("\n✅ All explainability tests passed!");
