"use client";

import { useState, useRef, useCallback } from "react";
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["skills", "responsibilities"])
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

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
              placeholder="Paste the job description here..."
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
      <div className="flex justify-center">
        <Button
          onClick={handleAnalyze}
          disabled={!canAnalyze}
          size="lg"
          className="min-w-[200px]"
        >
          {analysisState.status === "loading" ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {analysisState.step}
            </>
          ) : (
            "Analyze Match"
          )}
        </Button>
      </div>

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
      {analysisState.status === "loading" && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="size-5 animate-spin text-primary" />
                <span className="text-sm">{analysisState.step}</span>
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
        <div className="space-y-6">
          {/* Score Overview */}
          <Card>
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
                      )} transition-all duration-500`}
                      strokeWidth="8"
                      strokeLinecap="round"
                      fill="none"
                      cx="50"
                      cy="50"
                      r="42"
                      style={{
                        strokeDasharray: `${
                          analysisState.data.score.overallScore * 2.64
                        } 264`,
                      }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
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
                            )} transition-all duration-500`}
                            style={{ width: `${category.percentage}%` }}
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
          <Card>
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
          <Card>
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
            <Card>
              <CardHeader
                className="cursor-pointer"
                onClick={() => toggleSection("deductions")}
              >
                <CardTitle className="text-base font-medium flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    Score Deductions
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
