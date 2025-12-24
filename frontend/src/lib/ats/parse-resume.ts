/**
 * Resume PDF parsing utility.
 *
 * Extracts raw text from a PDF buffer, normalizes whitespace, and detects
 * common resume sections (Skills, Experience, Education, Projects).
 *
 * Returns structured JSON only — no scoring or business logic.
 */

import pdfParse from "pdf-parse";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResumeSection {
  /** The heading/title of the section as detected in the resume. */
  heading: string;
  /** The raw content under that heading (trimmed, whitespace-normalized). */
  content: string;
}

export interface ParsedResume {
  /** Full extracted text from the PDF (whitespace-normalized). */
  rawText: string;
  /** Detected sections; null if not found. */
  sections: {
    skills: ResumeSection | null;
    experience: ResumeSection | null;
    education: ResumeSection | null;
    projects: ResumeSection | null;
  };
  /** Any section headings detected that don't map to the canonical four. */
  otherSections: ResumeSection[];
}

// ---------------------------------------------------------------------------
// Section heading patterns (case-insensitive)
// ---------------------------------------------------------------------------

const SECTION_PATTERNS: Record<keyof ParsedResume["sections"], RegExp> = {
  skills:
    /^(skills|technical\s*skills|core\s*competencies|competencies|technologies|tech\s*stack)$/i,
  experience:
    /^(experience|work\s*experience|professional\s*experience|employment|employment\s*history|work\s*history)$/i,
  education:
    /^(education|academic\s*background|educational\s*background|academics|qualifications)$/i,
  projects:
    /^(projects|personal\s*projects|academic\s*projects|side\s*projects|portfolio)$/i,
};

/**
 * Regex to detect lines that look like section headings.
 * Heuristic: all-caps or title-case line, often followed by a colon or newline.
 * We capture any line that is 2-50 chars, no lowercase letters at start, and
 * does not look like a date/email/url.
 */
const HEADING_LINE_RE = /^([A-Z][A-Za-z\s&/,-]{1,48}):?\s*$/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalize whitespace: collapse runs of spaces/tabs, normalize line endings,
 * trim leading/trailing whitespace per line, collapse 3+ consecutive newlines
 * into 2.
 */
function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, "\n") // CRLF -> LF
    .replace(/\r/g, "\n") // CR -> LF
    .replace(/[ \t]+/g, " ") // collapse horizontal whitespace
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n") // collapse excessive blank lines
    .trim();
}

/**
 * Attempt to match a heading string to one of the canonical section keys.
 */
function matchCanonicalSection(
  heading: string
): keyof ParsedResume["sections"] | null {
  const normalized = heading.trim();
  for (const [key, pattern] of Object.entries(SECTION_PATTERNS)) {
    if (pattern.test(normalized)) {
      return key as keyof ParsedResume["sections"];
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

/**
 * Parse a PDF resume buffer and return structured JSON.
 *
 * @param pdfBuffer - The raw PDF file as a Buffer (e.g., from file upload).
 * @returns ParsedResume object.
 */
export async function parseResumePdf(pdfBuffer: Buffer): Promise<ParsedResume> {
  // Extract text using pdf-parse
  const pdfData = await pdfParse(pdfBuffer);
  const rawText = normalizeWhitespace(pdfData.text);

  // Split into lines for section detection
  const lines = rawText.split("\n");

  // Detect headings and their positions
  interface HeadingMatch {
    heading: string;
    lineIndex: number;
    canonical: keyof ParsedResume["sections"] | null;
  }

  const headings: HeadingMatch[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = HEADING_LINE_RE.exec(line);
    if (match) {
      const heading = match[1].trim();
      // Skip very short or likely non-heading lines
      if (heading.length < 3) continue;
      // Skip lines that look like dates, emails, URLs
      if (/^\d|@|http|www\./i.test(heading)) continue;

      headings.push({
        heading,
        lineIndex: i,
        canonical: matchCanonicalSection(heading),
      });
    }
  }

  // Build sections by extracting content between consecutive headings
  const buildSection = (
    startIdx: number,
    endIdx: number,
    heading: string
  ): ResumeSection => {
    const contentLines = lines.slice(startIdx + 1, endIdx);
    return {
      heading,
      content: contentLines.join("\n").trim(),
    };
  };

  const result: ParsedResume = {
    rawText,
    sections: {
      skills: null,
      experience: null,
      education: null,
      projects: null,
    },
    otherSections: [],
  };

  for (let i = 0; i < headings.length; i++) {
    const current = headings[i];
    const nextLineIdx =
      i + 1 < headings.length ? headings[i + 1].lineIndex : lines.length;

    const section = buildSection(
      current.lineIndex,
      nextLineIdx,
      current.heading
    );

    if (current.canonical) {
      // Only keep the first occurrence for each canonical section
      if (result.sections[current.canonical] === null) {
        result.sections[current.canonical] = section;
      }
    } else {
      result.otherSections.push(section);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Plain text variant (for cases where text is already extracted)
// ---------------------------------------------------------------------------

/**
 * Parse already-extracted resume text (not PDF) and return structured JSON.
 * Useful when the caller has pre-extracted text or pasted content.
 */
export function parseResumeText(text: string): Omit<ParsedResume, "rawText"> & {
  rawText: string;
} {
  const rawText = normalizeWhitespace(text);
  const lines = rawText.split("\n");

  interface HeadingMatch {
    heading: string;
    lineIndex: number;
    canonical: keyof ParsedResume["sections"] | null;
  }

  const headings: HeadingMatch[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = HEADING_LINE_RE.exec(line);
    if (match) {
      const heading = match[1].trim();
      if (heading.length < 3) continue;
      if (/^\d|@|http|www\./i.test(heading)) continue;

      headings.push({
        heading,
        lineIndex: i,
        canonical: matchCanonicalSection(heading),
      });
    }
  }

  const buildSection = (
    startIdx: number,
    endIdx: number,
    heading: string
  ): ResumeSection => {
    const contentLines = lines.slice(startIdx + 1, endIdx);
    return {
      heading,
      content: contentLines.join("\n").trim(),
    };
  };

  const result: ParsedResume = {
    rawText,
    sections: {
      skills: null,
      experience: null,
      education: null,
      projects: null,
    },
    otherSections: [],
  };

  for (let i = 0; i < headings.length; i++) {
    const current = headings[i];
    const nextLineIdx =
      i + 1 < headings.length ? headings[i + 1].lineIndex : lines.length;

    const section = buildSection(
      current.lineIndex,
      nextLineIdx,
      current.heading
    );

    if (current.canonical) {
      if (result.sections[current.canonical] === null) {
        result.sections[current.canonical] = section;
      }
    } else {
      result.otherSections.push(section);
    }
  }

  return result;
}
