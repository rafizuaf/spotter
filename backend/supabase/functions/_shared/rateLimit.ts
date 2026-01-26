/**
 * Rate Limiting Utilities for Edge Functions
 * 
 * Simple in-memory rate limiting (for production, use Redis or Supabase rate limiting)
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

// In-memory store (resets on function restart)
// For production, use Redis or Supabase's built-in rate limiting
const rateLimitStore: RateLimitStore = {};

/**
 * Check if request should be rate limited
 * 
 * @param identifier - Unique identifier (e.g., user ID, IP address)
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns true if rate limited, false otherwise
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { rateLimited: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = identifier;
  const entry = rateLimitStore[key];

  // No entry or window expired - allow request
  if (!entry || now > entry.resetAt) {
    rateLimitStore[key] = {
      count: 1,
      resetAt: now + windowMs,
    };
    return {
      rateLimited: false,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    };
  }

  // Check if limit exceeded
  if (entry.count >= maxRequests) {
    return {
      rateLimited: true,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Increment count
  entry.count += 1;
  return {
    rateLimited: false,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Rate limit configuration for different endpoints
 */
export const RATE_LIMITS = {
  'sync-push': {
    maxRequests: 10, // 10 syncs per minute
    windowMs: 60 * 1000,
  },
  'award-xp': {
    maxRequests: 20, // 20 XP awards per minute
    windowMs: 60 * 1000,
  },
  'sync-pull': {
    maxRequests: 30, // 30 pulls per minute
    windowMs: 60 * 1000,
  },
  'generate-viral-stats': {
    maxRequests: 10, // 10 stats generations per minute
    windowMs: 60 * 1000,
  },
} as const;
