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

// XP Configuration (LOCKED v1)
const XP_PER_SET = 10;
const XP_WORKOUT_BONUS = 50;
const DAILY_XP_CAP = 1000; // Max XP per day (100 sets worth)
const WORKOUT_XP_CAP = 500; // Max XP per workout (50 sets worth)
const MAX_SETS_PER_REQUEST = 100; // Prevent abuse - no workout has 100+ sets

interface AwardXpRequest {
  userId: string;
  setIds: string[];
  correlation_id?: string; // B4: Optional correlation ID for tracing
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

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getResponseHeaders(corsHeaders) });
  }

  try {
    // B4: Read and log correlation ID (from header or body)
    const correlationIdFromHeader = req.headers.get("X-Correlation-ID");
    
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
    
    // B4: Use correlation ID from header (preferred) or body (for internal calls)
    const correlationId = correlationIdFromHeader || correlationIdFromBody;
    if (correlationId) {
      console.log(`[award-xp] correlationId: ${correlationId}`);
    }

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

    // SECURITY: Rate limiting - prevent abuse
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

    // Validate set count to prevent abuse
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

    // SECURITY: Use UTC for daily cap calculation to prevent timezone manipulation abuse
    // Users cannot bypass daily cap by changing timezone_preference
    const now = new Date();
    const todayStartUTC = new Date(now);
    todayStartUTC.setUTCHours(0, 0, 0, 0);

    // Get today's XP total (using UTC calendar day)
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
      return new Response(
        JSON.stringify({ message: "Daily XP cap reached", xpAwarded: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let xpAwarded = 0;

    // Get existing XP logs for these sets (idempotency check)
    const { data: existingLogs } = await supabaseAdmin
      .from("user_xp_logs")
      .select("source_id")
      .eq("user_id", userId)
      .eq("source_type", "SET")
      .in("source_id", setIds);

    const existingSetIds = new Set(
      (existingLogs as XpLog[] | null)?.map((log) => log.source_id) || []
    );

    // Get XP already awarded for this workout
    const { data: workoutXpData } = await supabaseAdmin
      .from("user_xp_logs")
      .select("xp_amount")
      .eq("user_id", userId)
      .eq("source_type", "SET")
      .in(
        "source_id",
        typedSets.map((s) => s.id)
      );

    const workoutXpTotal =
      (workoutXpData as XpLog[] | null)?.reduce(
        (sum, log) => sum + log.xp_amount,
        0
      ) || 0;

    // Award XP for each new set
    for (const set of typedSets) {
      // Skip if already awarded (idempotency)
      if (existingSetIds.has(set.id)) {
        continue;
      }

      // Check caps
      if (todayXpTotal + xpAwarded >= DAILY_XP_CAP) {
        break;
      }

      if (workoutXpTotal + xpAwarded >= WORKOUT_XP_CAP) {
        break;
      }

      // Award XP for this set
      // SECURITY: Use ON CONFLICT DO NOTHING to handle race conditions gracefully
      const { error: insertError } = await supabaseAdmin
        .from("user_xp_logs")
        .insert({
          user_id: userId,
          source_type: "SET",
          source_id: set.id,
          xp_amount: XP_PER_SET,
        })
        .onConflict('user_id, source_type, source_id')
        .ignoreDuplicates(); // Prevents duplicate XP on concurrent requests

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
      // Check if workout bonus already awarded
      const { data: existingBonus } = await supabaseAdmin
        .from("user_xp_logs")
        .select("id")
        .eq("user_id", userId)
        .eq("source_type", "WORKOUT")
        .eq("source_id", workoutId)
        .single();

    if (!existingBonus && todayXpTotal + xpAwarded < DAILY_XP_CAP) {
      // SECURITY: Use ON CONFLICT DO NOTHING to handle race conditions gracefully
      const { error: bonusError } = await supabaseAdmin
        .from("user_xp_logs")
        .insert({
          user_id: userId,
          source_type: "WORKOUT",
          source_id: workoutId,
          xp_amount: XP_WORKOUT_BONUS,
        })
        .onConflict('user_id, source_type, source_id')
        .ignoreDuplicates(); // Prevents duplicate workout bonus on concurrent requests

      if (!bonusError) {
        xpAwarded += XP_WORKOUT_BONUS;
      }
    }
    }

    // Update user level cache
    if (xpAwarded > 0) {
      await updateUserLevel(supabaseAdmin, userId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        xpAwarded,
        todayTotal: todayXpTotal + xpAwarded,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Award XP error:", error);
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
 * Level formula: level = floor(sqrt(totalXp / 100)) + 1
 */
async function updateUserLevel(supabase: ReturnType<typeof createClient>, userId: string): Promise<void> {
  // Calculate total XP
  const { data: xpLogs } = await supabase
    .from("user_xp_logs")
    .select("xp_amount")
    .eq("user_id", userId);

  const totalXp =
    (xpLogs as XpLog[] | null)?.reduce((sum, log) => sum + log.xp_amount, 0) ||
    0;

  // Calculate level (quadratic-lite formula)
  const level = Math.floor(Math.sqrt(totalXp / 100)) + 1;

  // Calculate XP needed for next level
  const xpForNextLevel = Math.pow(level, 2) * 100;
  const xpToNextLevel = xpForNextLevel - totalXp;

  // Update user_levels cache
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
