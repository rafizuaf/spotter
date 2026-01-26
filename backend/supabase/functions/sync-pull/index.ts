// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js";
import { getResponseHeaders } from "../_shared/security.ts";

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

interface PullRequest {
  lastPulledAt: number | null;
  tables: string[];
}

interface TableChanges {
  created: Record<string, unknown>[];
  updated: Record<string, unknown>[];
  deleted: string[];
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getResponseHeaders(corsHeaders) });
  }

  try {
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

    // Create Supabase client with user's auth token
    // Uses publishable key for client-side safe operations with RLS
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
        headers: getResponseHeaders(corsHeaders),
      });
    }

    // Parse request body
    const { lastPulledAt, tables }: PullRequest = await req.json();

    // Convert timestamp to ISO string for comparison
    const lastPulledAtISO = lastPulledAt
      ? new Date(lastPulledAt).toISOString()
      : new Date(0).toISOString();

    const changes: Record<string, TableChanges> = {};
    const currentTimestamp = Date.now();

    // Fetch changes for each table
    for (const table of tables) {
      const tableChanges: TableChanges = {
        created: [],
        updated: [],
        deleted: [],
      };

      // Build query based on table
      let query = supabaseClient.from(table).select("*");

      // Filter by user for user-specific tables
      const userTables = [
        "user_settings",
        "routines",
        "routine_exercises",
        "workouts",
        "workout_sets",
        "user_body_logs",
        "user_xp_logs",
        "user_levels",
        "user_badges",
        "notifications",
        "push_devices",
        "user_training_maxes",
        "user_advanced_program_enrollments",
        "user_entitlements", // Phase 2F: Monetization (READ-ONLY, pull-only)
        "post_reactions", // Phase 2G: User's reactions
        "challenge_participants", // Phase 2G: User's challenge participations
        "workout_partners", // Phase 2G: User's workout partner sessions
        "workout_partner_invitations", // Phase 2G: User's workout partner invitations
      ];

      if (userTables.includes(table)) {
        query = query.eq("user_id", user.id);
      }

      // For users table, only get the current user's profile
      if (table === "users") {
        query = query.eq("id", user.id);
      }

      // Phase 2G: Special handling for challenges (RLS handles visibility automatically)
      if (table === "challenges") {
        // RLS policy already filters by visibility (PUBLIC, FOLLOWERS, INVITE_ONLY)
        // No additional filtering needed - RLS enforces visibility rules
      }

      // Phase 2G: Special handling for post_reactions
      // RLS policy filters to reactions on visible posts automatically
      // We want user's reactions AND reactions on posts user can see
      if (table === "post_reactions") {
        // RLS policy already handles visibility (reactions on visible posts)
        // No additional filtering needed
      }

      // Phase 2G: Special handling for leaderboards (read-only, pull all active)
      if (table === "leaderboards") {
        query = query.eq("is_active", true);
      }

      // Phase 2G: Special handling for leaderboard_entries (read-only)
      // RLS policy filters out blocked users automatically
      // No additional filtering needed

      // Get records updated since last pull
      query = query.gte("updated_at", lastPulledAtISO);

      // SECURITY: Add pagination limit to prevent unbounded queries
      // Prevents timeout/crash on first sync after long period
      query = query.limit(1000);

      const { data, error } = await query;

      if (error) {
        console.error(`Error fetching ${table}:`, error);
        continue;
      }

      if (data) {
        for (const record of data) {
          // Map server ID to WatermelonDB format
          const mappedRecord = {
            ...record,
            server_id: record.id,
          };

          if (record.deleted_at) {
            // Record was soft-deleted
            tableChanges.deleted.push(record.id);
          } else if (new Date(record.created_at) > new Date(lastPulledAtISO)) {
            // New record
            tableChanges.created.push(mappedRecord);
          } else {
            // Updated record
            tableChanges.updated.push(mappedRecord);
          }
        }
      }

      changes[table] = tableChanges;
    }

    return new Response(
      JSON.stringify({
        changes,
        timestamp: currentTimestamp,
      }),
      {
        headers: getResponseHeaders(corsHeaders),
      }
    );
  } catch (error) {
    console.error("Sync pull error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: getResponseHeaders(corsHeaders),
    });
  }
});
