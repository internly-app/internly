/**
 * ATS Analysis API types.
 *
 * Shared between client and server.
 */

import type { ATSScoreResult } from "@/lib/ats/calculate-score";

export interface ResumeFeedbackItem {
  title: string;
  detail: string;
  evidenceSnippets: string[];
}

export interface ResumeQualityFeedback {
  items: ResumeFeedbackItem[];
}

export interface ScoreRecoveryItem {
  title: string;
  detail: string;
  /** Estimated points recovered if addressed (derived from actual deductions). */
  estimatedPoints: number;
  category:
    | "requiredSkills"
    | "preferredSkills"
    | "responsibilities"
    | "education";
}

export interface ScoreRecoveryPlan {
  items: ScoreRecoveryItem[];
}

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
  /**
   * JD-agnostic resume quality feedback (Output B).
   * Does NOT affect score or deductions - purely advisory.
   * May be null if feedback generation failed.
   */
  resumeFeedback: ResumeQualityFeedback | null;

  /**
   * Job-specific recovery guidance derived from score deductions.
   * Does NOT use extra LLM calls; intended to help regain lost points.
   */
  scoreRecovery: ScoreRecoveryPlan;
}
