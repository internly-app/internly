/**
 * ATS Analysis API types.
 *
 * Shared between client and server.
 */

import type { ATSScoreResult } from "@/lib/ats/calculate-score";

export interface ATSAnalysisResponse {
  score: ATSScoreResult;
  details: {
    skillComparison: {
      matchedRequired: string[];
      matchedPreferred: string[];
      missingRequired: string[];
      extraSkills: string[];
    };
    responsibilityCoverage: {
      covered: Array<{ responsibility: string; explanation: string }>;
      weaklyCovered: Array<{ responsibility: string; explanation: string }>;
      notCovered: Array<{ responsibility: string; explanation: string }>;
    };
    parsedResume: {
      name: string | null;
      skillCount: number;
      experienceCount: number;
      educationCount: number;
    };
    parsedJD: {
      requiredSkillCount: number;
      preferredSkillCount: number;
      responsibilityCount: number;
    };
  };
}
