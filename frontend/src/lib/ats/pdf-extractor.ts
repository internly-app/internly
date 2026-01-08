/**
 * PDF Text Extraction using pdfjs-dist directly.
 *
 * This bypasses pdf-parse to avoid the ENOENT error caused by its internal
 * test file loading in serverless environments (Vercel).
 *
 * Uses pdfjs-dist/legacy/build/pdf to avoid canvas dependency.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfjsLib = any;

// Use dynamic import to get the correct module
let pdfjsPromise: Promise<PdfjsLib> | null = null;

/**
 * Get the pdfjs-dist module with proper configuration for serverless.
 */
async function getPdfjs(): Promise<PdfjsLib> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      // Import the legacy build which doesn't require canvas
      // v4.x uses .mjs extension for ES modules
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

      // Disable workers for serverless compatibility
      pdfjs.GlobalWorkerOptions.workerSrc = "";

      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

export interface PdfExtractionResult {
  success: true;
  text: string;
  pageCount: number;
}

export interface PdfExtractionError {
  success: false;
  error: string;
  code:
    | "CORRUPT_FILE"
    | "PASSWORD_PROTECTED"
    | "EMPTY_FILE"
    | "EXTRACTION_FAILED";
}

export type PdfExtractResult = PdfExtractionResult | PdfExtractionError;

/**
 * Extract text from a PDF buffer using pdfjs-dist directly.
 *
 * @param buffer - The PDF file as a Buffer
 * @returns Extracted text and page count, or error details
 */
export async function extractPdfText(
  buffer: Buffer
): Promise<PdfExtractResult> {
  try {
    const pdfjs = await getPdfjs();

    // Convert Buffer to Uint8Array for pdfjs
    const data = new Uint8Array(buffer);

    // Load the PDF document with worker disabled
    const loadingTask = pdfjs.getDocument({
      data,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;

    if (pageCount === 0) {
      return {
        success: false,
        error: "The PDF has no pages.",
        code: "EMPTY_FILE",
      };
    }

    // Extract text from all pages
    const textParts: string[] = [];

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      // Concatenate text items with proper spacing
      const pageText = textContent.items
        .filter((item: { str?: string }) => "str" in item && item.str)
        .map((item: { str: string }) => item.str)
        .join(" ");

      textParts.push(pageText);
    }

    const fullText = textParts.join("\n\n").trim();

    if (!fullText) {
      return {
        success: false,
        error:
          "The PDF appears to be empty or contains only images/scanned content.",
        code: "EMPTY_FILE",
      };
    }

    return {
      success: true,
      text: fullText,
      pageCount,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // Check for password-protected PDFs
    if (message.includes("password") || message.includes("Password")) {
      return {
        success: false,
        error:
          "The PDF is password-protected. Please remove the password and try again.",
        code: "PASSWORD_PROTECTED",
      };
    }

    // Check for corrupt PDFs
    if (
      message.includes("Invalid PDF") ||
      message.includes("bad XRef") ||
      message.includes("Missing") ||
      message.includes("Invalid PDF structure") ||
      message.includes("XRef")
    ) {
      return {
        success: false,
        error: "The PDF file appears to be corrupt or malformed.",
        code: "CORRUPT_FILE",
      };
    }

    console.error("[PDF Extraction Error]", err);

    return {
      success: false,
      error: `Failed to extract text from PDF: ${message}`,
      code: "EXTRACTION_FAILED",
    };
  }
}
