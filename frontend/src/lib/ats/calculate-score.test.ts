import assert from "node:assert/strict";

import { calculateATSScore } from "./calculate-score";
import type { SkillComparisonResult } from "./compare-skills";
import type { ResponsibilityMatchingResult } from "./match-responsibilities";
import type { ParsedJobDescription } from "./parse-job-description";
import type { NormalizedResume } from "./normalize-resume";

function mockSkillComparison(missingRequired: string[]): SkillComparisonResult {
  return {
    matched: { required: [], preferred: [] },
    missing: missingRequired,
    extra: [],
    summary: {
      totalRequired: missingRequired.length,
      totalPreferred: 0,
      matchedRequired: 0,
      matchedPreferred: 0,
      missingRequired: missingRequired.length,
      extraSkills: 0,
    },
  };
}

function mockResponsibilityMatching(
  args?: Partial<ResponsibilityMatchingResult>
): ResponsibilityMatchingResult {
  return {
    coveredResponsibilities: [],
    weaklyCovered: [],
    notCovered: [],
    ...args,
  };
}

function mockJD(
  educationRequirements: string[]
): Pick<ParsedJobDescription, "educationRequirements"> {
  return { educationRequirements };
}

function mockResumeEducation(
  entries: Array<Partial<NormalizedResume["education"][number]>>
): Pick<NormalizedResume, "education"> {
  return {
    education: entries.map((e) => ({
      institution: e.institution ?? "",
      degree: e.degree ?? null,
      field: e.field ?? null,
      graduationDate: e.graduationDate ?? null,
      gpa: e.gpa ?? null,
      highlights: e.highlights ?? [],
    })),
  };
}

function run() {
  // Bachelor's should satisfy "Bachelor's OR Master's" requirement.
  {
    const result = calculateATSScore({
      skillComparison: mockSkillComparison([]),
      responsibilityMatching: mockResponsibilityMatching(),
      jobDescription: mockJD(["Bachelor's or Master's in Computer Science"]),
      resume: mockResumeEducation([
        { degree: "B.S.", field: "Computer Science" },
      ]),
    });

    assert.equal(
      result.breakdown.education.percentage,
      100,
      "Bachelor's should fully meet a Bachelor's or Master's requirement"
    );
  }

  // Same deduction reason should not appear twice in allDeductions.
  {
    const result = calculateATSScore({
      skillComparison: mockSkillComparison(["React"]),
      responsibilityMatching: mockResponsibilityMatching({
        notCovered: [
          {
            responsibility: "Build UI",
            coverage: "not_covered",
            explanation: "",
            relevantExperience: [],
          },
        ],
      }),
      jobDescription: mockJD(["Bachelor's required"]),
      resume: mockResumeEducation([{ degree: "B.A.", field: "History" }]),
    });

    const reasons = result.allDeductions.map(
      (d) => `${d.category}:${d.reason}`
    );
    const unique = new Set(reasons);
    assert.equal(
      unique.size,
      reasons.length,
      "allDeductions should not contain duplicate reasons"
    );
  }

  // Learning-oriented responsibilities shouldn't create experience deductions.
  {
    const result = calculateATSScore({
      skillComparison: mockSkillComparison([]),
      responsibilityMatching: mockResponsibilityMatching({
        notCovered: [
          {
            responsibility: "Learn quickly and ask questions",
            coverage: "not_covered",
            explanation: "",
            relevantExperience: [],
          },
        ],
      }),
      jobDescription: mockJD([]),
      resume: mockResumeEducation([]),
    });

    const responsibilityDeductions = result.allDeductions.filter(
      (d) => d.category === "responsibilities"
    );
    assert.equal(
      responsibilityDeductions.length,
      0,
      "Learning-oriented responsibilities should not generate experience deductions"
    );
  }

  // Explicit experience responsibilities should still create deductions.
  {
    const result = calculateATSScore({
      skillComparison: mockSkillComparison([]),
      responsibilityMatching: mockResponsibilityMatching({
        notCovered: [
          {
            responsibility: "Must have experience building REST APIs",
            coverage: "not_covered",
            explanation: "",
            relevantExperience: [],
          },
        ],
      }),
      jobDescription: mockJD([]),
      resume: mockResumeEducation([]),
    });

    const responsibilityDeductions = result.allDeductions.filter(
      (d) => d.category === "responsibilities"
    );
    assert.ok(
      responsibilityDeductions.length >= 1,
      "Explicit experience responsibilities should generate deductions"
    );
  }

  if (process.env.TEST_VERBOSE === "1") {
    console.log("calculate-score tests: OK");
  }
}

run();
