/**
 * Rate Limiting Utilities for Edge Functions
 * 
 * Database-backed rate limiting using PostgreSQL for global enforcement
 * across serverless instances.
 */

import { SupabaseClient } from "jsr:@supabase/supabase-js";
import { checkRateLimitDb, RateLimitResult } from "./rateLimitDb.ts";

/**
 * Check if request should be rate limited
 * 
 * @param identifier - Unique identifier (e.g., user ID, IP address)
 * @param endpoint - Endpoint name (e.g., 'sync-push', 'award-xp')
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @param supabaseAdmin - Supabase admin client (required for DB access)
 * @returns Promise with rate limit status
 */
export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  maxRequests: number,
  windowMs: number,
  supabaseAdmin: SupabaseClient
): Promise<RateLimitResult> {
  return await checkRateLimitDb(
    identifier,
    endpoint,
    maxRequests,
    windowMs,
    supabaseAdmin
  );
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
