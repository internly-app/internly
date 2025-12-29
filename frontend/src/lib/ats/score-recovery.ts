import type {
  ATSAnalysisResponse,
  ScoreRecoveryItem,
  ScoreRecoveryPlan,
} from "@/lib/ats/types";

function parseMissingRequiredSkill(reason: string): string | null {
  const prefix = "Missing required skill:";
  if (!reason.startsWith(prefix)) return null;
  const rest = reason.slice(prefix.length).trim();
  const beforeParen = rest.split("(")[0]?.trim();
  return beforeParen || null;
}

function parseResponsibilityFromReason(reason: string): {
  kind: "missing" | "partial";
  responsibility: string;
} | null {
  const missingPrefix = "Missing experience:";
  const partialPrefix = "Partial experience match:";
  if (reason.startsWith(missingPrefix)) {
    return {
      kind: "missing",
      responsibility: reason.slice(missingPrefix.length).trim(),
    };
  }
  if (reason.startsWith(partialPrefix)) {
    return {
      kind: "partial",
      responsibility: reason.slice(partialPrefix.length).trim(),
    };
  }
  return null;
}

export function buildScoreRecoveryPlan(
  analysis: Pick<ATSAnalysisResponse, "score" | "details">
): ScoreRecoveryPlan {
  const items: ScoreRecoveryItem[] = [];

  const deductions = analysis.score.deductions || [];

  for (const d of deductions) {
    if (!Number.isFinite(d.points) || d.points <= 0) continue;

    if (d.category === "requiredSkills") {
      const skill = parseMissingRequiredSkill(d.reason);
      if (!skill) continue;

      items.push({
        title: `Add evidence for required skill: ${skill}`,
        detail: `If you have ${skill}, add it to your Skills section and mention it in 1–2 bullets under the most relevant role/project (tools used + what you shipped). Only include it if you can back it up.`,
        estimatedPoints: d.points,
        category: d.category,
      });
      continue;
    }

    if (d.category === "preferredSkills") {
      const missingPreferred =
        analysis.details.skillComparison.missingPreferred;
      const top = missingPreferred.slice(0, 6);
      const list = top.length
        ? ` Missing preferred skills detected: ${top.join(", ")}.`
        : "";

      items.push({
        title: "Add preferred JD skills (if true)",
        detail: `If you have any preferred skills from the JD, make them explicit in Skills and in a supporting bullet.${list} This category is scored by overall preferred-skill coverage.`,
        estimatedPoints: d.points,
        category: d.category,
      });
      continue;
    }

    if (d.category === "responsibilities") {
      const parsed = parseResponsibilityFromReason(d.reason);
      if (!parsed) continue;

      items.push({
        title:
          parsed.kind === "missing"
            ? "Add experience evidence for a JD responsibility"
            : "Strengthen weak responsibility coverage",
        detail: `Add or strengthen a bullet that clearly demonstrates: ${parsed.responsibility}. Use an action + scope + outcome (e.g., what you built, for whom, and the measurable result).`,
        estimatedPoints: d.points,
        category: d.category,
      });
      continue;
    }

    if (d.category === "education") {
      items.push({
        title: "Make education requirement unambiguous",
        detail: `If you meet the JD’s education requirement, make it explicit (degree level, field, institution, and graduation date). If you don’t, don’t misrepresent it—focus on skill/experience evidence instead.`,
        estimatedPoints: d.points,
        category: d.category,
      });
      continue;
    }
  }

  // Sort biggest impact first, keep output concise
  const sorted = items
    .sort((a, b) => b.estimatedPoints - a.estimatedPoints)
    .slice(0, 8);

  return { items: sorted };
}
