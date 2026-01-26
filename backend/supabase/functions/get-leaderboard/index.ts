// Edge Function: get-leaderboard
// Phase 2G: Social & Competition - Leaderboards
// Description: Get leaderboard entries with user's rank

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";

const getAllowedOrigin = (): string => {
  return Deno.env.get("FRONTEND_URL") || "https://spotter-app.com";
};

const corsHeaders = {
  "Access-Control-Allow-Origin": getAllowedOrigin(),
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GetLeaderboardRequest {
  leaderboard_code: string;
  limit?: number;
}

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  level: number;
  score: number;
  is_current_user: boolean;
}

interface GetLeaderboardResponse {
  leaderboard: {
    code: string;
    title: string;
    description: string | null;
    metric_type: string;
    time_period: string;
  };
  entries: LeaderboardEntry[];
  user_entry: LeaderboardEntry | null;
  period: {
    start: string;
    end: string;
  };
  computed_at: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header", code: "AUTH_REQUIRED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_REQUIRED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { leaderboard_code, limit = 50 }: GetLeaderboardRequest = await req.json();

    if (!leaderboard_code || typeof leaderboard_code !== "string") {
      return new Response(
        JSON.stringify({ error: "leaderboard_code is required", code: "INVALID_INPUT", field: "leaderboard_code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const safeLimit = Math.min(Math.max(1, limit), 100);

    // Get leaderboard definition
    const { data: leaderboard, error: lbError } = await supabaseClient
      .from("leaderboards")
      .select("id, code, title, description, metric_type, time_period")
      .eq("code", leaderboard_code)
      .eq("is_active", true)
      .single();

    if (lbError || !leaderboard) {
      return new Response(
        JSON.stringify({ error: "Leaderboard not found", code: "NOT_FOUND", resource: "leaderboard" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the most recent period's entries
    const { data: entries, error: entriesError } = await supabaseClient
      .from("leaderboard_entries")
      .select(`
        rank,
        score,
        user_id,
        period_start,
        period_end,
        computed_at
      `)
      .eq("leaderboard_id", leaderboard.id)
      .order("rank", { ascending: true })
      .limit(safeLimit);

    if (entriesError) {
      console.error("Error fetching leaderboard entries:", entriesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch leaderboard entries", code: "INTERNAL_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user details for entries
    const userIds = entries?.map((e) => e.user_id) || [];
    let userMap: Map<string, { username: string; avatar_url: string | null; level: number }> = new Map();

    if (userIds.length > 0) {
      const { data: users } = await supabaseClient
        .from("users")
        .select("id, username, avatar_url")
        .in("id", userIds);

      const { data: levels } = await supabaseClient
        .from("user_levels")
        .select("user_id, level")
        .in("user_id", userIds);

      const levelMap = new Map(levels?.map((l) => [l.user_id, l.level]) || []);

      users?.forEach((u) => {
        userMap.set(u.id, {
          username: u.username,
          avatar_url: u.avatar_url,
          level: levelMap.get(u.id) || 1,
        });
      });
    }

    // Build response entries
    const formattedEntries: LeaderboardEntry[] = (entries || []).map((entry) => {
      const userData = userMap.get(entry.user_id);
      return {
        rank: entry.rank,
        user_id: entry.user_id,
        username: userData?.username || "Unknown",
        avatar_url: userData?.avatar_url || null,
        level: userData?.level || 1,
        score: Number(entry.score),
        is_current_user: entry.user_id === user.id,
      };
    });

    // Find user's entry (might not be in top N)
    let userEntry: LeaderboardEntry | null = formattedEntries.find((e) => e.is_current_user) || null;

    // If user not in top results, fetch their rank separately
    if (!userEntry) {
      const { data: userRankEntry } = await supabaseClient
        .from("leaderboard_entries")
        .select("rank, score, user_id")
        .eq("leaderboard_id", leaderboard.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (userRankEntry) {
        const { data: userData } = await supabaseClient
          .from("users")
          .select("username, avatar_url")
          .eq("id", user.id)
          .single();

        const { data: userLevel } = await supabaseClient
          .from("user_levels")
          .select("level")
          .eq("user_id", user.id)
          .single();

        userEntry = {
          rank: userRankEntry.rank,
          user_id: user.id,
          username: userData?.username || "You",
          avatar_url: userData?.avatar_url || null,
          level: userLevel?.level || 1,
          score: Number(userRankEntry.score),
          is_current_user: true,
        };
      }
    }

    // Get period info from first entry or use defaults
    const periodStart = entries?.[0]?.period_start || new Date().toISOString();
    const periodEnd = entries?.[0]?.period_end || new Date().toISOString();
    const computedAt = entries?.[0]?.computed_at || new Date().toISOString();

    const response: GetLeaderboardResponse = {
      leaderboard: {
        code: leaderboard.code,
        title: leaderboard.title,
        description: leaderboard.description,
        metric_type: leaderboard.metric_type,
        time_period: leaderboard.time_period,
      },
      entries: formattedEntries,
      user_entry: userEntry,
      period: {
        start: periodStart,
        end: periodEnd,
      },
      computed_at: computedAt,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("get-leaderboard error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
