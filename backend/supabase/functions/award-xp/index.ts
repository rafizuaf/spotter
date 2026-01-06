// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// XP Configuration (LOCKED v1)
const XP_PER_SET = 10;
const XP_WORKOUT_BONUS = 50;
const DAILY_XP_CAP = 500;
const WORKOUT_XP_CAP = 200;

interface AwardXpRequest {
  userId: string;
  setIds: string[];
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
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client with secret key (bypasses RLS for admin operations)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SECRET_KEY") ?? ""
    );

    const { userId, setIds }: AwardXpRequest = await req.json();

    if (!userId || !setIds || setIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing userId or setIds" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get today's start timestamp for daily cap
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Get today's XP total
    const { data: todayXpData } = await supabaseAdmin
      .from("user_xp_logs")
      .select("xp_amount")
      .eq("user_id", userId)
      .gte("created_at", todayStart.toISOString());

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

    // Get workout ID from the sets
    const { data: sets } = await supabaseAdmin
      .from("workout_sets")
      .select("id, workout_id")
      .in("id", setIds);

    if (!sets || sets.length === 0) {
      return new Response(JSON.stringify({ error: "No valid sets found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const typedSets = sets as WorkoutSet[];
    const workoutId = typedSets[0].workout_id;

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
      // Check if workout bonus already awarded
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
// deno-lint-ignore no-explicit-any
async function updateUserLevel(supabase: any, userId: string): Promise<void> {
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
