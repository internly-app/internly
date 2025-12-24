"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  X,
} from "lucide-react";
import type { ATSAnalysisResponse } from "@/lib/ats/types";

// ---------------------------------------------------------------------------
// Constants (keep in sync with server)
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_FILE_SIZE_DISPLAY = "5MB";
const MIN_JD_LENGTH = 50;

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AnalysisState =
  | { status: "idle" }
  | { status: "loading"; step: string }
  | { status: "success"; data: ATSAnalysisResponse }
  | { status: "error"; message: string };

function usePrefersReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mediaQuery.matches);
    update();

    // Safari <14 uses addListener/removeListener
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
      return () => mediaQuery.removeEventListener("change", update);
    }

    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, []);

  return reducedMotion;
}

// ---------------------------------------------------------------------------
// Score display helpers
// ---------------------------------------------------------------------------

function getGradeColor(grade: string): string {
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

function getScoreColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
}

function getScoreRingStroke(score: number): string {
  // SVG strokes can't use `bg-*` Tailwind classes. Keep the intent consistent
  // with the UI color scheme.
  if (score >= 90) return "rgb(34, 197, 94)"; // green-500
  if (score >= 80) return "rgb(59, 130, 246)"; // blue-500
  if (score >= 70) return "rgb(234, 179, 8)"; // yellow-500
  if (score >= 60) return "rgb(249, 115, 22)"; // orange-500
  return "rgb(239, 68, 68)"; // red-500
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ATSAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    status: "idle",
  });
  const prefersReducedMotion = usePrefersReducedMotion();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["skills", "responsibilities"])
  );
  const [loadingStageIndex, setLoadingStageIndex] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMilestone, setLoadingMilestone] = useState<
    "idle" | "uploading" | "waiting" | "receiving" | "finalizing"
  >("idle");
  // serverReported progress and message are driven by backend stage events
  const [serverProgress, setServerProgress] = useState<number>(0);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [resultAnimState, setResultAnimState] = useState<
    "idle" | "enter" | "settled"
  >("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadingStages = [
    "Reading resume content",
    "Understanding job requirements",
    "Comparing experience and skills",
    "Evaluating alignment",
    "Finalizing results",
  ];

  useEffect(() => {
    // The loading UI is driven by backend stage events. We smooth the UI
    // progress toward the last server-reported value, but never advance
    // beyond it. This satisfies "don't fake progress with timers alone"
    // while keeping motion subtle.
    if (analysisState.status !== "loading") {
      setLoadingStageIndex(0);
      setLoadingProgress(0);
      setLoadingMilestone("idle");
      setServerProgress(0);
      setLoadingMessage("");
      return;
    }

    let cancelled = false;

    const tickMs = 90;
    const interval = window.setInterval(() => {
      if (cancelled) return;
      setLoadingProgress((current) => {
        if (prefersReducedMotion) return Math.min(100, serverProgress || current);
        // Smoothly approach serverProgress
        const target = Math.max(current, serverProgress || current);
        if (target <= current) return current;
        const delta = Math.max(0.4, Math.min(3, (target - current) / 6));
        const next = Math.min(target, current + delta);
        return Math.round(next * 100) / 100;
      });
    }, tickMs);

    // Keep a loose mapping for stage index for legacy stage list display; the
    // canonical source of truth for status text is `loadingMessage` which is
    // set from backend stage events.
    const stageInterval = window.setInterval(() => {
      if (cancelled) return;
      setLoadingStageIndex((prev) => {
        // Map serverProgress ranges to stage indices (rough)
        if (serverProgress >= 95) return Math.max(prev, 4);
        if (serverProgress >= 70) return Math.max(prev, 3);
        if (serverProgress >= 50) return Math.max(prev, 2);
        if (serverProgress >= 25) return Math.max(prev, 1);
        return Math.max(prev, 0);
      });
    }, 250);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.clearInterval(stageInterval);
    };
  }, [analysisState.status, prefersReducedMotion, serverProgress]);

  useEffect(() => {
    if (analysisState.status === "success") {
      setLoadingProgress(100);
    }
  }, [analysisState.status]);

  useEffect(() => {
    if (analysisState.status === "success") {
      if (prefersReducedMotion) {
        setResultAnimState("settled");
        return;
      }

      // First frame: set to enter; next tick: settle to trigger CSS transitions.
      setResultAnimState("enter");
      const t = window.setTimeout(() => setResultAnimState("settled"), 20);
      return () => window.clearTimeout(t);
    }

    setResultAnimState("idle");
  }, [analysisState.status, prefersReducedMotion]);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        // Validate file type
        if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
          setAnalysisState({
            status: "error",
            message: "Please upload a PDF or DOCX file.",
          });
          return;
        }
        // Validate file size
        if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
          const sizeMB = (selectedFile.size / 1024 / 1024).toFixed(1);
          setAnalysisState({
            status: "error",
            message: `File is too large (${sizeMB}MB). Maximum size is ${MAX_FILE_SIZE_DISPLAY}.`,
          });
          return;
        }
        setFile(selectedFile);
        // Clear previous error if any
        if (analysisState.status === "error") {
          setAnalysisState({ status: "idle" });
        }
      }
    },
    [analysisState.status]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        if (!ALLOWED_FILE_TYPES.includes(droppedFile.type)) {
          setAnalysisState({
            status: "error",
            message: "Please upload a PDF or DOCX file.",
          });
          return;
        }
        if (droppedFile.size > MAX_FILE_SIZE_BYTES) {
          const sizeMB = (droppedFile.size / 1024 / 1024).toFixed(1);
          setAnalysisState({
            status: "error",
            message: `File is too large (${sizeMB}MB). Maximum size is ${MAX_FILE_SIZE_DISPLAY}.`,
          });
          return;
        }
        setFile(droppedFile);
        if (analysisState.status === "error") {
          setAnalysisState({ status: "idle" });
        }
      }
    },
    [analysisState.status]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const clearFile = useCallback(() => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!file || !jobDescription.trim()) return;

    setLoadingStageIndex(0);
    setLoadingProgress(prefersReducedMotion ? 1 : 2);
    setLoadingMilestone("uploading");
    setAnalysisState({ status: "loading", step: "Working..." });

    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("jobDescription", jobDescription.trim());

      setLoadingMilestone("waiting");
      setAnalysisState({ status: "loading", step: "Working..." });

      const response = await fetch("/api/ats/analyze", {
        method: "POST",
        body: formData,
      });

      setLoadingMilestone("receiving");

      const result = await response.json();

      setLoadingMilestone("finalizing");

      if (!response.ok) {
        // Handle rate limiting with specific message
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          const retryMessage = retryAfter
            ? ` Please try again in ${Math.ceil(
                parseInt(retryAfter) / 60
              )} minute(s).`
            : "";
          throw new Error(
            result.error || `Rate limit exceeded.${retryMessage}`
          );
        }

        // Handle auth errors
        if (response.status === 401) {
          throw new Error("Please sign in to use ATS analysis.");
        }

        throw new Error(result.error || "Analysis failed. Please try again.");
      }

      // Completion: let the progress bar finish smoothly right when we have data.
      setLoadingProgress(100);
      setAnalysisState({ status: "success", data: result.data });
    } catch (err) {
      setLoadingMilestone("idle");
      setAnalysisState({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "An unexpected error occurred. Please try again.",
      });
    }
  }, [file, jobDescription, prefersReducedMotion]);

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="hidden"
                id="resume-upload"
              />

              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle2 className="size-5 text-green-500" />
                  <span className="text-sm font-medium truncate max-w-[200px]">
                    {file.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={clearFile}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <label htmlFor="resume-upload" className="cursor-pointer block">
                  <Upload className="size-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drop your resume here or{" "}
                    <span className="text-primary">browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF or DOCX (max 5MB)
                  </p>
                </label>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Job Description */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <FileText className="size-4" />
              Job Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Paste the relevant parts of the job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="min-h-[140px] resize-none"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {jobDescription.length < 50
                ? `${50 - jobDescription.length} more characters needed`
                : `${jobDescription.length.toLocaleString()} characters`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analyze Button */}
      {!isLoading && (
        <div className="flex justify-center">
          <Button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            size="lg"
            className="min-w-[200px]"
          >
            Analyze Resume
          </Button>
        </div>
      )}

      {/* Note */}
      <Card className="border-zinc-800/60 bg-zinc-900/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="size-5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Missing some required or preferred skills does not mean you
              shouldn&apos;t apply. Many students land internships from roles
              they didn&apos;t think they&apos;d even get an interview for. This
              tool is here to give you the best possible chance, not to filter
              you out.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {analysisState.status === "error" && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-500">Analysis Failed</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {analysisState.message}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card className="animate-in fade-in-0 duration-200">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="size-5 animate-spin text-primary" />
                <div className="flex flex-col">
                  <span className="text-sm">
                    {loadingMessage || loadingStages[loadingStageIndex]}…
                  </span>
                  <span className="text-xs text-muted-foreground">
                    This usually takes under a minute.
                  </span>
                </div>
              </div>

              {/* Progress bar: smooth, subtle, non-blocking */}
              <div className="space-y-1">
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/80 transition-[width] duration-300 ease-out"
                    style={{
                      width: `${Math.max(2, Math.min(100, loadingProgress))}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Working…</span>
                  <span>{Math.round(loadingProgress)}%</span>
                </div>
              </div>

              <div className="space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {analysisState.status === "success" && (
        <div
          className={
            prefersReducedMotion
              ? "space-y-6"
              : `space-y-6 transition-opacity duration-200 ease-out ${
                  resultAnimState === "enter" ? "opacity-0" : "opacity-100"
                }`
          }
        >
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
                      stroke={getScoreRingStroke(
                        analysisState.data.score.overallScore
                      )}
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
                      stroke={getScoreRingStroke(
                        analysisState.data.score.overallScore
                      )}
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
                      {analysisState.data.score.overallScore}
                    </span>
                    <span
                      className={`text-lg font-semibold ${getGradeColor(
                        analysisState.data.score.grade
                      )}`}
                    >
                      {analysisState.data.score.grade}
                    </span>
                  </div>
                </div>

                {/* Category Breakdown */}
                <div className="flex-1 w-full space-y-3">
                  {Object.entries(analysisState.data.score.breakdown).map(
                    ([key, category]) => (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {category.name}
                          </span>
                          <span className="font-medium">
                            {category.percentage}%
                          </span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getScoreColor(
                              category.percentage
                            )} transition-[width] duration-700 ease-out`}
                            style={{
                              width: showFilledBars
                                ? `${category.percentage}%`
                                : "0%",
                            }}
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Summary */}
              <p className="text-sm text-muted-foreground mt-4 pt-4 border-t border-zinc-800">
                {analysisState.data.score.summary}
              </p>
            </CardContent>
          </Card>

          {/* Skills Section */}
          <Card
            className={
              prefersReducedMotion
                ? undefined
                : `transition-all duration-200 ease-out delay-[40ms] ${
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
                    (
                    {
                      analysisState.data.details.skillComparison.matchedRequired
                        .length
                    }
                    /{analysisState.data.details.parsedJD.requiredSkillCount}{" "}
                    required)
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
                {analysisState.data.details.skillComparison.matchedRequired
                  .length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-green-500 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="size-4" />
                      Matched Required Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysisState.data.details.skillComparison.matchedRequired.map(
                        (skill) => (
                          <span
                            key={skill}
                            className="px-2 py-1 text-xs rounded-md bg-green-500/10 text-green-500 border border-green-500/20"
                          >
                            {skill}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Missing Required */}
                {analysisState.data.details.skillComparison.missingRequired
                  .length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-red-500 mb-2 flex items-center gap-2">
                      <XCircle className="size-4" />
                      Missing Required Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysisState.data.details.skillComparison.missingRequired.map(
                        (skill) => (
                          <span
                            key={skill}
                            className="px-2 py-1 text-xs rounded-md bg-red-500/10 text-red-500 border border-red-500/20"
                          >
                            {skill}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Matched Preferred */}
                {analysisState.data.details.skillComparison.matchedPreferred
                  .length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-blue-500 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="size-4" />
                      Matched Preferred Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysisState.data.details.skillComparison.matchedPreferred.map(
                        (skill) => (
                          <span
                            key={skill}
                            className="px-2 py-1 text-xs rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20"
                          >
                            {skill}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Missing Preferred */}
                {analysisState.data.details.skillComparison.missingPreferred
                  .length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-yellow-500 mb-2 flex items-center gap-2">
                      <AlertCircle className="size-4" />
                      Missing Preferred Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysisState.data.details.skillComparison.missingPreferred.map(
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
                {analysisState.data.details.skillComparison.extraSkills.length >
                  0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <Info className="size-4" />
                      Additional Skills (not in JD)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysisState.data.details.skillComparison.extraSkills
                        .slice(0, 10)
                        .map((skill) => (
                          <span
                            key={skill}
                            className="px-2 py-1 text-xs rounded-md bg-zinc-800 text-muted-foreground"
                          >
                            {skill}
                          </span>
                        ))}
                      {analysisState.data.details.skillComparison.extraSkills
                        .length > 10 && (
                        <span className="px-2 py-1 text-xs text-muted-foreground">
                          +
                          {analysisState.data.details.skillComparison
                            .extraSkills.length - 10}{" "}
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
                : `transition-all duration-200 ease-out delay-[80ms] ${
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
              <CardTitle className="text-base font-medium flex items-center justify-between">
                <span className="flex items-center gap-2">
                  Experience Alignment
                  <span className="text-xs text-muted-foreground font-normal">
                    (
                    {
                      analysisState.data.details.responsibilityCoverage.covered
                        .length
                    }
                    /{analysisState.data.details.parsedJD.responsibilityCount}{" "}
                    covered)
                  </span>
                </span>
                {expandedSections.has("responsibilities") ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </CardTitle>
            </CardHeader>
            {expandedSections.has("responsibilities") && (
              <CardContent className="pt-0 space-y-4">
                {/* Covered */}
                {analysisState.data.details.responsibilityCoverage.covered
                  .length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-green-500 flex items-center gap-2">
                      <CheckCircle2 className="size-4" />
                      Covered
                    </h4>
                    {analysisState.data.details.responsibilityCoverage.covered.map(
                      (item, i) => (
                        <div
                          key={i}
                          className="pl-6 border-l-2 border-green-500/30 py-1"
                        >
                          <p className="text-sm">{item.responsibility}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.explanation}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* Weakly Covered */}
                {analysisState.data.details.responsibilityCoverage.weaklyCovered
                  .length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-yellow-500 flex items-center gap-2">
                      <AlertCircle className="size-4" />
                      Partially Covered
                    </h4>
                    {analysisState.data.details.responsibilityCoverage.weaklyCovered.map(
                      (item, i) => (
                        <div
                          key={i}
                          className="pl-6 border-l-2 border-yellow-500/30 py-1"
                        >
                          <p className="text-sm">{item.responsibility}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.explanation}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* Not Covered */}
                {analysisState.data.details.responsibilityCoverage.notCovered
                  .length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-red-500 flex items-center gap-2">
                      <XCircle className="size-4" />
                      Not Covered
                    </h4>
                    {analysisState.data.details.responsibilityCoverage.notCovered.map(
                      (item, i) => (
                        <div
                          key={i}
                          className="pl-6 border-l-2 border-red-500/30 py-1"
                        >
                          <p className="text-sm">{item.responsibility}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.explanation}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Deductions / Explainability Section */}
          {(() => {
            const score = analysisState.data.score;
            const hasItemizedDeductions = score.allDeductions.length > 0;
            const shouldShowExplainability = score.overallScore < 100;

            if (!shouldShowExplainability) return null;

            const breakdownEntries = Object.entries(score.breakdown)
              .map(([key, category]) => {
                const pointsLost = Math.max(
                  0,
                  Math.round(category.weight - category.weightedScore)
                );
                return { key, category, pointsLost };
              })
              .filter((x) => x.pointsLost > 0)
              .sort((a, b) => b.pointsLost - a.pointsLost);

            const missingPreferredCount =
              analysisState.data.details.skillComparison.missingPreferred
                ?.length ?? 0;

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
                      {hasItemizedDeductions
                        ? "Points Deduction"
                        : "Where points went"}
                      {hasItemizedDeductions && (
                        <span className="text-xs text-muted-foreground font-normal">
                          ({analysisState.data.score.allDeductions.length}{" "}
                          items)
                        </span>
                      )}
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
                    {hasItemizedDeductions ? (
                      <>
                        <p className="text-xs text-muted-foreground mb-3">
                          These are the concrete reasons points were deducted
                          from the overall score.
                        </p>
                        <div className="space-y-2">
                          {analysisState.data.score.allDeductions
                            .sort((a, b) => b.points - a.points)
                            .slice(0, 10)
                            .map((deduction, i) => (
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
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground mb-3">
                          This job description reduced your score mainly through
                          category weighting (e.g., preferred skills), even
                          though there weren&apos;t specific
                          &quot;deduction&quot; items.
                        </p>

                        {missingPreferredCount > 0 && (
                          <p className="text-xs text-muted-foreground mb-3">
                            Missing preferred skills: {missingPreferredCount}
                          </p>
                        )}

                        <div className="space-y-2">
                          {breakdownEntries.length > 0 ? (
                            breakdownEntries.slice(0, 10).map((entry) => (
                              <div
                                key={entry.key}
                                className="flex items-start justify-between gap-4 text-sm py-1"
                              >
                                <span className="text-muted-foreground">
                                  {entry.category.name}
                                </span>
                                <span className="text-red-500 shrink-0">
                                  -{entry.pointsLost} pts
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No scored categories reported point loss.
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })()}
        </div>
      )}
    </div>
  );
}
