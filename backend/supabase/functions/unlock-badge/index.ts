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

interface UnlockBadgeRequest {
  userId: string;
}

interface Achievement {
  code: string;
  title: string;
  description: string;
  icon_url: string | null;
  threshold_value: number | null;
  relevant_muscle_group: string | null;
}

interface UserBadge {
  achievement_code: string;
}

interface UnlockedBadge {
  code: string;
  title: string;
  description: string;
  earnedAt: string;
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
    const { userId }: UnlockBadgeRequest = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure user can only unlock their own badges
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

    // Get all achievements
    const { data: achievements, error: achievementsError } =
      await supabaseAdmin.from("achievements").select("*");

    if (achievementsError) {
      console.error("Error fetching achievements:", achievementsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch achievements" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user's existing badges
    const { data: existingBadges, error: badgesError } = await supabaseAdmin
      .from("user_badges")
      .select("achievement_code")
      .eq("user_id", userId)
      .eq("deleted_at", null);

    if (badgesError) {
      console.error("Error fetching user badges:", badgesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch user badges" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const existingBadgeCodes = new Set(
      (existingBadges as UserBadge[])?.map((b) => b.achievement_code) || []
    );

    // FIX: Pre-aggregate all user stats in single queries instead of N+1 pattern
    // This eliminates 30+ individual queries and replaces with 3-4 batch queries
    const [workoutCountResult, prCountResult, userLevelResult, muscleGroupStatsResult] = await Promise.all([
      // Total workout count
      supabaseAdmin
        .from("workouts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("deleted_at", null),
      // PR count
      supabaseAdmin
        .from("workout_sets")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_pr", true)
        .eq("deleted_at", null),
      // User level
      supabaseAdmin
        .from("user_levels")
        .select("level")
        .eq("user_id", userId)
        .single(),
      // Muscle group stats (get all sets with muscle groups)
      supabaseAdmin
        .from("workout_sets")
        .select("exercise_id, exercises!inner(muscle_group)")
        .eq("user_id", userId)
        .eq("deleted_at", null),
    ]);

    const workoutCount = workoutCountResult.count ?? 0;
    const prCount = prCountResult.count ?? 0;
    const userLevel = (userLevelResult.data as { level: number } | null)?.level ?? 0;
    
    // Group muscle group sets by muscle_group
    const muscleGroupCounts = new Map<string, number>();
    if (muscleGroupStatsResult.data) {
      (muscleGroupStatsResult.data as Array<{ exercises: { muscle_group: string } }>).forEach((set) => {
        const muscleGroup = set.exercises.muscle_group;
        muscleGroupCounts.set(muscleGroup, (muscleGroupCounts.get(muscleGroup) ?? 0) + 1);
      });
    }

    const newlyUnlocked: UnlockedBadge[] = [];

    // Check each achievement using pre-aggregated stats
    for (const achievement of achievements as Achievement[]) {
      // Skip if already earned
      if (existingBadgeCodes.has(achievement.code)) {
        continue;
      }

      // Evaluate achievement condition using pre-aggregated stats
      let conditionMet = false;

      // First workout badge
      if (achievement.code === "FIRST_WORKOUT") {
        conditionMet = workoutCount >= 1;
      }

      // Workout count badges (10, 50, 100, 500, 1000)
      else if (achievement.code.startsWith("WORKOUT_")) {
        const threshold = achievement.threshold_value ?? 0;
        conditionMet = workoutCount >= threshold;
      }

      // First PR badge
      else if (achievement.code === "FIRST_PR") {
        conditionMet = prCount >= 1;
      }

      // PR count badges
      else if (achievement.code.startsWith("PR_COUNT_")) {
        const threshold = achievement.threshold_value ?? 0;
        conditionMet = prCount >= threshold;
      }

      // Level badges
      else if (achievement.code.startsWith("LEVEL_")) {
        const threshold = achievement.threshold_value ?? 0;
        conditionMet = userLevel >= threshold;
      }

      // Muscle group specific badges (e.g., "CHEST_CHAMPION")
      else if (achievement.relevant_muscle_group) {
        const threshold = achievement.threshold_value ?? 10;
        const muscleGroupCount = muscleGroupCounts.get(achievement.relevant_muscle_group) ?? 0;
        conditionMet = muscleGroupCount >= threshold;
      }

      // If condition met, create badge
      // FIX: Use ON CONFLICT DO NOTHING to prevent race condition duplicates
      // This ensures idempotency even if multiple requests arrive simultaneously
      if (conditionMet) {
        const now = new Date().toISOString();

        const { data: insertedBadge, error: insertError } = await supabaseAdmin
          .from("user_badges")
          .insert({
            user_id: userId,
            achievement_code: achievement.code,
            earned_at: now,
            is_rusty: false,
            last_maintained_at: now,
          })
          .select()
          .single();

        // FIX: Handle race condition - unique constraint violation is expected if badge already exists
        // PostgreSQL error code 23505 = unique_violation
        if (!insertError) {
          // Badge successfully inserted
          newlyUnlocked.push({
            code: achievement.code,
            title: achievement.title,
            description: achievement.description,
            earnedAt: now,
          });
        } else if (insertError.code === "23505") {
          // Race condition: badge already exists (another request inserted it)
          // This is expected behavior, silently ignore
        } else {
          // Unexpected error, log it
          console.error("Error creating badge:", insertError);
        }
      }
    }

    // Create notifications for newly unlocked badges
    const now = new Date().toISOString();
    for (const badge of newlyUnlocked) {
      await supabaseAdmin.from("notifications").insert({
        recipient_id: userId,
        type: "ACHIEVEMENT",
        metadata: JSON.stringify({
          achievementCode: badge.code,
          earnedAt: badge.earnedAt,
        }),
        title: "Achievement Unlocked!",
        body: `You earned "${badge.title}"`,
        created_at: now,
        updated_at: now,
      });
    }

    // Return newly unlocked badges
    return new Response(
      JSON.stringify({
        success: true,
        newBadges: newlyUnlocked,
        badgeCount: newlyUnlocked.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unlock badge error:", error);
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
