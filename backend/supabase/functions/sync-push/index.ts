// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rateLimit.ts";
import { getResponseHeaders } from "../_shared/security.ts";

// CORS: Restrict to specific origin for security
const getAllowedOrigin = (): string => {
  const allowedOrigin = Deno.env.get("FRONTEND_URL") || "https://spotter-app.com";
  return allowedOrigin;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": getAllowedOrigin(),
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-correlation-id", // B4: Allow correlation ID header
};


interface TableChanges {
  created: Record<string, unknown>[];
  updated: Record<string, unknown>[];
  deleted: string[];
}

interface PushRequest {
  changes: Record<string, TableChanges>;
  lastPulledAt: number | null;
  idempotencyKey?: string; // A6: Optional idempotency key for deduplication
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getResponseHeaders(corsHeaders) });
  }

  // B4: Read correlation ID from header
  const correlationId = req.headers.get("X-Correlation-ID");
  
  try {
    // B4: Log correlation ID at start of processing
    if (correlationId) {
      console.log(`[sync-push] correlationId: ${correlationId}`);
    }
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // Create Supabase client with secret key for admin writes (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SECRET_KEY") ?? ""
    );

    // Create client with user auth for validation (uses publishable key + user token)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SECURITY: Rate limiting - prevent abuse
    const rateLimit = await checkRateLimit(
      user.id,
      'sync-push',
      RATE_LIMITS['sync-push'].maxRequests,
      RATE_LIMITS['sync-push'].windowMs,
      supabaseAdmin
    );
    if (rateLimit.rateLimited) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded. Please try again later.",
          code: "RATE_LIMITED",
          retry_after: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
            "X-RateLimit-Limit": RATE_LIMITS['sync-push'].maxRequests.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.resetAt.toString(),
          },
        }
      );
    }

    // Parse request body
    const { changes, idempotencyKey }: PushRequest = await req.json();

    // A6: Check idempotency key (if provided)
    if (idempotencyKey) {
      const { data: cachedResponse } = await supabaseAdmin
        .from("idempotency_keys")
        .select("response_body")
        .eq("idempotency_key", idempotencyKey)
        .eq("user_id", user.id)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (cachedResponse) {
        // Return cached response (deduplicate duplicate request)
        return new Response(JSON.stringify(cachedResponse.response_body), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // SECURITY: Get user's subscription tier for limit enforcement
    const { data: entitlement } = await supabaseAdmin
      .from("user_entitlements")
      .select("tier, valid_until")
      .eq("user_id", user.id)
      .single();

    const tier = entitlement?.tier ?? "FREE";
    const isExpired =
      entitlement?.valid_until &&
      new Date(entitlement.valid_until) < new Date();
    const effectiveTier = isExpired ? "FREE" : tier;

    // Tables that the user can modify
    const allowedTables = [
      "routines",
      "routine_exercises",
      "workouts",
      "workout_sets",
      "user_body_logs",
      "user_settings",
      "exercises", // Only custom exercises
      "push_devices",
      "user_training_maxes",
      "user_advanced_program_enrollments",
      "post_reactions", // Phase 2G: User can create/update/delete own reactions
      "challenges", // Phase 2G: User can create/update own challenges
      "challenge_participants", // Phase 2G: User can join/leave challenges
      "workout_partners", // Phase 2G: User can create/update own partner sessions
      "workout_partner_invitations", // Phase 2G: User can create/update own invitations
      // leaderboards and leaderboard_entries are read-only (not in allowedTables)
    ];

    // SECURITY: Enforce routine limits before processing
    if (changes.routines?.created && changes.routines.created.length > 0) {
      const { count: currentCount } = await supabaseAdmin
        .from("routines")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("deleted_at", null);

      const maxRoutines =
        effectiveTier === "FREE"
          ? 3
          : effectiveTier === "PRO"
          ? 10
          : Infinity;

      if ((currentCount ?? 0) + changes.routines.created.length > maxRoutines) {
        return new Response(
          JSON.stringify({
            error: `Routine limit exceeded. ${effectiveTier} tier allows ${maxRoutines} routines.`,
            code: "LIMIT_EXCEEDED",
            limit: maxRoutines,
            current: currentCount ?? 0,
            attempted: changes.routines.created.length,
          }),
          {
            status: 409,
            headers: getResponseHeaders(corsHeaders),
          }
        );
      }
    }

    // SECURITY: Enforce custom exercise limits before processing
    if (changes.exercises?.created && changes.exercises.created.length > 0) {
      // Only count custom exercises
      const { count: currentCustomCount } = await supabaseAdmin
        .from("exercises")
        .select("*", { count: "exact", head: true })
        .eq("created_by_user_id", user.id)
        .eq("is_custom", true)
        .is("deleted_at", null);

      const maxCustomExercises =
        effectiveTier === "FREE"
          ? 7
          : effectiveTier === "PRO"
          ? 50
          : Infinity;

      if (
        (currentCustomCount ?? 0) + changes.exercises.created.length >
        maxCustomExercises
      ) {
        return new Response(
          JSON.stringify({
            error: `Custom exercise limit exceeded. ${effectiveTier} tier allows ${maxCustomExercises} custom exercises.`,
            code: "LIMIT_EXCEEDED",
            limit: maxCustomExercises,
            current: currentCustomCount ?? 0,
            attempted: changes.exercises.created.length,
          }),
          {
            status: 409,
            headers: getResponseHeaders(corsHeaders),
          }
        );
      }
    }

    // Process each table's changes
    for (const [table, tableChanges] of Object.entries(changes)) {
      if (!allowedTables.includes(table)) {
        console.log(`Skipping unauthorized table: ${table}`);
        continue;
      }

      // FIX: Batch upsert instead of loop (100 records = 1 query instead of 100)
      if (tableChanges.created.length > 0) {
        const serverRecords = tableChanges.created.map((record) =>
          prepareRecord(record, user.id, table)
        );

        const { error } = await supabaseAdmin
          .from(table)
          .upsert(serverRecords, { onConflict: "id" });

        if (error) {
          console.error(`Error batch inserting into ${table}:`, error);
        }
      }

      // Process updated records
      for (const record of tableChanges.updated) {
        const serverRecord = prepareRecord(record, user.id, table);

        // Verify ownership before update
        // Phase 2G: Handle different ownership fields
        let ownershipField = "user_id";
        if (table === "challenges") {
          ownershipField = "created_by_id";
        } else if (table === "exercises") {
          ownershipField = "created_by_user_id";
        }

        const { data: existing } = await supabaseAdmin
          .from(table)
          .select(ownershipField === "created_by_id" ? "created_by_id" : ownershipField === "created_by_user_id" ? "created_by_user_id" : "user_id")
          .eq("id", serverRecord.id)
          .single();

        if (existing) {
          const ownerId = existing[ownershipField];
          if (ownerId && ownerId !== user.id) {
            console.log(`Unauthorized update attempt on ${table}`);
            continue;
          }
        }

        const { error } = await supabaseAdmin
          .from(table)
          .update(serverRecord)
          .eq("id", serverRecord.id);

        if (error) {
          console.error(`Error updating ${table}:`, error);
        }
      }

      // Process deleted records (soft delete)
      for (const id of tableChanges.deleted) {
        // Verify ownership before delete
        // Phase 2G: Handle different ownership fields
        let ownershipField = "user_id";
        if (table === "challenges") {
          ownershipField = "created_by_id";
        } else if (table === "exercises") {
          ownershipField = "created_by_user_id";
        }

        const { data: existing } = await supabaseAdmin
          .from(table)
          .select(ownershipField === "created_by_id" ? "created_by_id" : ownershipField === "created_by_user_id" ? "created_by_user_id" : "user_id")
          .eq("id", id)
          .single();

        if (existing) {
          const ownerId = existing[ownershipField];
          if (ownerId && ownerId !== user.id) {
            console.log(`Unauthorized delete attempt on ${table}`);
            continue;
          }
        }

        const { error } = await supabaseAdmin
          .from(table)
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", id);

        if (error) {
          console.error(`Error soft-deleting from ${table}:`, error);
        }
      }
    }

    // Trigger full gamification chain for new workout sets
    // A2: Single XP path - all gamification runs server-side after sync-push
    if (changes.workout_sets?.created?.length > 0) {
      const setIds = changes.workout_sets.created.map(
        (s: Record<string, unknown>) => s.id || s.server_id
      ) as string[];

      // Get workout_id from the first set (all sets in a batch belong to same workout)
      // Sets have workout_id field that references the workout (may be local ID before sync)
      const firstSet = changes.workout_sets.created[0] as Record<string, unknown>;
      let workoutId = (firstSet.workout_id || firstSet.workoutId) as string | undefined;

      // If workout was also created in this sync, use that workout's server ID
      // Otherwise, query the database to get the server workout_id from the sets
      if (!workoutId && changes.workouts?.created?.length > 0) {
        // Workout was created in same sync - use its server ID
        const createdWorkout = changes.workouts.created[0] as Record<string, unknown>;
        workoutId = (createdWorkout.id || createdWorkout.server_id) as string | undefined;
      }

      // If still no workoutId, query database using one of the set IDs to get workout_id
      if (!workoutId && setIds.length > 0) {
        const { data: setData } = await supabaseAdmin
          .from("workout_sets")
          .select("workout_id")
          .eq("id", setIds[0])
          .single();
        workoutId = setData?.workout_id as string | undefined;
      }

      if (workoutId) {
        // Get workout visibility for social post creation
        const { data: workout } = await supabaseAdmin
          .from("workouts")
          .select("visibility, ended_at")
          .eq("id", workoutId)
          .single();

        const workoutVisibility = (workout as { visibility?: string } | null)?.visibility || "PRIVATE";
        const workoutEnded = (workout as { ended_at?: string | null } | null)?.ended_at;

        // 1. Award XP (already idempotent)
        // B4: Pass correlation_id in body to downstream functions
        try {
          await supabaseAdmin.functions.invoke("award-xp", {
            body: {
              userId: user.id,
              setIds,
              ...(correlationId && { correlation_id: correlationId }),
            },
          });
        } catch (error) {
          console.error("Error awarding XP:", error);
          // Continue with other gamification even if XP fails
        }

        // 2. Calculate level (idempotent - recalculates from total XP)
        try {
          await supabaseAdmin.functions.invoke("calculate-level", {
            body: {
              userId: user.id,
              ...(correlationId && { correlation_id: correlationId }),
            },
          });
        } catch (error) {
          console.error("Error calculating level:", error);
        }

        // 3. Detect PRs (only if workout is completed)
        if (workoutEnded) {
          try {
            await supabaseAdmin.functions.invoke("detect-pr", {
              body: {
                workoutId,
                ...(correlationId && { correlation_id: correlationId }),
              },
            });
          } catch (error) {
            console.error("Error detecting PRs:", error);
          }
        }

        // 4. Unlock badges (idempotent - checks conditions, only unlocks new ones)
        try {
          await supabaseAdmin.functions.invoke("unlock-badge", {
            body: {
              userId: user.id,
              ...(correlationId && { correlation_id: correlationId }),
            },
          });
        } catch (error) {
          console.error("Error unlocking badges:", error);
        }

        // 5. Create social post (only if workout is completed and not PRIVATE)
        if (workoutEnded && workoutVisibility !== "PRIVATE") {
          try {
            await supabaseAdmin.functions.invoke("create-social-post", {
              body: {
                workoutId,
                visibility: workoutVisibility,
                ...(correlationId && { correlation_id: correlationId }),
              },
            });
          } catch (error) {
            console.error("Error creating social post:", error);
            // Don't fail sync if social post fails
          }
        }
      }
    }

    // A6: Store idempotency key response (if provided)
    const responseBody = { success: true };
    const response = new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    if (idempotencyKey) {
      // Store response for future duplicate requests (TTL: 24 hours)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      try {
        await supabaseAdmin.from("idempotency_keys").insert({
          idempotency_key: idempotencyKey,
          user_id: user.id,
          response_body: responseBody,
          expires_at: expiresAt.toISOString(),
        });
      } catch (insertError) {
        // Log but don't fail the request if idempotency key storage fails
        console.error("Error storing idempotency key:", insertError);
      }
    }

    return response;
  } catch (error) {
    console.error("Sync push error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Prepare a record for server storage
 */
function prepareRecord(
  record: Record<string, unknown>,
  userId: string,
  table: string
): Record<string, unknown> {
  // Remove WatermelonDB-specific fields
  const { _status, _changed, server_id, ...rest } = record as Record<
    string,
    unknown
  > & {
    _status?: string;
    _changed?: string;
    server_id?: string;
  };

  // Suppress unused variable warnings
  void _status;
  void _changed;

  // Use server_id as id if present
  const id = server_id || rest.id;

  // Ensure user_id is set for user-owned tables
  const userOwnedTables = [
    "routines",
    "workouts",
    "user_body_logs",
    "push_devices",
    "user_training_maxes",
    "user_advanced_program_enrollments",
    "post_reactions", // Phase 2G: User's reactions
    "challenge_participants", // Phase 2G: User's challenge participations
    "workout_partners", // Phase 2G: User's workout partner sessions
    "workout_partner_invitations", // Phase 2G: User's workout partner invitations
  ];

  const result: Record<string, unknown> = {
    ...rest,
    id,
    updated_at: new Date().toISOString(),
  };

  // Phase 2G: Set created_by_id for challenges
  if (table === "challenges") {
    result.created_by_id = userId;
  }

  // SECURITY: Validate workout timestamps (prevent future dates, ensure logical ordering)
  if (table === "workouts") {
    const serverNow = new Date().toISOString();
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Validate started_at is not in the future (allow 5min grace for clock drift)
    if (result.started_at) {
      const startedAt = new Date(result.started_at as string);
      const now = new Date();
      const fiveMinutesFromNowDate = new Date(now.getTime() + 5 * 60 * 1000);

      if (startedAt > fiveMinutesFromNowDate) {
        // Client timestamp is in the future - use server time
        console.warn(
          `Workout started_at is in the future (${result.started_at}), using server time`
        );
        result.started_at = serverNow;
      }
    }

    // Validate ended_at is not before started_at and not in the future
    if (result.ended_at && result.started_at) {
      const endedAt = new Date(result.ended_at as string);
      const startedAt = new Date(result.started_at as string);
      const now = new Date();
      const fiveMinutesFromNowDate = new Date(now.getTime() + 5 * 60 * 1000);

      if (endedAt < startedAt || endedAt > fiveMinutesFromNowDate) {
        // Invalid timestamp - use server time
        console.warn(
          `Workout ended_at is invalid (before started_at or in future), using server time`
        );
        result.ended_at = serverNow;
      }
    }
  }

  if (userOwnedTables.includes(table)) {
    result.user_id = userId;
  }

  // For exercises, set created_by_user_id
  if (table === "exercises") {
    result.created_by_user_id = userId;
    result.is_custom = true;
  }

  return result;
}
