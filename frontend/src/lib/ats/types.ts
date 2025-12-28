/**
 * ATS Analysis API types.
 *
 * Shared between client and server.
 */

import type { ATSScoreResult } from "@/lib/ats/calculate-score";

/**
 * Skill match with type information for richer feedback.
 */
export interface SkillMatchInfo {
  jdSkill: string;
  resumeSkill: string;
  matchType: "exact" | "normalized" | "synonym";
}

export interface ATSAnalysisResponse {
  score: ATSScoreResult;
  details: {
    skillComparison: {
      /** Skills matched with match type info */
      matchedRequired: SkillMatchInfo[];
      matchedPreferred: SkillMatchInfo[];
      /** Skills not found - with optional related skills from resume */
      missingRequired: string[];
      missingPreferred: string[];
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
