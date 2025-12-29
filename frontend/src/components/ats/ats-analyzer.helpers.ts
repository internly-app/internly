export type LoadingCheckpoint = {
  atMs: number;
  percent: number;
  message: string;
};

// Base loading checkpoints - will be jittered per run for variation
export const BASE_LOADING_CHECKPOINTS: ReadonlyArray<LoadingCheckpoint> = [
  // Gradual start
  { atMs: 0, percent: 0, message: "Preparing analysis" },
  { atMs: 400, percent: 5, message: "Reading resume" },
  { atMs: 600, percent: 12, message: "Reading resume" },
  { atMs: 800, percent: 14, message: "Reading resume" },
  { atMs: 1200, percent: 19, message: "Parsing content" },
  { atMs: 1600, percent: 24, message: "Extracting skills" },

  // Small pause then continue
  { atMs: 2200, percent: 26, message: "Extracting skills" },
  { atMs: 2600, percent: 33, message: "Reading job description" },
  { atMs: 3000, percent: 38, message: "Reading job description" },
  { atMs: 3400, percent: 45, message: "Analyzing requirements" },

  // Another small pause
  { atMs: 4000, percent: 46, message: "Analyzing requirements" },
  { atMs: 4400, percent: 52, message: "Matching experience" },
  { atMs: 4800, percent: 58, message: "Matching experience" },
  { atMs: 5200, percent: 63, message: "Comparing skills" },

  // Slow down toward the end
  { atMs: 5800, percent: 66, message: "Comparing skills" },
  { atMs: 6400, percent: 71, message: "Calculating score" },
  { atMs: 7000, percent: 74, message: "Calculating score" },
  { atMs: 7800, percent: 79, message: "Finalizing" },

  // Very slow at the end, waiting for backend
  { atMs: 8600, percent: 81, message: "Finalizing" },
  { atMs: 9500, percent: 84, message: "Almost done" },
  { atMs: 11000, percent: 87, message: "Almost done" },
  { atMs: 13000, percent: 89, message: "Almost done" },
  { atMs: 16000, percent: 96, message: "Almost done" },
  { atMs: 20000, percent: 98, message: "Almost done" },
];

/**
 * Apply slight random jitter to loading checkpoints for variation between runs.
 * Jitter is ±15% on timing, keeping the overall feel consistent but not robotic.
 */
export function applyLoadingJitter(): LoadingCheckpoint[] {
  const jitterFactor = 0.85 + Math.random() * 0.3; // 0.85 to 1.15
  return BASE_LOADING_CHECKPOINTS.map((cp, idx) => ({
    ...cp,
    // Don't jitter the first checkpoint (always start at 0)
    atMs: idx === 0 ? 0 : Math.round(cp.atMs * jitterFactor),
  }));
}

export function getGradeColor(grade: string): string {
  switch (grade) {
    case "A":
      return "text-green-500";
    case "B":
      return "text-blue-500";
    case "C":
      return "text-yellow-500";
    case "D":
      return "text-orange-500";
    case "F":
      return "text-red-500";
    default:
      return "text-muted-foreground";
  }
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
}

export function getScoreRingStroke(score: number): string {
  // SVG strokes can't use `bg-*` Tailwind classes. Keep the intent consistent
  // with the UI color scheme.
  if (score >= 90) return "rgb(34, 197, 94)"; // green-500
  if (score >= 80) return "rgb(59, 130, 246)"; // blue-500
  if (score >= 70) return "rgb(234, 179, 8)"; // yellow-500
  if (score >= 60) return "rgb(249, 115, 22)"; // orange-500
  return "rgb(239, 68, 68)"; // red-500
}
