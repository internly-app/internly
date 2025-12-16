/**
 * XSS Protection Utility
 *
 * Sanitizes user-generated HTML content to prevent XSS attacks.
 * Uses isomorphic-dompurify which works in both browser and Node.js environments.
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Default configuration for HTML sanitization
 * Allows only safe, basic formatting tags
 */
const DEFAULT_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  SAFE_FOR_TEMPLATES: true,
};

/**
 * Strict configuration for plain text only
 * Strips all HTML tags
 */
const STRICT_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  ALLOW_DATA_ATTR: false,
  KEEP_CONTENT: true,
};

/**
 * Sanitizes HTML content with the default configuration
 *
 * @param dirty - Untrusted HTML string from user input
 * @returns Sanitized HTML string safe for rendering
 *
 * @example
 * ```tsx
 * const userInput = '<script>alert("XSS")</script><p>Safe text</p>';
 * const safe = sanitizeHTML(userInput);
 * // Returns: '<p>Safe text</p>'
 * ```
 */
export function sanitizeHTML(dirty: string | null | undefined): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, DEFAULT_CONFIG);
}

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
  return DOMPurify.sanitize(dirty, STRICT_CONFIG);
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

/**
 * Custom sanitization with user-defined configuration
 *
 * @param dirty - Untrusted HTML string
 * @param config - DOMPurify configuration object
 * @returns Sanitized HTML string
 */
export function sanitizeWithConfig(
  dirty: string | null | undefined,
  config: DOMPurify.Config
): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, config);
}

/**
 * Batch sanitize multiple strings at once
 * Useful for sanitizing all fields in an object
 *
 * @param fields - Array of untrusted strings
 * @param mode - 'html' for HTML sanitization, 'text' for plain text
 * @returns Array of sanitized strings
 */
export function sanitizeBatch(
  fields: (string | null | undefined)[],
  mode: 'html' | 'text' = 'html'
): string[] {
  return fields.map(field =>
    mode === 'html' ? sanitizeHTML(field) : stripHTML(field)
  );
}

/**
 * React component wrapper for safely rendering user HTML
 *
 * @example
 * ```tsx
 * <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(userContent) }} />
 * ```
 */
export function createSafeHTML(dirty: string | null | undefined): { __html: string } {
  return { __html: sanitizeHTML(dirty) };
}
