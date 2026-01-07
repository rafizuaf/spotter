// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Level formula: level = floor(sqrt(totalXp / 100)) + 1
function calculateLevel(totalXp: number): {
  level: number;
  xpToNextLevel: number;
} {
  const level = Math.floor(Math.sqrt(totalXp / 100)) + 1;

  // Calculate XP needed for next level
  const xpForNextLevel = Math.pow(level, 2) * 100;
  const xpToNextLevel = xpForNextLevel - totalXp;

  return { level, xpToNextLevel };
}

interface CalculateLevelRequest {
  userId: string;
}

interface XpLog {
  xp_amount: number;
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization")!;
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

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

    // Parse request
    const { userId }: CalculateLevelRequest = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure user can only calculate their own level
    if (userId !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SECRET_KEY") ?? ""
    );

    // Sum total XP from user_xp_logs
    const { data: xpLogs, error: xpError } = await supabaseAdmin
      .from("user_xp_logs")
      .select("xp_amount")
      .eq("user_id", userId);

    if (xpError) {
      console.error("Error fetching XP logs:", xpError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch XP logs" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const totalXp =
      (xpLogs as XpLog[])?.reduce((sum, log) => sum + log.xp_amount, 0) || 0;

    // Calculate level and XP to next level
    const { level, xpToNextLevel } = calculateLevel(totalXp);

    // Upsert to user_levels cache table
    const { error: upsertError } = await supabaseAdmin
      .from("user_levels")
      .upsert(
        {
          user_id: userId,
          total_xp: totalXp,
          level: level,
          xp_to_next_level: xpToNextLevel,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.error("Error upserting user_levels:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to update user level" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Return level data
    return new Response(
      JSON.stringify({
        success: true,
        totalXp,
        level,
        xpToNextLevel,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Calculate level error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
