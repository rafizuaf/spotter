// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rateLimit.ts";
import { getResponseHeaders } from "../_shared/security.ts";

// B5: API Versioning - v2 example
// This demonstrates the versioning pattern with a hypothetical breaking change:
// - v2 response includes additional metadata (level, levelProgress)
// - v1 response: { success, xpAwarded, todayTotal }
// - v2 response: { success, xpAwarded, todayTotal, level, levelProgress, nextLevelXp }

// CORS: Restrict to specific origin for security
const getAllowedOrigin = (): string => {
  const allowedOrigin = Deno.env.get("FRONTEND_URL") || "https://spotter-app.com";
  return allowedOrigin;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": getAllowedOrigin(),
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-correlation-id, x-api-version", // B5: Allow API version header
};

// XP Configuration (LOCKED v1)
const XP_PER_SET = 10;
const XP_WORKOUT_BONUS = 50;
const DAILY_XP_CAP = 1000;
const WORKOUT_XP_CAP = 500;
const MAX_SETS_PER_REQUEST = 100;

interface AwardXpRequest {
  userId: string;
  setIds: string[];
  correlation_id?: string;
}

interface XpLog {
  xp_amount: number;
  source_id?: string;
}

interface WorkoutSet {
  id: string;
  workout_id: string;
}

interface Workout {
  id: string;
  ended_at: string | null;
}

// B5: v2 Response includes level information
interface AwardXpV2Response {
  success: boolean;
  xpAwarded: number;
  todayTotal: number;
  level: number; // NEW in v2
  levelProgress: number; // NEW in v2 (0-100)
  nextLevelXp: number; // NEW in v2
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getResponseHeaders(corsHeaders) });
  }

  try {
    // B5: Read API version header (optional, defaults to latest)
    const apiVersion = req.headers.get("X-API-Version") || "2";
    const correlationId = req.headers.get("X-Correlation-ID");
    
    if (correlationId) {
      console.log(`[award-xp-v2] API Version: ${apiVersion}, Correlation-ID: ${correlationId}`);
    }

    // SECURITY: Authenticate user first
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header", code: "AUTH_REQUIRED" }),
        {
          status: 401,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // Create user client for authentication
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
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_REQUIRED" }),
        {
          status: 401,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // Create Supabase client with secret key (bypasses RLS for admin operations)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SECRET_KEY") ?? ""
    );

    const { userId, setIds, correlation_id: correlationIdFromBody }: AwardXpRequest = await req.json();
    
    const finalCorrelationId = correlationId || correlationIdFromBody;

    if (!userId || !setIds || setIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing userId or setIds" }),
        {
          status: 400,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // SECURITY: Verify userId matches authenticated user
    if (userId !== user.id) {
      return new Response(
        JSON.stringify({ error: "Forbidden", code: "FORBIDDEN" }),
        {
          status: 403,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // SECURITY: Rate limiting
    const rateLimit = await checkRateLimit(
      user.id,
      'award-xp',
      RATE_LIMITS['award-xp'].maxRequests,
      RATE_LIMITS['award-xp'].windowMs,
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
            "X-RateLimit-Limit": RATE_LIMITS['award-xp'].maxRequests.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.resetAt.toString(),
          },
        }
      );
    }

    // Validate set count
    if (setIds.length > MAX_SETS_PER_REQUEST) {
      return new Response(
        JSON.stringify({
          error: `Too many sets in request. Maximum ${MAX_SETS_PER_REQUEST} sets allowed.`,
          setsReceived: setIds.length,
        }),
        {
          status: 400,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // SECURITY: Get sets and verify they belong to user's workouts
    const { data: sets, error: setsError } = await supabaseAdmin
      .from("workout_sets")
      .select("id, workout_id, workouts!inner(user_id)")
      .in("id", setIds)
      .eq("workouts.user_id", user.id);

    if (setsError) {
      console.error("Error fetching sets:", setsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch sets" }),
        {
          status: 500,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    if (!sets || sets.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "No valid sets found or sets do not belong to you",
          code: "NOT_FOUND"
        }),
        {
          status: 404,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    const typedSets = sets as WorkoutSet[];
    const workoutId = typedSets[0].workout_id;

    // Get user's timezone (same logic as v1)
    let userTimezone: string | null = null;
    
    if (workoutId) {
      const { data: workout } = await supabaseAdmin
        .from("workouts")
        .select("local_timezone")
        .eq("id", workoutId)
        .single();
      
      if (workout && (workout as { local_timezone?: string | null }).local_timezone) {
        userTimezone = (workout as { local_timezone: string }).local_timezone;
      }
    }
    
    if (!userTimezone) {
      const { data: userSettings } = await supabaseAdmin
        .from("user_settings")
        .select("timezone_preference")
        .eq("user_id", userId)
        .single();
      
      if (userSettings && (userSettings as { timezone_preference?: string | null }).timezone_preference) {
        userTimezone = (userSettings as { timezone_preference: string }).timezone_preference;
      }
    }

    const now = new Date();
    let todayStartUTC: Date;
    
    if (userTimezone) {
      const nowInUserTz = new Date(now.toLocaleString("en-US", { timeZone: userTimezone }));
      const todayInUserTz = new Date(nowInUserTz);
      todayInUserTz.setHours(0, 0, 0, 0);
      const offsetMs = now.getTime() - nowInUserTz.getTime();
      todayStartUTC = new Date(todayInUserTz.getTime() + offsetMs);
    } else {
      todayStartUTC = new Date(now);
      todayStartUTC.setUTCHours(0, 0, 0, 0);
    }

    // Get today's XP total
    const { data: todayXpData } = await supabaseAdmin
      .from("user_xp_logs")
      .select("xp_amount")
      .eq("user_id", userId)
      .gte("created_at", todayStartUTC.toISOString());

    const todayXpTotal =
      (todayXpData as XpLog[] | null)?.reduce(
        (sum, log) => sum + log.xp_amount,
        0
      ) || 0;

    if (todayXpTotal >= DAILY_XP_CAP) {
      // B5: v2 response includes level info even when cap reached
      const levelData = await getUserLevelData(supabaseAdmin, userId);
      return new Response(
        JSON.stringify({
          success: true,
          xpAwarded: 0,
          todayTotal: todayXpTotal,
          ...levelData,
        } as AwardXpV2Response),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let xpAwarded = 0;

    // Get existing XP logs for idempotency
    const { data: existingLogs } = await supabaseAdmin
      .from("user_xp_logs")
      .select("source_id")
      .eq("user_id", userId)
      .eq("source_type", "SET")
      .in("source_id", setIds);

    const existingSetIds = new Set(
      (existingLogs as XpLog[] | null)?.map((log) => log.source_id) || []
    );

    // Get workout XP total
    const { data: workoutXpData } = await supabaseAdmin
      .from("user_xp_logs")
      .select("xp_amount")
      .eq("user_id", userId)
      .eq("source_type", "SET")
      .in("source_id", typedSets.map((s) => s.id));

    const workoutXpTotal =
      (workoutXpData as XpLog[] | null)?.reduce(
        (sum, log) => sum + log.xp_amount,
        0
      ) || 0;

    // Award XP for each new set
    for (const set of typedSets) {
      if (existingSetIds.has(set.id)) {
        continue;
      }

      if (todayXpTotal + xpAwarded >= DAILY_XP_CAP) {
        break;
      }

      if (workoutXpTotal + xpAwarded >= WORKOUT_XP_CAP) {
        break;
      }

      const { error: insertError } = await supabaseAdmin
        .from("user_xp_logs")
        .insert({
          user_id: userId,
          source_type: "SET",
          source_id: set.id,
          xp_amount: XP_PER_SET,
        });

      if (!insertError) {
        xpAwarded += XP_PER_SET;
      }
    }

    // Check if workout is complete and award bonus
    const { data: workout } = await supabaseAdmin
      .from("workouts")
      .select("id, ended_at")
      .eq("id", workoutId)
      .single();

    const typedWorkout = workout as Workout | null;

    if (typedWorkout?.ended_at) {
      const { data: existingBonus } = await supabaseAdmin
        .from("user_xp_logs")
        .select("id")
        .eq("user_id", userId)
        .eq("source_type", "WORKOUT")
        .eq("source_id", workoutId)
        .single();

      if (!existingBonus && todayXpTotal + xpAwarded < DAILY_XP_CAP) {
        const { error: bonusError } = await supabaseAdmin
          .from("user_xp_logs")
          .insert({
            user_id: userId,
            source_type: "WORKOUT",
            source_id: workoutId,
            xp_amount: XP_WORKOUT_BONUS,
          });

        if (!bonusError) {
          xpAwarded += XP_WORKOUT_BONUS;
        }
      }
    }

    // Update user level cache
    if (xpAwarded > 0) {
      await updateUserLevel(supabaseAdmin, userId);
    }

    // B5: v2 response includes level information
    const levelData = await getUserLevelData(supabaseAdmin, userId);

    return new Response(
      JSON.stringify({
        success: true,
        xpAwarded,
        todayTotal: todayXpTotal + xpAwarded,
        ...levelData,
      } as AwardXpV2Response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Award XP v2 error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Update user level based on total XP
 */
async function updateUserLevel(supabase: ReturnType<typeof createClient>, userId: string): Promise<void> {
  const { data: xpLogs } = await supabase
    .from("user_xp_logs")
    .select("xp_amount")
    .eq("user_id", userId);

  const totalXp =
    (xpLogs as XpLog[] | null)?.reduce((sum, log) => sum + log.xp_amount, 0) ||
    0;

  const level = Math.floor(Math.sqrt(totalXp / 100)) + 1;
  const xpForNextLevel = Math.pow(level, 2) * 100;
  const xpToNextLevel = xpForNextLevel - totalXp;

  await supabase.from("user_levels").upsert(
    {
      user_id: userId,
      total_xp: totalXp,
      level,
      xp_to_next_level: Math.max(0, xpToNextLevel),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

/**
 * B5: v2 helper - Get user level data for response
 */
async function getUserLevelData(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<{ level: number; levelProgress: number; nextLevelXp: number }> {
  const { data: levelData } = await supabase
    .from("user_levels")
    .select("level, xp_to_next_level, total_xp")
    .eq("user_id", userId)
    .single();

  if (levelData) {
    const level = levelData.level as number;
    const totalXp = levelData.total_xp as number;
    const xpToNextLevel = levelData.xp_to_next_level as number;
    const xpForCurrentLevel = Math.pow(level - 1, 2) * 100;
    const xpForNextLevel = Math.pow(level, 2) * 100;
    const xpInCurrentLevel = totalXp - xpForCurrentLevel;
    const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;
    const levelProgress = Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForLevel) * 100));

    return {
      level,
      levelProgress: Math.round(levelProgress * 100) / 100, // Round to 2 decimals
      nextLevelXp: xpToNextLevel,
    };
  }

  // Default if no level data
  return {
    level: 1,
    levelProgress: 0,
    nextLevelXp: 100,
  };
}
