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
  'follow-user': {
    maxRequests: 20, // 20 follows per minute
    windowMs: 60 * 1000,
  },
  'unfollow-user': {
    maxRequests: 20, // 20 unfollows per minute
    windowMs: 60 * 1000,
  },
  'react-to-post': {
    maxRequests: 30, // 30 reactions per minute
    windowMs: 60 * 1000,
  },
  'block-user': {
    maxRequests: 10, // 10 blocks per hour
    windowMs: 60 * 60 * 1000,
  },
  'unblock-user': {
    maxRequests: 10, // 10 unblocks per hour
    windowMs: 60 * 60 * 1000,
  },
  'create-notification': {
    maxRequests: 50, // 50 notifications per minute
    windowMs: 60 * 1000,
  },
  'search-users': {
    maxRequests: 30, // 30 searches per minute
    windowMs: 60 * 1000,
  },
  'invite-workout-partner': {
    maxRequests: 10, // 10 invitations per minute
    windowMs: 60 * 1000,
  },
  'create-challenge': {
    maxRequests: 5, // 5 challenges per minute
    windowMs: 60 * 1000,
  },
  'join-challenge': {
    maxRequests: 20, // 20 joins per minute
    windowMs: 60 * 1000,
  },
  'leave-challenge': {
    maxRequests: 20, // 20 leaves per minute
    windowMs: 60 * 1000,
  },
  'submit-feedback': {
    maxRequests: 10, // 10 feedback submissions per hour
    windowMs: 60 * 60 * 1000,
  },
  'increment-routine-usage': {
    maxRequests: 10, // 10 increments per minute per routine
    windowMs: 60 * 1000,
  },
  'get-leaderboard': {
    maxRequests: 30, // 30 leaderboard fetches per minute
    windowMs: 60 * 1000,
  },
  'enroll-program': {
    maxRequests: 5, // 5 enrollments per hour
    windowMs: 60 * 60 * 1000,
  },
  'complete-program-day': {
    maxRequests: 20, // 20 day completions per minute
    windowMs: 60 * 1000,
  },
} as const;
