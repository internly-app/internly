import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  XCircle,
} from "lucide-react";

import type { ATSAnalysisResponse } from "@/lib/ats/types";
import type {
  CategoryBreakdown,
  ScoreDeduction,
} from "@/lib/ats/calculate-score";
import {
  getGradeColor,
  getScoreColor,
  getScoreRingStroke,
} from "@/components/ats/ats-analyzer.helpers";

type Props = {
  data: ATSAnalysisResponse;
  prefersReducedMotion: boolean;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
  resultAnimState: "idle" | "enter" | "settled";
  barsFilled: boolean;
};

export default function AtsResults({
  data,
  prefersReducedMotion,
  expandedSections,
  toggleSection,
  resultAnimState,
  barsFilled,
}: Props) {
  const showFilledBars = prefersReducedMotion ? true : barsFilled;

  // Score ring stroke values (used by the results view)
  const ringRadius = 42;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringScore = data.score.overallScore;
  const ringStrokeDasharray = `${
    (ringScore / 100) * ringCircumference
  } ${ringCircumference}`;

  return (
    <div
      className={
        prefersReducedMotion
          ? "space-y-6"
          : `space-y-6 transition-opacity duration-200 ease-out ${
              resultAnimState === "enter" ? "opacity-0" : "opacity-100"
            }`
      }
    >
      {/* Encouragement note - shown at the top so people see it */}
      <p className="text-sm text-muted-foreground flex items-start gap-2 bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
        <Info className="size-4 shrink-0 mt-0.5 text-blue-400" />
        <span>
          Missing some required or preferred skills does not mean you
          shouldn&apos;t apply. Many students land internships from roles they
          didn&apos;t think they&apos;d even get an interview for. This tool is
          here to give you the best possible chance, not to filter you out.
        </span>
      </p>

      {/* Score Overview */}
      <Card
        className={
          prefersReducedMotion
            ? undefined
            : `transition-all duration-200 ease-out ${
                resultAnimState === "enter"
                  ? "opacity-0 translate-y-1"
                  : "opacity-100 translate-y-0"
              }`
        }
      >
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Score Circle */}
            <div className="relative size-32 shrink-0">
              <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                {/* Outer grade ring */}
                <circle
                  className="opacity-40"
                  strokeWidth="4"
                  fill="none"
                  cx="50"
                  cy="50"
                  r="48"
                  stroke={getScoreRingStroke(data.score.overallScore)}
                />
                <circle
                  className="stroke-zinc-800"
                  strokeWidth="8"
                  fill="none"
                  cx="50"
                  cy="50"
                  r="42"
                />
                <circle
                  className="transition-[stroke-dasharray] duration-700 ease-out"
                  strokeWidth="8"
                  strokeLinecap="round"
                  fill="none"
                  cx="50"
                  cy="50"
                  r="42"
                  stroke={getScoreRingStroke(data.score.overallScore)}
                  style={{
                    strokeDasharray: ringStrokeDasharray,
                  }}
                />
              </svg>
              <div
                className={
                  prefersReducedMotion
                    ? "absolute inset-0 flex flex-col items-center justify-center"
                    : `absolute inset-0 flex flex-col items-center justify-center transition-transform duration-200 ease-out ${
                        resultAnimState === "enter"
                          ? "scale-[0.98]"
                          : "scale-100"
                      }`
                }
              >
                <span className="text-3xl font-bold">
                  {data.score.overallScore}
                </span>
                <span
                  className={`text-lg font-semibold ${getGradeColor(
                    data.score.grade
                  )}`}
                >
                  {data.score.grade}
                </span>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="flex-1 w-full space-y-3">
              {Object.entries(data.score.breakdown).map(
                ([key, category]: [string, CategoryBreakdown]) => {
                  const isNA = category.percentage === -1;
                  const displayPercentage = isNA ? 0 : category.percentage;
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {category.name}
                        </span>
                        <span className="font-medium">
                          {isNA ? "N/A" : `${category.percentage}%`}
                        </span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        {isNA ? (
                          <div className="h-full w-full bg-zinc-600/50" />
                        ) : (
                          <div
                            className={`h-full ${getScoreColor(
                              displayPercentage
                            )} transition-[width] duration-700 ease-out`}
                            style={{
                              width: showFilledBars
                                ? `${displayPercentage}%`
                                : "0%",
                            }}
                          />
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {/* Summary */}
          <p className="text-sm text-muted-foreground mt-4 pt-4 border-t border-zinc-800">
            {data.score.summary}
          </p>
        </CardContent>
      </Card>

      {/* Skills Section */}
      <Card
        className={
          prefersReducedMotion
            ? undefined
            : `transition-all duration-200 ease-out delay-[80ms] ${
                resultAnimState === "enter"
                  ? "opacity-0 translate-y-1"
                  : "opacity-100 translate-y-0"
              }`
        }
      >
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection("skills")}
        >
          <CardTitle className="text-base font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              Skills Match
              <span className="text-xs text-muted-foreground font-normal">
                ({data.details.skillComparison.matchedRequired.length}/
                {data.details.parsedJD.requiredSkillCount} required)
              </span>
            </span>
            {expandedSections.has("skills") ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </CardTitle>
        </CardHeader>
        {expandedSections.has("skills") && (
          <CardContent className="pt-0 space-y-4">
            {/* Matched Required */}
            {data.details.skillComparison.matchedRequired.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-green-500 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="size-4" />
                  Matched Required Skills
                </h4>
                <div className="flex flex-wrap gap-2">
                  {data.details.skillComparison.matchedRequired.map((match) => (
                    <span
                      key={match.jdSkill}
                      className="px-2 py-1 text-xs rounded-md bg-green-500/10 text-green-500 border border-green-500/20"
                      title={
                        match.matchType !== "exact"
                          ? `Matched via ${match.matchType}: "${match.resumeSkill}" on your resume`
                          : undefined
                      }
                    >
                      {match.jdSkill}
                      {match.matchType === "synonym" && (
                        <span className="ml-1 opacity-70">≈</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Required */}
            {data.details.skillComparison.missingRequired.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-red-500 mb-2 flex items-center gap-2">
                  <XCircle className="size-4" />
                  Missing Required Skills
                </h4>
                <div className="flex flex-wrap gap-2">
                  {data.details.skillComparison.missingRequired.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-1 text-xs rounded-md bg-red-500/10 text-red-500 border border-red-500/20"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Matched Preferred */}
            {data.details.skillComparison.matchedPreferred.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-blue-500 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="size-4" />
                  Matched Preferred Skills
                </h4>
                <div className="flex flex-wrap gap-2">
                  {data.details.skillComparison.matchedPreferred.map(
                    (match) => (
                      <span
                        key={match.jdSkill}
                        className="px-2 py-1 text-xs rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20"
                        title={
                          match.matchType !== "exact"
                            ? `Matched via ${match.matchType}: "${match.resumeSkill}" on your resume`
                            : undefined
                        }
                      >
                        {match.jdSkill}
                        {match.matchType === "synonym" && (
                          <span className="ml-1 opacity-70">≈</span>
                        )}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Missing Preferred */}
            {data.details.skillComparison.missingPreferred.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-yellow-500 mb-2 flex items-center gap-2">
                  <AlertCircle className="size-4" />
                  Missing Preferred Skills
                </h4>
                <div className="flex flex-wrap gap-2">
                  {data.details.skillComparison.missingPreferred.map(
                    (skill) => (
                      <span
                        key={skill}
                        className="px-2 py-1 text-xs rounded-md bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                      >
                        {skill}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Extra Skills */}
            {data.details.skillComparison.extraSkills.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Info className="size-4" />
                  Additional Skills (not in JD)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {data.details.skillComparison.extraSkills
                    .slice(0, 10)
                    .map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-1 text-xs rounded-md bg-zinc-800 text-muted-foreground"
                      >
                        {skill}
                      </span>
                    ))}
                  {data.details.skillComparison.extraSkills.length > 10 && (
                    <span className="px-2 py-1 text-xs text-muted-foreground">
                      +{data.details.skillComparison.extraSkills.length - 10}{" "}
                      more
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Responsibilities Section */}
      <Card
        className={
          prefersReducedMotion
            ? undefined
            : `transition-all duration-200 ease-out delay-[140ms] ${
                resultAnimState === "enter"
                  ? "opacity-0 translate-y-1"
                  : "opacity-100 translate-y-0"
              }`
        }
      >
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection("responsibilities")}
        >
          {(() => {
            const covered = data.details.responsibilityCoverage.covered;
            const weaklyCovered =
              data.details.responsibilityCoverage.weaklyCovered;

            // Some LLM outputs can accidentally duplicate the same responsibility
            // across buckets (or even within a bucket). We compute displayed counts
            // based on the unique responsibility strings to avoid confusing totals
            // like "5/4 covered".
            const unique = (items: Array<{ responsibility: string }>) =>
              Array.from(
                new Set(
                  items.map((x) => x.responsibility.trim()).filter(Boolean)
                )
              );

            const uniqueCovered = unique(covered);
            const uniqueWeakly = unique(weaklyCovered);

            // If a responsibility appears in multiple buckets, treat it as the
            // strongest bucket for count purposes: covered > partially.
            const coveredSet = new Set(uniqueCovered);
            const weaklySet = new Set(
              uniqueWeakly.filter((r) => !coveredSet.has(r))
            );

            const coveredCount = coveredSet.size;
            const totalUnique = coveredSet.size + weaklySet.size;
            const totalFromJD = data.details.parsedJD.responsibilityCount;

            // Prefer what we actually display (unique covered + partially covered).
            // Fall back to JD count if the matcher returned fewer items (e.g., model omission).
            const totalResponsibilities = Math.max(totalUnique, totalFromJD);

            // Suppress unused variable warnings - kept for possible future use
            void coveredCount;
            void totalResponsibilities;

            return (
              <CardTitle className="text-base font-medium flex items-center justify-between">
                <span>Experience Alignment</span>
                {expandedSections.has("responsibilities") ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </CardTitle>
            );
          })()}
        </CardHeader>
        {expandedSections.has("responsibilities") && (
          <CardContent className="pt-0 space-y-4">
            {/* Covered */}
            {data.details.responsibilityCoverage.covered.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-green-500 flex items-center gap-2">
                  <CheckCircle2 className="size-4" />
                  Covered
                </h4>
                {data.details.responsibilityCoverage.covered
                  .filter((item, idx, arr) => {
                    const r = item.responsibility.trim();
                    if (!r) return false;
                    return (
                      arr.findIndex((x) => x.responsibility.trim() === r) ===
                      idx
                    );
                  })
                  .map((item, i) => (
                    <div
                      key={`${item.responsibility}-${i}`}
                      className="pl-6 border-l-2 border-green-500/30 py-1"
                    >
                      <p className="text-sm font-medium">
                        {item.responsibility}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {item.explanation}
                      </p>
                    </div>
                  ))}
              </div>
            )}

            {/* Weakly Covered */}
            {data.details.responsibilityCoverage.weaklyCovered.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-yellow-500 flex items-center gap-2">
                  <AlertCircle className="size-4" />
                  Partially Covered
                </h4>
                {data.details.responsibilityCoverage.weaklyCovered
                  .filter((item, idx, arr) => {
                    const r = item.responsibility.trim();
                    if (!r) return false;
                    return (
                      arr.findIndex((x) => x.responsibility.trim() === r) ===
                      idx
                    );
                  })
                  .map((item, i) => (
                    <div
                      key={`${item.responsibility}-${i}`}
                      className="pl-6 border-l-2 border-yellow-500/30 py-1"
                    >
                      <p className="text-sm font-medium">
                        {item.responsibility}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {item.explanation}
                      </p>
                    </div>
                  ))}
              </div>
            )}

            {/* Not Covered */}
            {data.details.responsibilityCoverage.notCovered.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-red-500 flex items-center gap-2">
                  <XCircle className="size-4" />
                  Not Covered
                </h4>
                {data.details.responsibilityCoverage.notCovered
                  .filter((item, idx, arr) => {
                    const r = item.responsibility.trim();
                    if (!r) return false;
                    return (
                      arr.findIndex((x) => x.responsibility.trim() === r) ===
                      idx
                    );
                  })
                  .map((item, i) => (
                    <div
                      key={`${item.responsibility}-${i}`}
                      className="pl-6 border-l-2 border-red-500/30 py-1"
                    >
                      <p className="text-sm font-medium">
                        {item.responsibility}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {item.explanation}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Deductions / Explainability Section */}
      {(() => {
        const score = data.score;
        const deductions: ScoreDeduction[] = score.deductions || [];
        const shouldShowExplainability =
          score.overallScore < 100 && deductions.length > 0;

        if (!shouldShowExplainability) return null;

        // Total points lost equals sum of deductions (guaranteed by new scoring)
        const totalPointsLost = deductions.reduce(
          (sum: number, d: ScoreDeduction) =>
            sum + (Number.isFinite(d.points) ? d.points : 0),
          0
        );

        return (
          <Card
            className={
              prefersReducedMotion
                ? undefined
                : `transition-all duration-200 ease-out delay-[120ms] ${
                    resultAnimState === "enter"
                      ? "opacity-0 translate-y-1"
                      : "opacity-100 translate-y-0"
                  }`
            }
          >
            <CardHeader
              className="cursor-pointer"
              onClick={() => toggleSection("deductions")}
            >
              <CardTitle className="text-base font-medium flex items-center justify-between">
                <span className="flex items-center gap-2">
                  Where Points Were Lost
                  <span className="text-xs text-muted-foreground font-normal">
                    ({totalPointsLost} pts total)
                  </span>
                </span>
                {expandedSections.has("deductions") ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </CardTitle>
            </CardHeader>
            {expandedSections.has("deductions") && (
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {[...deductions]
                    .sort(
                      (a: ScoreDeduction, b: ScoreDeduction) =>
                        b.points - a.points
                    )
                    .map((deduction: ScoreDeduction, i: number) => (
                      <div
                        key={i}
                        className="flex items-start justify-between gap-4 text-sm py-1"
                      >
                        <span className="text-muted-foreground">
                          {deduction.reason}
                        </span>
                        <span className="text-red-500 shrink-0">
                          -{deduction.points} pts
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })()}

      {/* Score Recovery Plan (Job-Specific) */}
      <Card
        className={
          prefersReducedMotion
            ? undefined
            : `transition-all duration-200 ease-out delay-[130ms] ${
                resultAnimState === "enter"
                  ? "opacity-0 translate-y-1"
                  : "opacity-100 translate-y-0"
              }`
        }
      >
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection("scoreRecovery")}
        >
          <CardTitle className="text-base font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertCircle className="size-4 text-blue-500" />
              Score Recovery Plan
              <span className="text-xs text-muted-foreground font-normal">
                (job-specific, tied to lost points)
              </span>
            </span>
            {expandedSections.has("scoreRecovery") ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </CardTitle>
        </CardHeader>
        {expandedSections.has("scoreRecovery") && (
          <CardContent className="pt-0">
            {data.scoreRecovery?.items?.length ? (
              <div className="space-y-3">
                {data.scoreRecovery.items.map((item, i) => (
                  <div key={i} className="space-y-1 text-sm py-1">
                    <div className="flex items-start justify-between gap-4">
                      <span className="font-medium">{item.title}</span>
                      <span className="text-green-500 shrink-0">
                        +{item.estimatedPoints} pts
                      </span>
                    </div>
                    <p className="text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No score-recovery suggestions were generated for this run.
              </p>
            )}
            <p className="text-xs text-muted-foreground/60 mt-4 italic">
              These suggestions are derived from where points were deducted.
              Only add skills/claims you can support with real experience.
            </p>
          </CardContent>
        )}
      </Card>

      {/* Resume Quality Feedback (JD-Agnostic) */}
      <Card
        className={
          prefersReducedMotion
            ? undefined
            : `transition-all duration-200 ease-out delay-[140ms] ${
                resultAnimState === "enter"
                  ? "opacity-0 translate-y-1"
                  : "opacity-100 translate-y-0"
              }`
        }
      >
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection("resumeFeedback")}
        >
          <CardTitle className="text-base font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Info className="size-4 text-blue-500" />
              Resume Quality Feedback
              <span className="text-xs text-muted-foreground font-normal">
                (general tips, not job-specific)
              </span>
            </span>
            {expandedSections.has("resumeFeedback") ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </CardTitle>
        </CardHeader>
        {expandedSections.has("resumeFeedback") && (
          <CardContent className="pt-0">
            {data.resumeFeedback?.items?.length ? (
              <div className="space-y-3">
                {data.resumeFeedback.items.map((item, i) => (
                  <div key={i} className="space-y-1 text-sm py-1">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-medium">{item.title}</span>
                    </div>
                    <p className="text-muted-foreground">{item.detail}</p>
                    {item.evidenceSnippets.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {item.evidenceSnippets.slice(0, 2).map((snip, j) => (
                          <p
                            key={j}
                            className="text-xs text-muted-foreground/70 border-l-2 border-muted pl-3"
                          >
                            “{snip}”
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No resume-quality feedback was generated for this run. This
                section is optional and never affects your match score.
              </p>
            )}
            <p className="text-xs text-muted-foreground/60 mt-4 italic">
              This feedback is about resume quality in general and does not
              affect your match score.
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
