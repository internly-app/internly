import type { NormalizedResume } from "@/lib/ats/normalize-resume";
import type {
  ResumeQualityFeedback,
  ResumeFeedbackItem,
} from "@/lib/ats/types";

const PHONE_RE = /\b(phone|tel|telephone)\b/i;

function pickEvidenceSnippets(snippets: string[], max: number): string[] {
  return (snippets || []).filter(Boolean).slice(0, max);
}

function collectAllBullets(resume: NormalizedResume): string[] {
  const exp = resume.experience.flatMap((e) => e.bullets || []);
  const proj = resume.projects.flatMap((p) => p.bullets || []);
  return [...exp, ...proj].map((b) => String(b).trim()).filter(Boolean);
}

function ratioWithDigits(bullets: string[]): number {
  if (bullets.length === 0) return 1;
  const withDigits = bullets.filter((b) => /\d/.test(b)).length;
  return withDigits / bullets.length;
}

const WEAK_STARTERS = [
  "responsible for",
  "worked on",
  "helped",
  "assisted",
  "involved in",
  "participated in",
];

function startsWeak(bullet: string): boolean {
  const s = bullet.trim().toLowerCase();
  return WEAK_STARTERS.some((w) => s.startsWith(w));
}

export function postProcessResumeFeedback(
  resume: NormalizedResume,
  feedback: ResumeQualityFeedback | null
): ResumeQualityFeedback | null {
  const baseItems = feedback?.items ? [...feedback.items] : [];

  // Remove low-impact contact/phone formatting nitpicks
  const filtered = baseItems.filter((item) => {
    const hay = `${item.title}\n${item.detail}\n${(
      item.evidenceSnippets || []
    ).join("\n")}`;
    return !PHONE_RE.test(hay);
  });

  const bullets = collectAllBullets(resume);
  const items: ResumeFeedbackItem[] = [...filtered];

  // Add a high-signal bullet-strength item if metrics look broadly missing
  const digitRatio = ratioWithDigits(bullets);
  if (bullets.length >= 6 && digitRatio < 0.35) {
    const evidence = bullets.filter((b) => !/\d/.test(b)).slice(0, 2);
    items.unshift({
      title: "Experience/Projects: add measurable outcomes",
      detail:
        "Many bullets describe work but not impact; where truthful, add numbers (latency, users, revenue, time saved, scale) to make value obvious.",
      evidenceSnippets: pickEvidenceSnippets(evidence, 2),
    });
  }

  // Add an item if many bullets start weakly
  const weakStarters = bullets.filter(startsWeak);
  if (weakStarters.length >= 2) {
    items.unshift({
      title: "Experience: start bullets with strong action verbs",
      detail:
        "Rewrite weak openers (e.g., 'Responsible for…') into an action + object + outcome format to make ownership clear.",
      evidenceSnippets: pickEvidenceSnippets(weakStarters, 2),
    });
  }

  // Keep output concise
  const finalItems = items.slice(0, 6);
  return finalItems.length ? { items: finalItems } : null;
}
