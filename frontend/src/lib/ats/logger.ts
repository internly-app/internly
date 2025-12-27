/**
 * ATS Analysis Logger
 *
 * Structured logging for ATS analysis operations.
 * Helps track usage, failures, and potential abuse.
 *
 * PRODUCTION NOTE:
 * - Currently logs to console (captured by Vercel logs)
 * - Consider integrating with external logging service (DataDog, LogRocket, etc.)
 * - Add alerting for high failure rates or abuse patterns
 */

export type ATSLogLevel = "info" | "warn" | "error";

export interface ATSLogContext {
  userId?: string;
  ipAddress?: string | null;
  fileSize?: number;
  fileType?: string;
  jdLength?: number;
  step?: string;
  duration?: number;
  score?: number;
  grade?: string;
}

interface ATSLogEntry {
  timestamp: string;
  level: ATSLogLevel;
  event: string;
  context: ATSLogContext;
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
}

/**
 * Formats a log entry for console output
 */
function formatLogEntry(entry: ATSLogEntry): string {
  const { timestamp, level, event, context, error } = entry;
  const contextStr = Object.entries(context)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${typeof v === "string" ? `"${v}"` : v}`)
    .join(" ");

  let message = `[ATS ${level.toUpperCase()}] ${timestamp} ${event}`;
  if (contextStr) {
    message += ` | ${contextStr}`;
  }
  if (error) {
    message += ` | error="${error.message}"`;
    if (error.code) {
      message += ` code=${error.code}`;
    }
  }
  return message;
}

/**
 * Creates a structured log entry
 */
function createLogEntry(
  level: ATSLogLevel,
  event: string,
  context: ATSLogContext,
  error?: Error | { message: string; code?: string }
): ATSLogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    event,
    context,
    error: error
      ? {
          message: error.message,
          code: "code" in error ? error.code : undefined,
          stack: error instanceof Error ? error.stack : undefined,
        }
      : undefined,
  };
}

/**
 * ATS Logger instance
 */
export const atsLogger = {
  /**
   * Log analysis start
   */
  analysisStart(context: ATSLogContext): void {
    const entry = createLogEntry("info", "analysis_start", context);
    console.log(formatLogEntry(entry));
  },

  /**
   * Log analysis success
   */
  analysisSuccess(context: ATSLogContext): void {
    const entry = createLogEntry("info", "analysis_success", context);
    console.log(formatLogEntry(entry));
  },

  /**
   * Log analysis failure
   */
  analysisFailure(
    context: ATSLogContext,
    error: Error | { message: string; code?: string }
  ): void {
    const entry = createLogEntry("error", "analysis_failure", context, error);
    console.error(formatLogEntry(entry));
  },

  /**
   * Log rate limit hit
   */
  rateLimitHit(context: ATSLogContext, limitType: string): void {
    const entry = createLogEntry(
      "warn",
      `rate_limit_hit:${limitType}`,
      context
    );
    console.warn(formatLogEntry(entry));
  },

  /**
   * Log validation failure
   */
  validationFailure(context: ATSLogContext, reason: string): void {
    const entry = createLogEntry("warn", "validation_failure", {
      ...context,
      step: reason,
    });
    console.warn(formatLogEntry(entry));
  },

  /**
   * Log suspicious activity
   */
  suspiciousActivity(context: ATSLogContext, reason: string): void {
    const entry = createLogEntry("warn", "suspicious_activity", {
      ...context,
      step: reason,
    });
    console.warn(formatLogEntry(entry));
  },
};

/**
 * Helper to measure operation duration
 */
export function createTimer(): { elapsed: () => number } {
  const start = Date.now();
  return {
    elapsed: () => Date.now() - start,
  };
}
