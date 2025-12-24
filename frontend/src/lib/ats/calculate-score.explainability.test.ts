import assert from "node:assert/strict";

import { calculateATSScore } from "./calculate-score";
import type {
  NormalizedResume,
  ResponsibilityMatchingResult,
  SkillComparisonResult,
} from "./types";

describe("ATS score explainability", () => {
  it("can produce score < 100 with no itemized deductions (preferred skill shortfall)", () => {
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
      notCovered: [],
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
    assert.equal(score.allDeductions.length, 0);

    const preferred = score.breakdown.preferredSkills;
    assert.equal(preferred.percentage, 0);
    assert.ok(preferred.weightedScore < preferred.weight);
  });
});
