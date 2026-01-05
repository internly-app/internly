"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AtsErrorCard from "@/components/ats/AtsErrorCard";
import AtsInputs from "@/components/ats/AtsInputs";
import AtsLoadingCard from "@/components/ats/AtsLoadingCard";
import AtsResults from "@/components/ats/AtsResults";
import {
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_DISPLAY,
  MIN_JD_LENGTH,
} from "@/components/ats/ats-analyzer.constants";
import {
  applyLoadingJitter,
  BASE_LOADING_CHECKPOINTS,
} from "@/components/ats/ats-analyzer.helpers";
import usePrefersReducedMotion from "@/components/ats/usePrefersReducedMotion";
import type { ATSAnalysisResponse } from "@/lib/ats/types";

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

export default function ATSAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [persistedFileName, setPersistedFileName] = useState<string | null>(
    null
  );
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
  const STORAGE_KEY = "ats_analysis_state";

  const loadingStages = [
    "Uploading resume",
    "Extracting text",
    "Analyzing vs job description",
    "Finalizing results",
  ];

  // Hydrate state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { jobDescription: storedJd, data, fileName } = JSON.parse(stored);
        if (storedJd && data) {
          setJobDescription(storedJd);
          setAnalysisState({ status: "success", data });
          if (fileName) setPersistedFileName(fileName);
        }
      }
    } catch (err) {
      console.error("Failed to hydrate ATS state:", err);
      localStorage.removeItem(STORAGE_KEY);
    }

    // Listen for auth changes to clear storage on sign out
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        localStorage.removeItem(STORAGE_KEY);
        setJobDescription("");
        setFile(null);
        setPersistedFileName(null);
        setAnalysisState({ status: "idle" });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (analysisState.status !== "loading") {
      setLoadingStageIndex(0);
      setLoadingProgress(0);
      setLoadingMessage("");
      return;
    }

    const checkpoints = applyLoadingJitter();
    const start = performance.now();
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;

      const elapsed = performance.now() - start;

      let cpIndex = 0;
      for (let i = 0; i < checkpoints.length; i++) {
        if (elapsed >= checkpoints[i].atMs) cpIndex = i;
      }

      const currentCp = checkpoints[cpIndex];

      // Calculate progress for internal state (even if not shown in UI)
      setLoadingProgress(currentCp.percent);

      // Map time to stages (approximate duration mapping)
      // 0-2s: Uploading
      // 2-5s: Extracting
      // 5-12s: Analyzing
      // 12s+: Finalizing
      let newStageIndex = 0;
      if (elapsed > 2000) newStageIndex = 1;
      if (elapsed > 5000) newStageIndex = 2;
      if (elapsed > 12000) newStageIndex = 3;

      setLoadingStageIndex(newStageIndex);
      setLoadingMessage(loadingStages[newStageIndex]);
    };

    tick();
    const interval = window.setInterval(tick, 50);
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
    if (analysisState.status === "success") setLoadingProgress(100);
  }, [analysisState.status]);

  useEffect(() => {
    if (analysisState.status === "success") {
      if (prefersReducedMotion) {
        setResultAnimState("settled");
        setBarsFilled(true);
        return;
      }

      setResultAnimState("enter");
      setBarsFilled(false);

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
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
        setAnalysisState({
          status: "error",
          message: "Please upload a PDF or DOCX file.",
        });
        return;
      }

      if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
        const sizeMB = (selectedFile.size / 1024 / 1024).toFixed(1);
        setAnalysisState({
          status: "error",
          message: `File is too large (${sizeMB}MB). Maximum size is ${MAX_FILE_SIZE_DISPLAY}.`,
        });
        return;
      }

      setFile(selectedFile);
      if (analysisState.status === "error")
        setAnalysisState({ status: "idle" });
    },
    [analysisState.status]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (!droppedFile) return;

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
      if (analysisState.status === "error")
        setAnalysisState({ status: "idle" });
    },
    [analysisState.status]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const clearFile = useCallback(() => {
    setFile(null);
    setPersistedFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    // If we clear the file, we should probably clear the analysis too?
    // Or just let them upload a new one.
    // The user requirement says "Clear stored data only when user edits JD or clicks Analyze again."
    // But if they clear the file, they probably intend to start over.
    // Let's keep the analysis for now unless they upload a new file.
  }, []);

  const handleJobDescriptionChange = useCallback((value: string) => {
    setJobDescription(value);
    // Clear stored data when user edits JD
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (
      (!file && !persistedFileName) ||
      jobDescription.trim().length < MIN_JD_LENGTH
    )
      return;

    // If we have a persisted file but no actual file object, we can't re-analyze.
    // The user must upload a file.
    if (!file) {
      setAnalysisState({
        status: "error",
        message: "Please upload your resume again to re-analyze.",
      });
      return;
    }

    // Clear stored data when starting new analysis
    localStorage.removeItem(STORAGE_KEY);

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

      const contentType = response.headers.get("Content-Type") || "";
      const isNdjson = contentType.includes("application/x-ndjson");

      if (!response.ok && !isNdjson) {
        let msg = "Analysis failed. Please try again.";
        try {
          const errJson = (await response.json()) as { error?: string };
          if (errJson?.error) msg = errJson.error;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      if (!isNdjson) {
        const result = (await response.json()) as { data: ATSAnalysisResponse };
        setLoadingMessage("Finalizing");
        setLoadingProgress(95);
        await new Promise((r) =>
          window.setTimeout(r, prefersReducedMotion ? 0 : 200)
        );
        setLoadingProgress(100);
        setAnalysisState({ status: "success", data: result.data });
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            jobDescription: jobDescription.trim(),
            data: result.data,
            fileName: file?.name,
          })
        );
        return;
      }

      if (!response.body) throw new Error("No response body from server.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalData: ATSAnalysisResponse | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

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
            const status = evt.status;
            if (status === 401)
              throw new Error("Please sign in to use ATS analysis.");
            if (status === 429)
              throw new Error(
                "Rate limit exceeded. Please try again in a bit."
              );
            throw new Error(evt.error);
          }

          if (typeof evt.message === "string" && evt.message.trim()) {
            setLoadingMessage(evt.message);
          }
          if (
            typeof evt.progress === "number" &&
            Number.isFinite(evt.progress)
          ) {
            const progress = evt.progress;
            setLoadingProgress((prev) => Math.max(prev, progress));
          }

          if (evt.done && evt.data) {
            finalData = evt.data;
          }
        }
      }

      if (!finalData) {
        throw new Error("Analysis did not complete. Please try again.");
      }

      setLoadingMessage("Finalizing");
      setLoadingProgress(100);
      setAnalysisState({ status: "success", data: finalData });
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          jobDescription: jobDescription.trim(),
          data: finalData,
          fileName: file?.name,
        })
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed.";
      setAnalysisState({ status: "error", message });
    }
  }, [file, jobDescription, prefersReducedMotion]);

  const isLoading = analysisState.status === "loading";
  const canAnalyze =
    (Boolean(file) || Boolean(persistedFileName)) &&
    jobDescription.trim().length >= MIN_JD_LENGTH;

  return (
    <div className="space-y-6">
      <AtsInputs
        file={file}
        persistedFileName={persistedFileName}
        isLoading={isLoading}
        jobDescription={jobDescription}
        onJobDescriptionChange={handleJobDescriptionChange}
        minJdLength={MIN_JD_LENGTH}
        maxFileSizeDisplay={MAX_FILE_SIZE_DISPLAY}
        canAnalyze={canAnalyze}
        onAnalyze={handleAnalyze}
        fileInputRef={fileInputRef}
        onFileChange={handleFileChange}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClearFile={clearFile}
      />

      {isLoading && (
        <AtsLoadingCard
          prefersReducedMotion={prefersReducedMotion}
          loadingAnimState={loadingAnimState}
          loadingMessage={loadingMessage}
          loadingStages={loadingStages}
          loadingStageIndex={loadingStageIndex}
          loadingProgress={loadingProgress}
        />
      )}

      {analysisState.status === "error" && (
        <AtsErrorCard message={analysisState.message} />
      )}

      {analysisState.status === "success" && (
        <AtsResults
          data={analysisState.data}
          prefersReducedMotion={prefersReducedMotion}
          expandedSections={expandedSections}
          toggleSection={toggleSection}
          resultAnimState={resultAnimState}
          barsFilled={barsFilled}
        />
      )}
    </div>
  );
}
