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

// Deterministic loading cycles (frontend-only)
// - Phase 1: fast ramp to ~35–45% within the first second
// - Phase 2: slow/uneven increments with pauses to ~80–90%
// - Phase 3: very slow creep toward ~92-95% while waiting for backend

const LOADING_CYCLES: ReadonlyArray<ReadonlyArray<LoadingCheckpoint>> = [
  // Cycle A - has pauses at 28%, 52%, and 74%
  [
    { atMs: 0, percent: 0, message: "Preparing analysis" },
    { atMs: 180, percent: 12, message: "Reading resume content" },
    { atMs: 380, percent: 22, message: "Parsing resume structure" },
    { atMs: 600, percent: 28, message: "Parsing resume structure" }, // pause
    { atMs: 950, percent: 28, message: "Extracting text content" }, // hold
    { atMs: 1150, percent: 38, message: "Reading job description" },
    { atMs: 1550, percent: 48, message: "Extracting skills and experience" },
    { atMs: 1900, percent: 52, message: "Extracting skills and experience" }, // pause
    { atMs: 2400, percent: 52, message: "Analyzing requirements" }, // hold
    { atMs: 2650, percent: 61, message: "Evaluating requirements match" },
    { atMs: 3100, percent: 68, message: "Comparing keywords" },
    { atMs: 3500, percent: 74, message: "Comparing keywords" }, // pause
    { atMs: 4100, percent: 74, message: "Calculating alignment" }, // hold
    { atMs: 4400, percent: 81, message: "Calculating ATS score" },
    { atMs: 5000, percent: 86, message: "Finalizing analysis" },
    { atMs: 5800, percent: 89, message: "Almost done" },
  ],
  // Cycle B - has pauses at 34%, 58%, and 78%
  [
    { atMs: 0, percent: 0, message: "Preparing analysis" },
    { atMs: 200, percent: 15, message: "Reading resume content" },
    { atMs: 450, percent: 26, message: "Parsing resume structure" },
    { atMs: 700, percent: 34, message: "Reading job description" },
    { atMs: 1100, percent: 34, message: "Reading job description" }, // pause
    { atMs: 1400, percent: 34, message: "Analyzing job requirements" }, // hold
    { atMs: 1650, percent: 45, message: "Extracting skills and experience" },
    { atMs: 2050, percent: 52, message: "Evaluating requirements match" },
    { atMs: 2450, percent: 58, message: "Evaluating requirements match" }, // pause
    { atMs: 2950, percent: 58, message: "Cross-referencing experience" }, // hold
    { atMs: 3250, percent: 67, message: "Comparing keywords" },
    { atMs: 3700, percent: 73, message: "Calculating alignment" },
    { atMs: 4100, percent: 78, message: "Calculating ATS score" },
    { atMs: 4600, percent: 78, message: "Calculating ATS score" }, // pause
    { atMs: 5000, percent: 84, message: "Finalizing analysis" },
    { atMs: 5600, percent: 88, message: "Almost done" },
  ],
  // Cycle C - has pauses at 31%, 55%, and 72%
  [
    { atMs: 0, percent: 0, message: "Preparing analysis" },
    { atMs: 160, percent: 10, message: "Reading resume content" },
    { atMs: 340, percent: 19, message: "Parsing resume structure" },
    { atMs: 580, percent: 31, message: "Reading job description" },
    { atMs: 900, percent: 31, message: "Reading job description" }, // pause
    { atMs: 1300, percent: 31, message: "Processing document" }, // hold
    { atMs: 1500, percent: 42, message: "Extracting skills and experience" },
    { atMs: 1900, percent: 49, message: "Evaluating requirements match" },
    { atMs: 2300, percent: 55, message: "Evaluating requirements match" }, // pause
    { atMs: 2700, percent: 55, message: "Matching experience bullets" }, // hold
    { atMs: 3000, percent: 64, message: "Comparing keywords" },
    { atMs: 3500, percent: 72, message: "Calculating alignment" },
    { atMs: 3900, percent: 72, message: "Calculating alignment" }, // pause
    { atMs: 4300, percent: 79, message: "Calculating ATS score" },
    { atMs: 4800, percent: 85, message: "Finalizing analysis" },
    { atMs: 5500, percent: 90, message: "Almost done" },
  ],
];

function pickCycleIndex(): number {
  // Prefer crypto randomness when available, otherwise fallback to Math.random.
  try {
    const buf = new Uint32Array(1);
    window.crypto.getRandomValues(buf);
    return buf[0] % LOADING_CYCLES.length;
  } catch {
    return Math.floor(Math.random() * LOADING_CYCLES.length);
  }
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
  const [activeCycleIndex, setActiveCycleIndex] = useState<number>(0);
  const [backendDone, setBackendDone] = useState(false);
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
    // Deterministic loading loop driven by one of three predefined cycles.
    // This intentionally does NOT reflect backend timing; it only provides
    // a realistic, consistent UX while waiting for the request to finish.
    if (analysisState.status !== "loading") {
      setLoadingStageIndex(0);
      setLoadingProgress(0);
      setLoadingMessage("");
      setBackendDone(false);
      return;
    }

    const cycle = LOADING_CYCLES[activeCycleIndex] ?? LOADING_CYCLES[0];
    const start = performance.now();
    let cancelled = false;

    // Phase 3: cap that we creep toward while waiting for backend, to avoid
    // hitting 100% before the response. Goes up to ~92-95% for realistic feel.
    const phase3Cap = Math.min(
      94,
      Math.max(91, cycle[cycle.length - 1]?.percent ?? 90)
    );

    const tick = () => {
      if (cancelled) return;

      const elapsed = performance.now() - start;

      // Find the last checkpoint we should be at.
      let checkpointIndex = 0;
      for (let i = 0; i < cycle.length; i++) {
        if (elapsed >= cycle[i].atMs) checkpointIndex = i;
      }

      const cp = cycle[checkpointIndex];
      // Update message only at checkpoints (not every frame)
      setLoadingMessage((prev) => (prev === cp.message ? prev : cp.message));

      // Map checkpoint index to a stable "stage" in the UI.
      setLoadingStageIndex(() => {
        if (checkpointIndex >= cycle.length - 1) return 4;
        if (checkpointIndex >= Math.floor((cycle.length - 1) * 0.75)) return 3;
        if (checkpointIndex >= Math.floor((cycle.length - 1) * 0.45)) return 2;
        if (checkpointIndex >= 1) return 1;
        return 0;
      });

      // Smoothly approach the current checkpoint percent, but never go backwards.
      setLoadingProgress((current) => {
        const target = Math.max(current, cp.percent);

        // If backend isn't done, prevent progress from going beyond phase3Cap.
        const cappedTarget = backendDone ? target : Math.min(target, phase3Cap);

        if (prefersReducedMotion) return Math.round(cappedTarget);
        if (cappedTarget <= current) return current;

        // Ease toward target in small steps (lightweight)
        const delta = Math.max(
          0.6,
          Math.min(2.4, (cappedTarget - current) / 7)
        );
        const next = Math.min(cappedTarget, current + delta);
        return Math.round(next * 100) / 100;
      });

      // Phase 3 creep: slow movement with micro-pauses while waiting for backend.
      // Creates realistic "processing" feel by occasionally pausing.
      if (!backendDone) {
        setLoadingProgress((current) => {
          if (prefersReducedMotion) return current;
          if (current >= phase3Cap) return current;

          // Create micro-pauses: ~30% of ticks do nothing (simulates processing)
          const tick = Math.floor(elapsed / 90);
          const shouldPause = tick % 5 === 0 || tick % 7 === 0;
          if (shouldPause && current > 85) return current; // more pauses near the end

          // Variable creep speed: slower as we get closer to the cap
          const remaining = phase3Cap - current;
          const creepRate = remaining > 5 ? 0.12 : remaining > 2 ? 0.06 : 0.03;
          const next = Math.min(phase3Cap, current + creepRate);
          return Math.round(next * 100) / 100;
        });
      }
    };

    tick();
    const interval = window.setInterval(tick, prefersReducedMotion ? 180 : 90);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [
    analysisState.status,
    activeCycleIndex,
    backendDone,
    prefersReducedMotion,
  ]);

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

    const cycleIdx = pickCycleIndex();
    setActiveCycleIndex(cycleIdx);
    setBackendDone(false);
    setLoadingStageIndex(0);
    setLoadingProgress(0);
    setLoadingMessage(
      LOADING_CYCLES[cycleIdx]?.[0]?.message ?? "Preparing analysis"
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
        setBackendDone(true);
        // Smooth complete to 100
        setLoadingMessage("Finalizing analysis");
        setLoadingProgress((p) => Math.max(p, 92));
        await new Promise((r) =>
          window.setTimeout(r, prefersReducedMotion ? 0 : 220)
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

      // Completion: smoothly animate to 100% once the backend is done.
      setBackendDone(true);
      setLoadingMessage("Finalizing analysis");
      setLoadingProgress((p) => Math.max(p, 92));
      await new Promise((r) =>
        window.setTimeout(r, prefersReducedMotion ? 0 : 220)
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
                    ([key, category]) => {
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
            const deductions = score.deductions || [];
            const shouldShowExplainability =
              score.overallScore < 100 && deductions.length > 0;

            if (!shouldShowExplainability) return null;

            // Total points lost equals sum of deductions (guaranteed by new scoring)
            const totalPointsLost = deductions.reduce(
              (sum, d) => sum + (Number.isFinite(d.points) ? d.points : 0),
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
                      {deductions
                        .sort((a, b) => b.points - a.points)
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
            );
          })()}
        </div>
      )}
    </div>
  );
}
