// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js";

// CORS: Restrict to specific origin for security
const getAllowedOrigin = (): string => {
  const allowedOrigin = Deno.env.get("FRONTEND_URL") || "https://spotter-app.com";
  return allowedOrigin;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": getAllowedOrigin(),
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TableChanges {
  created: Record<string, unknown>[];
  updated: Record<string, unknown>[];
  deleted: string[];
}

interface PushRequest {
  changes: Record<string, TableChanges>;
  lastPulledAt: number | null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    // Parse request body
    const { changes }: PushRequest = await req.json();

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
            headers: { ...corsHeaders, "Content-Type": "application/json" },
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
            headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        const { data: existing } = await supabaseAdmin
          .from(table)
          .select("user_id, created_by_user_id")
          .eq("id", serverRecord.id)
          .single();

        if (existing) {
          const ownerId = existing.user_id || existing.created_by_user_id;
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
        const { data: existing } = await supabaseAdmin
          .from(table)
          .select("user_id, created_by_user_id")
          .eq("id", id)
          .single();

        if (existing) {
          const ownerId = existing.user_id || existing.created_by_user_id;
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

    // Trigger XP calculation for new workout sets
    if (changes.workout_sets?.created?.length > 0) {
      await supabaseAdmin.functions.invoke("award-xp", {
        body: {
          userId: user.id,
          setIds: changes.workout_sets.created.map(
            (s: Record<string, unknown>) => s.id || s.server_id
          ),
        },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
  ];

  const result: Record<string, unknown> = {
    ...rest,
    id,
    updated_at: new Date().toISOString(),
  };

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
