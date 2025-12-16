/**
 * Rate Limiting Utility
 * 
 * Simple in-memory rate limiting for API routes.
 * 
 * PRODUCTION NOTE:
 * - Current implementation uses in-memory storage (resets on server restart)
 * - For production with multiple servers/instances, use Redis or similar
 * - Consider using Upstash Redis or Vercel KV for serverless environments
 * - Monitor rate limit hits and adjust limits based on usage patterns
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
    violations: number; // Track how many times this identifier hit the limit
  };
}

interface BlocklistEntry {
  blockedUntil: number;
  reason: string;
  violations: number;
}

// In-memory store (resets on server restart)
// For production, use Redis or similar
const rateLimitStore: RateLimitStore = {};

// Blocklist for repeated violators (temporary bans)
const blocklist: Map<string, BlocklistEntry> = new Map();

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

// Default rate limits
export const RATE_LIMITS = {
  // Company creation: 5 per hour
  CREATE_COMPANY: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5,
  },
  // Review creation: 10 per hour
  CREATE_REVIEW: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
  },
  // Role creation: 10 per hour
  CREATE_ROLE: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
  },
  // General API: 100 per minute
  GENERAL: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  },
} as const;

/**
 * Checks if a request should be rate limited
 * @param identifier - Unique identifier (usually user ID or IP)
 * @param config - Rate limit configuration
 * @returns Object with `allowed` boolean, `remaining` requests, and optional `blocked` info
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  blocked?: boolean;
  blockedUntil?: number;
} {
  const now = Date.now();
  const key = identifier;

  // Check if identifier is blocked
  const blockEntry = blocklist.get(key);
  if (blockEntry && now < blockEntry.blockedUntil) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: blockEntry.blockedUntil,
      blocked: true,
      blockedUntil: blockEntry.blockedUntil,
    };
  } else if (blockEntry && now >= blockEntry.blockedUntil) {
    // Block expired, remove from blocklist
    blocklist.delete(key);
  }

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    // 1% chance to clean up (to avoid doing it on every request)
    cleanupExpiredEntries();
    cleanupBlocklist();
  }

  const record = rateLimitStore[key];

  if (!record || now > record.resetTime) {
    // No record or expired, create new window
    rateLimitStore[key] = {
      count: 1,
      resetTime: now + config.windowMs,
      violations: record?.violations || 0, // Preserve violation count
    };
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }

  // Record exists and is within window
  if (record.count >= config.maxRequests) {
    // Increment violation count
    record.violations = (record.violations || 0) + 1;

    // Block after 5 violations
    if (record.violations >= 5) {
      const blockDuration = 60 * 60 * 1000; // 1 hour
      blocklist.set(key, {
        blockedUntil: now + blockDuration,
        reason: 'Repeated rate limit violations',
        violations: record.violations,
      });
      console.warn(`[Rate Limit] Blocked ${key} for ${blockDuration / 1000}s due to ${record.violations} violations`);
    }

    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  // Increment count
  record.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * Cleans up expired rate limit entries
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const key in rateLimitStore) {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  }
}

/**
 * Cleans up expired blocklist entries
 */
function cleanupBlocklist(): void {
  const now = Date.now();
  for (const [key, entry] of blocklist.entries()) {
    if (entry.blockedUntil < now) {
      blocklist.delete(key);
    }
  }
}

/**
 * Gets client identifier from request
 * Uses user ID if authenticated, otherwise IP address
 */
export function getClientIdentifier(
  userId: string | null,
  ipAddress: string | null
): string {
  // Prefer user ID for authenticated users
  if (userId) {
    return `user:${userId}`;
  }
  // Fall back to IP address
  if (ipAddress) {
    return `ip:${ipAddress}`;
  }
  // Last resort: use a default identifier
  return "anonymous";
}

/**
 * Extracts IP address from Next.js request
 */
export function getIpAddress(request: Request): string | null {
  // Try various headers that might contain the real IP
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback (won't work in serverless, but good for development)
  return null;
}

