/**
 * XSS Protection Utility (Server-side)
 *
 * Server-safe sanitization functions for API routes and server components.
 * Uses regex-based sanitization to avoid ESM/CommonJS issues with jsdom.
 */

/**
 * Strips all HTML tags and returns plain text only
 * Use this for fields that should never contain HTML
 *
 * @param dirty - Untrusted string that may contain HTML
 * @returns Plain text with all HTML tags removed
 *
 * @example
 * ```tsx
 * const userInput = '<script>alert("XSS")</script><p>Text</p>';
 * const safe = stripHTML(userInput);
 * // Returns: 'Text'
 * ```
 */
export function stripHTML(dirty: string | null | undefined): string {
  if (!dirty) return '';
  
  // Remove all HTML tags using regex
  // This is safe for server-side use and handles most cases
  return dirty
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]+>/g, '') // Remove all other HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&[a-z]+;/gi, '') // Remove other HTML entities (basic)
    .trim();
}

/**
 * Sanitizes a URL to prevent javascript: and data: protocols
 *
 * @param url - Untrusted URL string
 * @returns Sanitized URL or empty string if dangerous
 *
 * @example
 * ```tsx
 * sanitizeURL('javascript:alert("XSS")'); // Returns: ''
 * sanitizeURL('https://example.com'); // Returns: 'https://example.com'
 * ```
 */
export function sanitizeURL(url: string | null | undefined): string {
  if (!url) return '';

  // Strip whitespace
  const trimmed = url.trim();

  // Check for dangerous protocols
  const dangerous = /^(javascript|data|vbscript):/i;
  if (dangerous.test(trimmed)) {
    return '';
  }

  // Allow relative URLs, http, https, and mailto
  return trimmed;
}

