import assert from "assert";

import { calculateATSScore } from "./calculate-score";
import type {
  NormalizedResume,
  ResponsibilityMatchingResult,
  SkillComparisonResult,
} from "./types";

function run() {
  // Preferred skills are a scored category but intentionally don't emit
  // itemized deductions. In that case the UI should still be able to explain
  // where points went via category weights.
  const skillComparison: SkillComparisonResult = {
    matched: [],
    missing: [],
    matchedRequired: ["TypeScript"],
    missingRequired: [],
    matchedPreferred: [],
    missingPreferred: ["React", "Next.js"],
    extraSkills: [],
    summary: {
      matchedRequired: 1,
      totalRequired: 1,
      matchedPreferred: 0,
      totalPreferred: 2,
      missingPreferred: 2,
    },
  };

  const responsibilityMatching: ResponsibilityMatchingResult = {
    coveredResponsibilities: [],
    weaklyCovered: [],
    notCovered: [],
    covered: [],
  };

  const jobDescription = {
    educationRequirements: [],
  };

  const resume: Pick<NormalizedResume, "education"> = {
    education: [],
  };

  const score = calculateATSScore({
    skillComparison,
    responsibilityMatching,
    jobDescription,
    resume,
  });

  assert.ok(score.overallScore < 100);
  assert.strictEqual(score.allDeductions.length, 0);

  const preferred = score.breakdown.preferredSkills;
  assert.strictEqual(preferred.percentage, 0);
  assert.ok(preferred.weightedScore < preferred.weight);

  if (process.env.TEST_VERBOSE === "1") {
    console.log("calculate-score explainability tests: OK");
  }
}

run();
