// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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
    ];

    // Process each table's changes
    for (const [table, tableChanges] of Object.entries(changes)) {
      if (!allowedTables.includes(table)) {
        console.log(`Skipping unauthorized table: ${table}`);
        continue;
      }

      // Process created records
      for (const record of tableChanges.created) {
        const serverRecord = prepareRecord(record, user.id, table);

        const { error } = await supabaseAdmin
          .from(table)
          .upsert(serverRecord, { onConflict: "id" });

        if (error) {
          console.error(`Error inserting into ${table}:`, error);
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
  ];

  const result: Record<string, unknown> = {
    ...rest,
    id,
    updated_at: new Date().toISOString(),
  };

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
