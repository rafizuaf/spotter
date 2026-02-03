/**
 * Database-backed Rate Limiting for Edge Functions
 * 
 * Stores rate limit state in PostgreSQL for global enforcement across serverless instances.
 * Replaces in-memory rate limiting which is ineffective in serverless environments.
 */

import { SupabaseClient } from "jsr:@supabase/supabase-js";

export interface RateLimitResult {
  rateLimited: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit using database storage
 * 
 * @param identifier - Unique identifier (e.g., user ID)
 * @param endpoint - Endpoint name (e.g., 'sync-push', 'award-xp')
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @param supabaseAdmin - Supabase admin client (bypasses RLS)
 * @returns Rate limit status
 */
export async function checkRateLimitDb(
  identifier: string,
  endpoint: string,
  maxRequests: number,
  windowMs: number,
  supabaseAdmin: SupabaseClient
): Promise<RateLimitResult> {
  const now = Date.now();
  const resetAt = now + windowMs;
  const resetAtISO = new Date(resetAt).toISOString();

  try {
    // Try to get existing entry
    const { data: existing, error: selectError } = await supabaseAdmin
      .from("rate_limit_entries")
      .select("count, reset_at")
      .eq("identifier", identifier)
      .eq("endpoint", endpoint)
      .single();

    // If entry doesn't exist or is expired, create/update with count=1
    if (selectError || !existing || new Date(existing.reset_at).getTime() < now) {
      const { error: upsertError } = await supabaseAdmin
        .from("rate_limit_entries")
        .upsert(
          {
            identifier,
            endpoint,
            count: 1,
            reset_at: resetAtISO,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "identifier,endpoint",
          }
        );

      if (upsertError) {
        console.error("Rate limit upsert error:", upsertError);
        // Fail open: allow request if DB fails
        return {
          rateLimited: false,
          remaining: maxRequests - 1,
          resetAt,
        };
      }

      return {
        rateLimited: false,
        remaining: maxRequests - 1,
        resetAt,
      };
    }

    // Entry exists and is not expired
    const existingResetAt = new Date(existing.reset_at).getTime();
    const currentCount = existing.count || 0;

    // Check if limit exceeded
    if (currentCount >= maxRequests) {
      return {
        rateLimited: true,
        remaining: 0,
        resetAt: existingResetAt,
      };
    }

    // Increment count
    const newCount = currentCount + 1;
    const { error: updateError } = await supabaseAdmin
      .from("rate_limit_entries")
      .update({
        count: newCount,
        updated_at: new Date().toISOString(),
      })
      .eq("identifier", identifier)
      .eq("endpoint", endpoint);

    if (updateError) {
      console.error("Rate limit update error:", updateError);
      // Fail open: allow request if DB fails
      return {
        rateLimited: false,
        remaining: maxRequests - newCount,
        resetAt: existingResetAt,
      };
    }

    return {
      rateLimited: false,
      remaining: maxRequests - newCount,
      resetAt: existingResetAt,
    };
  } catch (error) {
    console.error("Rate limit check error:", error);
    // Fail open: allow request if DB fails
    return {
      rateLimited: false,
      remaining: maxRequests - 1,
      resetAt,
    };
  }
}

/**
 * Clean up expired rate limit entries
 * Call this periodically or on each check to prevent table growth
 * 
 * @param supabaseAdmin - Supabase admin client
 */
export async function cleanupExpiredRateLimits(
  supabaseAdmin: SupabaseClient
): Promise<void> {
  try {
    // Call database function to clean up expired entries
    const { error } = await supabaseAdmin.rpc("cleanup_expired_rate_limits");

    if (error) {
      console.error("Rate limit cleanup error:", error);
    }
  } catch (error) {
    console.error("Rate limit cleanup exception:", error);
  }
}
