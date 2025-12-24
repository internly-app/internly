"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
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
    if (analysisState.status !== "loading") {
      setLoadingStageIndex(0);
      setLoadingProgress(0);
      return;
    }

    // Stage timings are intentionally "loose" — they should feel real-time
    // without implying exact internal steps.
    const stageDurationsMs = [900, 1100, 1400, 1200, 1000];
    let stage = 0;
    let cancelled = false;

    setLoadingStageIndex(0);
    setLoadingProgress(prefersReducedMotion ? 1 : 2);

    const progressCap = 94; // Don't reach 100% until we actually complete.
    const tickMs = 80;

    const interval = window.setInterval(() => {
      if (cancelled) return;

      setLoadingProgress((p) => {
        if (prefersReducedMotion) return Math.min(100, p);

        // Map each stage to a target range of the progress bar.
        const stageEndPct = ((stage + 1) / loadingStages.length) * 100;
        const target = Math.min(progressCap, stageEndPct - 1);

        // Ease towards the target; smaller deltas as we approach the cap.
        const remaining = target - p;
        const delta = Math.max(0.25, Math.min(2.0, remaining / 12));
        return Math.min(target, p + delta);
      });
    }, tickMs);

    const timeouts: number[] = [];
    let elapsed = 0;
    for (let i = 0; i < stageDurationsMs.length; i++) {
      elapsed += stageDurationsMs[i];
      const t = window.setTimeout(() => {
        if (cancelled) return;
        stage = Math.min(i + 1, loadingStages.length - 1);
        setLoadingStageIndex(stage);
      }, elapsed);
      timeouts.push(t);
    }

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      for (const t of timeouts) window.clearTimeout(t);
    };
  }, [analysisState.status, prefersReducedMotion, loadingStages.length]);

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

    setAnalysisState({ status: "loading", step: "Uploading resume..." });

    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("jobDescription", jobDescription.trim());

      setAnalysisState({ status: "loading", step: "Analyzing resume..." });

      const response = await fetch("/api/ats/analyze", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

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

      setAnalysisState({ status: "success", data: result.data });
    } catch (err) {
      setAnalysisState({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "An unexpected error occurred. Please try again.",
      });
    }
  }, [file, jobDescription]);

  const canAnalyze =
    file &&
    jobDescription.trim().length >= MIN_JD_LENGTH &&
    analysisState.status !== "loading";

  const isLoading = analysisState.status === "loading";

  const scoreStroke =
    analysisState.status === "success"
      ? analysisState.data.score.overallScore * 2.64
      : 0;

  const ringStrokeDasharray =
    prefersReducedMotion || resultAnimState === "settled"
      ? `${scoreStroke} 264`
      : `0 264`;

  const showFilledBars = prefersReducedMotion || resultAnimState === "settled";

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Resume Upload */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <FileText className="size-4" />
              Resume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`
                border-2 border-dashed rounded-lg p-6 text-center transition-colors
                ${
                  file
                    ? "border-green-500/50 bg-green-500/5"
                    : "border-zinc-700 hover:border-zinc-600"
                }
              `}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
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
                    {loadingStages[loadingStageIndex]}…
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
                    <circle
                      className="stroke-zinc-800"
                      strokeWidth="8"
                      fill="none"
                      cx="50"
                      cy="50"
                      r="42"
                    />
                    <circle
                      className={`${getScoreColor(
                        analysisState.data.score.overallScore
                      )} transition-[stroke-dasharray] duration-700 ease-out`}
                      strokeWidth="8"
                      strokeLinecap="round"
                      fill="none"
                      cx="50"
                      cy="50"
                      r="42"
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

          {/* Deductions Section */}
          {analysisState.data.score.allDeductions.length > 0 && (
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
                    Points Deduction
                    <span className="text-xs text-muted-foreground font-normal">
                      ({analysisState.data.score.allDeductions.length} items)
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
                  <p className="text-xs text-muted-foreground mb-3">
                    These are the concrete reasons points were deducted from the
                    overall score.
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
                </CardContent>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
