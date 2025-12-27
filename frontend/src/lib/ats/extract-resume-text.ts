/**
 * Resume text extraction utility.
 *
 * Server-side only. Extracts clean, readable text from PDF and DOCX files.
 * No scoring, no matching, no database writes.
 *
 * Supported formats: PDF, DOCX
 */

import path from "path";
import { pathToFileURL } from "url";

import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

// ---------------------------------------------------------------------------
// PDF Worker Configuration for Next.js/Serverless
// ---------------------------------------------------------------------------

// Configure worker path for pdf-parse in Node.js environment.
// pdf-parse v2 uses pdfjs-dist which requires a worker file.
// In Node.js, we need to provide the full file:// URL to the worker.
if (typeof PDFParse.setWorker === "function") {
  try {
    // The worker file is included in pdf-parse package at this location
    const workerPath = path.resolve(
      process.cwd(),
      "node_modules/pdf-parse/dist/worker/pdf.worker.mjs"
    );
    // Convert to file:// URL as required by Node.js ESM loader
    const workerUrl = pathToFileURL(workerPath).href;
    PDFParse.setWorker(workerUrl);
  } catch (e) {
    // Worker configuration failed - PDF parsing will fail
    if (process.env.NODE_ENV !== "production") {
      console.error("[PDF Parse] Failed to configure worker:", e);
    }
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SupportedFileType = "pdf" | "docx";

export interface ResumeMetadata {
  /** Detected file type. */
  fileType: SupportedFileType;
  /** Number of pages (PDF only, null for DOCX). */
  pageCount: number | null;
  /** Original file size in bytes. */
  fileSizeBytes: number;
}

export interface ExtractedResume {
  /** Cleaned, readable text from the resume. */
  text: string;
  /** File metadata. */
  metadata: ResumeMetadata;
}

export interface ExtractionError {
  /** Error code for programmatic handling. */
  code:
    | "UNSUPPORTED_FILE_TYPE"
    | "CORRUPT_FILE"
    | "EMPTY_FILE"
    | "EXTRACTION_FAILED";
  /** Human-readable error message. */
  message: string;
}

export type ExtractionResult =
  | { success: true; data: ExtractedResume }
  | { success: false; error: ExtractionError };

// ---------------------------------------------------------------------------
// File type detection
// ---------------------------------------------------------------------------

/**
 * Magic bytes for file type detection.
 */
const FILE_SIGNATURES = {
  // PDF: %PDF
  pdf: [0x25, 0x50, 0x44, 0x46],
  // DOCX (ZIP): PK
  zip: [0x50, 0x4b, 0x03, 0x04],
} as const;

/**
 * Detect file type from buffer magic bytes.
 */
function detectFileType(buffer: Buffer): SupportedFileType | null {
  if (buffer.length < 4) return null;

  // Check PDF signature
  const isPdf = FILE_SIGNATURES.pdf.every((byte, i) => buffer[i] === byte);
  if (isPdf) return "pdf";

  // Check ZIP signature (DOCX is a ZIP archive)
  const isZip = FILE_SIGNATURES.zip.every((byte, i) => buffer[i] === byte);
  if (isZip) return "docx"; // Assume DOCX if ZIP (could be enhanced with deeper inspection)

  return null;
}

/**
 * Detect file type from MIME type string.
 */
function detectFileTypeFromMime(mimeType: string): SupportedFileType | null {
  const normalized = mimeType.toLowerCase().trim();

  if (normalized === "application/pdf") return "pdf";
  if (
    normalized ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    normalized === "application/docx"
  ) {
    return "docx";
  }

  return null;
}

// ---------------------------------------------------------------------------
// Text normalization
// ---------------------------------------------------------------------------

/**
 * Common header/footer patterns to remove.
 */
const HEADER_FOOTER_PATTERNS = [
  // Page numbers
  /^page\s*\d+\s*(of\s*\d+)?$/im,
  /^\d+\s*\/\s*\d+$/m,
  /^-\s*\d+\s*-$/m,
  // "Confidential" markers
  /^confidential$/im,
  // "Resume of [Name]" repeated headers
  /^resume\s+(of|for)\s+.{2,50}$/im,
];

/**
 * Normalize and clean extracted text.
 *
 * - Normalizes line endings (CRLF/CR -> LF)
 * - Collapses excessive whitespace
 * - Removes common header/footer patterns
 * - Trims each line
 * - Collapses 3+ consecutive blank lines to 2
 */
function normalizeText(text: string): string {
  let normalized = text
    // Normalize line endings
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Replace non-breaking spaces and other Unicode spaces with regular space
    .replace(/[\u00A0\u2000-\u200B\u2028\u2029\u202F\u205F\u3000]/g, " ")
    // Collapse horizontal whitespace (but not newlines)
    .replace(/[ \t]+/g, " ");

  // Remove common header/footer patterns
  for (const pattern of HEADER_FOOTER_PATTERNS) {
    normalized = normalized.replace(pattern, "");
  }

  // Process line by line
  normalized = normalized
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    // Collapse excessive blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return normalized;
}

// ---------------------------------------------------------------------------
// PDF extraction
// ---------------------------------------------------------------------------

/**
 * Extract text from a PDF buffer.
 */
async function extractFromPdf(buffer: Buffer): Promise<ExtractionResult> {
  let parser: PDFParse | null = null;

  try {
    // pdf-parse v2 uses class-based API
    // Pass the buffer directly as 'data'
    parser = new PDFParse({ data: buffer });

    // Get text from PDF
    const textResult = await parser.getText();

    // Check if we got text
    if (
      !textResult ||
      !textResult.text ||
      textResult.text.trim().length === 0
    ) {
      return {
        success: false,
        error: {
          code: "EMPTY_FILE",
          message:
            "The PDF appears to be empty or contains only images/scanned content.",
        },
      };
    }

    const text = normalizeText(textResult.text);

    // Get page count from info (optional, don't fail if it errors)
    let pageCount: number | null = null;
    try {
      const infoResult = await parser.getInfo();
      pageCount = infoResult.pages?.length ?? infoResult.total ?? null;
    } catch {
      // Ignore info errors - text is more important
    }

    return {
      success: true,
      data: {
        text,
        metadata: {
          fileType: "pdf",
          pageCount,
          fileSizeBytes: buffer.length,
        },
      },
    };
  } catch (err) {
    // Log the actual error for debugging (avoid noisy prod logs)
    if (process.env.NODE_ENV !== "production") {
      console.error("[PDF Extraction Error]", err);
    }

    // pdf-parse throws on corrupt/invalid PDFs
    const message =
      err instanceof Error ? err.message : "Unknown PDF parsing error";

    // Check for common error types
    if (
      message.includes("Invalid PDF") ||
      message.includes("bad XRef") ||
      message.includes("Missing") ||
      message.includes("Invalid PDF structure")
    ) {
      return {
        success: false,
        error: {
          code: "CORRUPT_FILE",
          message: "The PDF file appears to be corrupt or malformed.",
        },
      };
    }

    // Password protected PDFs
    if (message.includes("password") || message.includes("Password")) {
      return {
        success: false,
        error: {
          code: "CORRUPT_FILE",
          message:
            "The PDF is password-protected. Please remove the password and try again.",
        },
      };
    }

    return {
      success: false,
      error: {
        code: "EXTRACTION_FAILED",
        message: `Failed to extract text from PDF: ${message}`,
      },
    };
  } finally {
    // Clean up PDF parser resources
    if (parser) {
      try {
        await parser.destroy();
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

// ---------------------------------------------------------------------------
// DOCX extraction
// ---------------------------------------------------------------------------

/**
 * Extract text from a DOCX buffer.
 */
async function extractFromDocx(buffer: Buffer): Promise<ExtractionResult> {
  try {
    // mammoth extracts text and ignores formatting
    const result = await mammoth.extractRawText({ buffer });

    if (!result.value || result.value.trim().length === 0) {
      return {
        success: false,
        error: {
          code: "EMPTY_FILE",
          message: "The DOCX file appears to be empty.",
        },
      };
    }

    const text = normalizeText(result.value);

    // Log warnings if any (for debugging, not exposed to user)
    if (result.messages && result.messages.length > 0) {
      console.warn(
        "[extractFromDocx] Mammoth warnings:",
        result.messages.map((m) => m.message)
      );
    }

    return {
      success: true,
      data: {
        text,
        metadata: {
          fileType: "docx",
          pageCount: null, // DOCX doesn't have page count without rendering
          fileSizeBytes: buffer.length,
        },
      },
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown DOCX parsing error";

    // Check for common corruption indicators
    if (
      message.includes("Could not find") ||
      message.includes("Invalid") ||
      message.includes("corrupt")
    ) {
      return {
        success: false,
        error: {
          code: "CORRUPT_FILE",
          message: "The DOCX file appears to be corrupt or malformed.",
        },
      };
    }

    return {
      success: false,
      error: {
        code: "EXTRACTION_FAILED",
        message: `Failed to extract text from DOCX: ${message}`,
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export interface ExtractResumeTextOptions {
  /**
   * Optional MIME type hint. If not provided, file type is detected from
   * magic bytes.
   */
  mimeType?: string;
  /**
   * Maximum file size in bytes. Defaults to 10MB.
   */
  maxSizeBytes?: number;
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Extract clean, readable text from a resume file (PDF or DOCX).
 *
 * @param file - The file buffer to extract text from.
 * @param options - Optional configuration.
 * @returns ExtractionResult with text and metadata on success, or error details on failure.
 *
 * @example
 * ```ts
 * const buffer = await readFile('resume.pdf');
 * const result = await extractResumeText(buffer);
 *
 * if (result.success) {
 *   console.log(result.data.text);
 *   console.log(result.data.metadata.pageCount);
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 */
export async function extractResumeText(
  file: Buffer,
  options: ExtractResumeTextOptions = {}
): Promise<ExtractionResult> {
  const { mimeType, maxSizeBytes = DEFAULT_MAX_SIZE } = options;

  // Validate file size
  if (file.length === 0) {
    return {
      success: false,
      error: {
        code: "EMPTY_FILE",
        message: "The uploaded file is empty.",
      },
    };
  }

  if (file.length > maxSizeBytes) {
    return {
      success: false,
      error: {
        code: "EXTRACTION_FAILED",
        message: `File size exceeds maximum allowed (${Math.round(
          maxSizeBytes / 1024 / 1024
        )}MB).`,
      },
    };
  }

  // Detect file type (prefer magic bytes, fallback to MIME type)
  let fileType = detectFileType(file);
  if (!fileType && mimeType) {
    fileType = detectFileTypeFromMime(mimeType);
  }

  if (!fileType) {
    return {
      success: false,
      error: {
        code: "UNSUPPORTED_FILE_TYPE",
        message: "Unsupported file type. Please upload a PDF or DOCX file.",
      },
    };
  }

  // Extract based on file type
  switch (fileType) {
    case "pdf":
      return extractFromPdf(file);
    case "docx":
      return extractFromDocx(file);
    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = fileType;
      return _exhaustive;
  }
}

/**
 * Check if a file type is supported for extraction.
 */
export function isSupportedFileType(
  mimeType: string
): mimeType is string & { __brand: "SupportedMime" } {
  return detectFileTypeFromMime(mimeType) !== null;
}

/**
 * Get list of supported MIME types.
 */
export function getSupportedMimeTypes(): string[] {
  return [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
}
