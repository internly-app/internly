import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, CheckCircle2, X } from "lucide-react";

type Props = {
  file: File | null;
  isLoading: boolean;
  jobDescription: string;
  onJobDescriptionChange: (value: string) => void;
  minJdLength: number;
  maxFileSizeDisplay: string;
  canAnalyze: boolean;
  onAnalyze: () => void;

  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onClearFile: () => void;
};

export default function AtsInputs({
  file,
  isLoading,
  jobDescription,
  onJobDescriptionChange,
  minJdLength,
  maxFileSizeDisplay,
  canAnalyze,
  onAnalyze,
  fileInputRef,
  onFileChange,
  onDrop,
  onDragOver,
  onClearFile,
}: Props) {
  return (
    <>
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
              onDrop={onDrop}
              onDragOver={onDragOver}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={onFileChange}
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
                    onClick={onClearFile}
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
                    PDF or DOCX (max {maxFileSizeDisplay})
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
              onChange={(e) => onJobDescriptionChange(e.target.value)}
              className="min-h-[140px] resize-none"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {jobDescription.length < minJdLength
                ? `${
                    minJdLength - jobDescription.length
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
            onClick={onAnalyze}
            disabled={!canAnalyze}
            size="lg"
            className="min-w-[220px]"
          >
            Analyze Resume
          </Button>
        </div>
      )}
    </>
  );
}
