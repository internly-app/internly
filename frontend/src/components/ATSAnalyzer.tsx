"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  X,
} from "lucide-react";
import type { ATSAnalysisResponse } from "@/lib/ats/types";
import type {
  ScoreDeduction,
  CategoryBreakdown,
} from "@/lib/ats/calculate-score";

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
  | { status: "loading" }
  | { status: "success"; data: ATSAnalysisResponse }
  | { status: "error"; message: string };

type AtsStageEvent = {
  stage?: string;
  message?: string;
  progress?: number;
  done?: boolean;
  data?: ATSAnalysisResponse;
  error?: string;
  status?: number;
};

type LoadingCheckpoint = {
  atMs: number;
  percent: number;
  message: string;
};

// Base loading checkpoints - will be jittered per run for variation
const BASE_LOADING_CHECKPOINTS: ReadonlyArray<LoadingCheckpoint> = [
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
function applyLoadingJitter(): LoadingCheckpoint[] {
  const jitterFactor = 0.85 + Math.random() * 0.3; // 0.85 to 1.15
  return BASE_LOADING_CHECKPOINTS.map((cp, idx) => ({
    ...cp,
    // Don't jitter the first checkpoint (always start at 0)
    atMs: idx === 0 ? 0 : Math.round(cp.atMs * jitterFactor),
  }));
}

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
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [loadingAnimState, setLoadingAnimState] = useState<
    "idle" | "enter" | "exit"
  >("idle");
  const [resultAnimState, setResultAnimState] = useState<
    "idle" | "enter" | "settled"
  >("idle");
  const [barsFilled, setBarsFilled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadingStages = [
    "Reading resume content",
    "Understanding job requirements",
    "Comparing experience and skills",
    "Evaluating alignment",
    "Finalizing results",
  ];

  useEffect(() => {
    // Smooth loading progression with gradual transitions
    if (analysisState.status !== "loading") {
      setLoadingStageIndex(0);
      setLoadingProgress(0);
      setLoadingMessage("");
      return;
    }

    // Apply jitter once per loading session for natural variation
    const checkpoints = applyLoadingJitter();
    const start = performance.now();
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;

      const elapsed = performance.now() - start;

      // Find current and next checkpoint for smooth interpolation
      let cpIndex = 0;
      for (let i = 0; i < checkpoints.length; i++) {
        if (elapsed >= checkpoints[i].atMs) cpIndex = i;
      }

      const currentCp = checkpoints[cpIndex];
      const nextCp = checkpoints[cpIndex + 1];

      // Update message
      setLoadingMessage(currentCp.message);

      // Map to stage index for the UI dots
      const stageProgress = cpIndex / (checkpoints.length - 1);
      setLoadingStageIndex(Math.min(4, Math.floor(stageProgress * 5)));

      // Smooth interpolation between checkpoints
      if (nextCp) {
        const segmentDuration = nextCp.atMs - currentCp.atMs;
        const segmentElapsed = elapsed - currentCp.atMs;
        const segmentProgress = Math.min(1, segmentElapsed / segmentDuration);

        // Ease-out for smoother feel
        const easedProgress = 1 - Math.pow(1 - segmentProgress, 2);
        const interpolatedPercent =
          currentCp.percent +
          (nextCp.percent - currentCp.percent) * easedProgress;

        setLoadingProgress(Math.round(interpolatedPercent * 10) / 10);
      } else {
        setLoadingProgress(currentCp.percent);
      }
    };

    tick();
    const interval = window.setInterval(tick, 50); // Smoother updates

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [analysisState.status]);

  useEffect(() => {
    if (analysisState.status === "loading") {
      if (prefersReducedMotion) {
        setLoadingAnimState("enter");
        return;
      }

      // Ensure fade-in triggers reliably.
      setLoadingAnimState("idle");
      const raf = window.requestAnimationFrame(() =>
        setLoadingAnimState("enter")
      );
      return () => window.cancelAnimationFrame(raf);
    }

    if (analysisState.status === "success") {
      setLoadingAnimState("exit");
      return;
    }

    setLoadingAnimState("idle");
  }, [analysisState.status, prefersReducedMotion]);

  useEffect(() => {
    if (analysisState.status === "success") {
      setLoadingProgress(100);
    }
  }, [analysisState.status]);

  useEffect(() => {
    if (analysisState.status === "success") {
      if (prefersReducedMotion) {
        setResultAnimState("settled");
        setBarsFilled(true);
        return;
      }

      // First frame: set to enter; next tick: settle to trigger CSS transitions.
      setResultAnimState("enter");
      setBarsFilled(false);

      // Use rAF (not a timer) to ensure the initial 0% width is committed,
      // then transition to the real percentage.
      let raf1 = 0;
      let raf2 = 0;
      raf1 = window.requestAnimationFrame(() => {
        raf2 = window.requestAnimationFrame(() => {
          setResultAnimState("settled");
          setBarsFilled(true);
        });
      });

      return () => {
        window.cancelAnimationFrame(raf1);
        window.cancelAnimationFrame(raf2);
      };
    }

    setResultAnimState("idle");
    setBarsFilled(false);
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
    setLoadingProgress(0);
    setLoadingMessage(
      BASE_LOADING_CHECKPOINTS[0]?.message ?? "Preparing analysis"
    );
    setAnalysisState({ status: "loading" });

    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("jobDescription", jobDescription.trim());

      const response = await fetch("/api/ats/analyze", {
        method: "POST",
        body: formData,
      });

      // If the server doesn't stream, fall back to JSON.
      const contentType = response.headers.get("Content-Type") || "";
      const isNdjson = contentType.includes("application/x-ndjson");

      // Non-OK responses: try to parse a JSON error body.
      if (!response.ok && !isNdjson) {
        let msg = "Analysis failed. Please try again.";
        try {
          const errJson = (await response.json()) as { error?: string };
          if (errJson?.error) msg = errJson.error;
        } catch {
          // ignore parsing errors
        }
        throw new Error(msg);
      }

      if (!isNdjson) {
        // JSON success path
        const result = (await response.json()) as { data: ATSAnalysisResponse };
        // Jump to near-complete then 100%
        setLoadingMessage("Finalizing");
        setLoadingProgress(95);
        await new Promise((r) =>
          window.setTimeout(r, prefersReducedMotion ? 0 : 200)
        );
        setLoadingProgress(100);
        setAnalysisState({ status: "success", data: result.data });
        return;
      }

      if (!response.body) {
        throw new Error("No response body from server.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalData: ATSAnalysisResponse | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines only
        while (true) {
          const newlineIndex = buffer.indexOf("\n");
          if (newlineIndex === -1) break;

          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (!line) continue;

          let evt: AtsStageEvent | null = null;
          try {
            evt = JSON.parse(line) as AtsStageEvent;
          } catch {
            continue;
          }

          if (evt.error) {
            // streamed error
            const status = evt.status;
            const msg = evt.error;
            if (status === 401)
              throw new Error("Please sign in to use ATS analysis.");
            if (status === 429)
              throw new Error(
                "Rate limit exceeded. Please try again in a bit."
              );
            throw new Error(msg);
          }

          if (evt.done && evt.data) {
            finalData = evt.data;
          }
        }
      }

      if (!finalData) {
        throw new Error("Analysis did not complete. Please try again.");
      }

      // Jump to near-complete then 100%
      setLoadingMessage("Finalizing");
      setLoadingProgress(95);
      await new Promise((r) =>
        window.setTimeout(r, prefersReducedMotion ? 0 : 200)
      );
      setLoadingProgress(100);
      setAnalysisState({ status: "success", data: finalData });
    } catch (err) {
      setAnalysisState({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "An unexpected error occurred. Please try again.",
      });
    }
  }, [file, jobDescription, prefersReducedMotion]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const isLoading = analysisState.status === "loading";
  const canAnalyze =
    Boolean(file) && jobDescription.trim().length >= MIN_JD_LENGTH;

  // Score ring stroke values (used by the results view)
  const ringRadius = 42;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringScore =
    analysisState.status === "success"
      ? analysisState.data.score.overallScore
      : 0;
  const ringStrokeDasharray = `${
    (ringScore / 100) * ringCircumference
  } ${ringCircumference}`;

  const showFilledBars = prefersReducedMotion ? true : barsFilled;

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Upload className="size-4" />
              Resume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="border border-dashed border-zinc-700 rounded-lg p-6 text-center hover:border-zinc-500 transition-colors"
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
                disabled={isLoading}
              />

              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle2 className="size-5 text-green-500" />
                  <span className="text-sm font-medium truncate max-w-[240px]">
                    {file.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={clearFile}
                    disabled={isLoading}
                    aria-label="Remove resume"
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
                    PDF or DOCX (max {MAX_FILE_SIZE_DISPLAY})
                  </p>
                </label>
              )}
            </div>
          </CardContent>
        </Card>

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
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {jobDescription.length < MIN_JD_LENGTH
                ? `${
                    MIN_JD_LENGTH - jobDescription.length
                  } more characters needed`
                : `${jobDescription.length.toLocaleString()} characters`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analyze */}
      {!isLoading && (
        <div className="flex justify-center">
          <Button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            size="lg"
            className="min-w-[220px]"
          >
            Analyze Resume
          </Button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <Card
          className={
            prefersReducedMotion
              ? undefined
              : `transition-opacity duration-200 ease-out ${
                  loadingAnimState === "enter"
                    ? "opacity-100"
                    : loadingAnimState === "exit"
                    ? "opacity-0"
                    : "opacity-0"
                }`
          }
        >
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

      {/* Error */}
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
          {/* Encouragement note - shown at the top so people see it */}
          <p className="text-sm text-muted-foreground flex items-start gap-2 bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <Info className="size-4 shrink-0 mt-0.5 text-blue-400" />
            <span>
              Missing some required or preferred skills does not mean you
              shouldn&apos;t apply. Many students land internships from roles
              they didn&apos;t think they&apos;d even get an interview for. This
              tool is here to give you the best possible chance, not to filter
              you out.
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
                {analysisState.data.score.summary}
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
                        (match) => (
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
                const covered =
                  analysisState.data.details.responsibilityCoverage.covered;
                const weaklyCovered =
                  analysisState.data.details.responsibilityCoverage
                    .weaklyCovered;

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
                const totalFromJD =
                  analysisState.data.details.parsedJD.responsibilityCount;

                // Prefer what we actually display (unique covered + partially covered).
                // Fall back to JD count if the matcher returned fewer items (e.g., model omission).
                const totalResponsibilities = Math.max(
                  totalUnique,
                  totalFromJD
                );

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
                {analysisState.data.details.responsibilityCoverage.covered
                  .length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-green-500 flex items-center gap-2">
                      <CheckCircle2 className="size-4" />
                      Covered
                    </h4>
                    {analysisState.data.details.responsibilityCoverage.covered
                      .filter((item, idx, arr) => {
                        const r = item.responsibility.trim();
                        if (!r) return false;
                        return (
                          arr.findIndex(
                            (x) => x.responsibility.trim() === r
                          ) === idx
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
                {analysisState.data.details.responsibilityCoverage.weaklyCovered
                  .length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-yellow-500 flex items-center gap-2">
                      <AlertCircle className="size-4" />
                      Partially Covered
                    </h4>
                    {analysisState.data.details.responsibilityCoverage.weaklyCovered
                      .filter((item, idx, arr) => {
                        const r = item.responsibility.trim();
                        if (!r) return false;
                        return (
                          arr.findIndex(
                            (x) => x.responsibility.trim() === r
                          ) === idx
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
                {analysisState.data.details.responsibilityCoverage.notCovered
                  .length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-red-500 flex items-center gap-2">
                      <XCircle className="size-4" />
                      Not Covered
                    </h4>
                    {analysisState.data.details.responsibilityCoverage.notCovered
                      .filter((item, idx, arr) => {
                        const r = item.responsibility.trim();
                        if (!r) return false;
                        return (
                          arr.findIndex(
                            (x) => x.responsibility.trim() === r
                          ) === idx
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
            const score = analysisState.data.score;
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
        </div>
      )}
    </div>
  );
}
