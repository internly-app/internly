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
    missingPreferred: [],
    extra: [],
    summary: {
      totalRequired: missingRequired.length,
      totalPreferred: 0,
      matchedRequired: 0,
      matchedPreferred: 0,
      missingRequired: missingRequired.length,
      missingPreferred: 0,
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
  educationRequirements: string[] = [],
  extras: Partial<ParsedJobDescription> = {}
): Partial<ParsedJobDescription> {
  return {
    requiredSkills: [],
    preferredSkills: [],
    responsibilities: [],
    educationRequirements,
    ...extras,
  };
}

function mockResumeEducation(
  entries: Array<Partial<NormalizedResume["education"][number]>>
): Partial<NormalizedResume> {
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
  // Required skills: deductions should be capped (no single missing skill nukes the category)
  {
    const skillComparison: SkillComparisonResult = {
      ...mockSkillComparison(["Kubernetes"]),
      summary: {
        totalRequired: 1,
        totalPreferred: 0,
        matchedRequired: 0,
        matchedPreferred: 0,
        missingRequired: 1,
        missingPreferred: 0,
        extraSkills: 0,
      },
    };

    const responsibilityMatching = mockResponsibilityMatching();

    const score = calculateATSScore({
      skillComparison,
      responsibilityMatching,
      jobDescription: mockJD() as ParsedJobDescription,
      resume: mockResumeEducation([]) as NormalizedResume,
    });

    const requiredDeductions = score.deductions.filter(
      (d) => d.category === "requiredSkills"
    );
    assert.equal(
      requiredDeductions.length,
      1,
      "Should have 1 deduction for 1 missing skill"
    );
    assert(
      requiredDeductions[0].points <= 12,
      "Single skill deduction should be capped reasonably"
    );

    // Verify deductions sum to score loss
    const totalDeducted = score.deductions.reduce(
      (sum, d) => sum + d.points,
      0
    );
    assert.equal(
      totalDeducted,
      100 - score.overallScore,
      "Deductions should sum to score loss"
    );
  }

  // Interchangeable group token should produce a clear deduction
  {
    const skillComparison: SkillComparisonResult = {
      ...mockSkillComparison(["At least one of: Python, Java, JavaScript"]),
      summary: {
        totalRequired: 1,
        totalPreferred: 0,
        matchedRequired: 0,
        matchedPreferred: 0,
        missingRequired: 1,
        missingPreferred: 0,
        extraSkills: 0,
      },
    };

    const responsibilityMatching = mockResponsibilityMatching();

    const score = calculateATSScore({
      skillComparison,
      responsibilityMatching,
      jobDescription: mockJD() as ParsedJobDescription,
      resume: mockResumeEducation([]) as NormalizedResume,
    });

    // Should have a deduction for the missing skill group
    const requiredDeductions = score.deductions.filter(
      (d) => d.category === "requiredSkills"
    );
    assert(
      requiredDeductions.length > 0,
      "Should have a deduction for missing skill group"
    );
  }

  // Bachelor's should satisfy "Bachelor's OR Master's" requirement.
  {
    const result = calculateATSScore({
      skillComparison: mockSkillComparison([]),
      responsibilityMatching: mockResponsibilityMatching(),
      jobDescription: mockJD([
        "Bachelor's or Master's in Computer Science",
      ]) as ParsedJobDescription,
      resume: mockResumeEducation([
        { degree: "B.S.", field: "Computer Science" },
      ]) as NormalizedResume,
    });

    assert.equal(
      result.categoryScores.education.score,
      100,
      "Bachelor's should fully meet a Bachelor's or Master's requirement"
    );
    assert.equal(
      result.categoryScores.education.meetsRequirements,
      true,
      "Should meet education requirements"
    );
  }

  // Same deduction reason should not appear twice in deductions.
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
      jobDescription: mockJD(["Bachelor's required"]) as ParsedJobDescription,
      resume: mockResumeEducation([
        { degree: "B.A.", field: "History" },
      ]) as NormalizedResume,
    });

    const reasons = result.deductions.map((d) => `${d.category}:${d.reason}`);
    const unique = new Set(reasons);
    assert.equal(
      unique.size,
      reasons.length,
      "deductions should not contain duplicate reasons"
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
      jobDescription: mockJD() as ParsedJobDescription,
      resume: mockResumeEducation([]) as NormalizedResume,
    });

    const responsibilityDeductions = result.deductions.filter(
      (d) => d.category === "responsibilities"
    );
    assert.equal(
      responsibilityDeductions.length,
      0,
      "Learning-oriented responsibilities should not generate experience deductions"
    );
  }

  // Regular responsibilities should create deductions (be strict!)
  {
    const result = calculateATSScore({
      skillComparison: mockSkillComparison([]),
      responsibilityMatching: mockResponsibilityMatching({
        notCovered: [
          {
            responsibility: "Build REST APIs",
            coverage: "not_covered",
            explanation: "",
            relevantExperience: [],
          },
          {
            responsibility: "Write unit tests",
            coverage: "not_covered",
            explanation: "",
            relevantExperience: [],
          },
        ],
      }),
      jobDescription: mockJD() as ParsedJobDescription,
      resume: mockResumeEducation([]) as NormalizedResume,
    });

    const responsibilityDeductions = result.deductions.filter(
      (d) => d.category === "responsibilities"
    );
    assert.equal(
      responsibilityDeductions.length,
      2,
      "Regular responsibilities should generate deductions - be strict!"
    );
  }

  // Preferred traits (interest in, exposure to, nice to have) should NOT create deductions
  {
    const result = calculateATSScore({
      skillComparison: mockSkillComparison([]),
      responsibilityMatching: mockResponsibilityMatching({
        notCovered: [
          {
            responsibility: "Interest in machine learning",
            coverage: "not_covered",
            explanation: "",
            relevantExperience: [],
          },
          {
            responsibility: "Exposure to cloud technologies like AWS",
            coverage: "not_covered",
            explanation: "",
            relevantExperience: [],
          },
          {
            responsibility: "Nice to have: experience with Docker",
            coverage: "not_covered",
            explanation: "",
            relevantExperience: [],
          },
          {
            responsibility: "Familiarity with agile methodologies preferred",
            coverage: "not_covered",
            explanation: "",
            relevantExperience: [],
          },
          {
            responsibility: "Bonus: knowledge of GraphQL",
            coverage: "not_covered",
            explanation: "",
            relevantExperience: [],
          },
        ],
      }),
      jobDescription: mockJD() as ParsedJobDescription,
      resume: mockResumeEducation([]) as NormalizedResume,
    });

    const responsibilityDeductions = result.deductions.filter(
      (d) => d.category === "responsibilities"
    );
    assert.equal(
      responsibilityDeductions.length,
      0,
      "Preferred traits (interest in, exposure to, nice to have, familiarity, bonus) should NOT generate deductions"
    );
  }

  // Mixed responsibilities: regular requirements should be penalized, preferred traits and soft skills should not
  {
    const result = calculateATSScore({
      skillComparison: mockSkillComparison([]),
      responsibilityMatching: mockResponsibilityMatching({
        notCovered: [
          {
            // This is a regular responsibility - SHOULD generate deduction
            responsibility: "Build and maintain REST APIs",
            coverage: "not_covered",
            explanation: "",
            relevantExperience: [],
          },
          {
            // This is a regular responsibility - SHOULD generate deduction
            responsibility: "Write comprehensive unit tests",
            coverage: "not_covered",
            explanation: "",
            relevantExperience: [],
          },
          {
            // This is a learning-oriented soft skill - should NOT generate deduction
            responsibility: "Eager to learn new technologies",
            coverage: "not_covered",
            explanation: "",
            relevantExperience: [],
          },
          {
            // This is a preferred trait - should NOT generate deduction
            responsibility: "Some experience with GraphQL is a plus",
            coverage: "not_covered",
            explanation: "",
            relevantExperience: [],
          },
        ],
      }),
      jobDescription: mockJD() as ParsedJobDescription,
      resume: mockResumeEducation([]) as NormalizedResume,
    });

    const responsibilityDeductions = result.deductions.filter(
      (d) => d.category === "responsibilities"
    );
    assert.equal(
      responsibilityDeductions.length,
      2,
      "Regular responsibilities should generate deductions; soft skills and preferred traits should not"
    );
    assert.ok(
      responsibilityDeductions.some((d) => d.reason.includes("REST APIs")),
      "Should have deduction for REST APIs responsibility"
    );
    assert.ok(
      responsibilityDeductions.some((d) => d.reason.includes("unit tests")),
      "Should have deduction for unit tests responsibility"
    );
  }

  // Management Engineering should be considered CS-related for software roles
  {
    const result = calculateATSScore({
      skillComparison: mockSkillComparison([]),
      responsibilityMatching: mockResponsibilityMatching(),
      jobDescription: mockJD(
        ["Bachelor's in Computer Science or related field"],
        {
          requiredSkills: ["TypeScript"],
          responsibilities: ["Build software applications"],
        }
      ) as ParsedJobDescription,
      resume: mockResumeEducation([
        { degree: "B.S.", field: "Management Engineering" },
      ]) as NormalizedResume,
    });

    assert.equal(
      result.categoryScores.education.meetsRequirements,
      true,
      "Management Engineering should satisfy 'CS or related field' requirement"
    );
    const eduDeductions = result.deductions.filter(
      (d) => d.category === "education"
    );
    assert.equal(
      eduDeductions.length,
      0,
      "Should have no education deductions for Management Engineering in software role"
    );
  }

  console.log("✅ calculate-score tests: OK");
}

run();
