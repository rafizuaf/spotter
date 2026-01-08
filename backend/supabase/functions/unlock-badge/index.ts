// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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

    const newlyUnlocked: UnlockedBadge[] = [];

    // Check each achievement
    for (const achievement of achievements as Achievement[]) {
      // Skip if already earned
      if (existingBadgeCodes.has(achievement.code)) {
        continue;
      }

      // Evaluate achievement condition based on code
      let conditionMet = false;

      // First workout badge
      if (achievement.code === "FIRST_WORKOUT") {
        const { count } = await supabaseAdmin
          .from("workouts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("deleted_at", null);

        conditionMet = (count ?? 0) >= 1;
      }

      // Workout count badges (10, 50, 100, 500, 1000)
      else if (achievement.code.startsWith("WORKOUT_")) {
        const threshold = achievement.threshold_value ?? 0;
        const { count } = await supabaseAdmin
          .from("workouts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("deleted_at", null);

        conditionMet = (count ?? 0) >= threshold;
      }

      // First PR badge
      else if (achievement.code === "FIRST_PR") {
        const { count } = await supabaseAdmin
          .from("workout_sets")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("is_pr", true)
          .eq("deleted_at", null);

        conditionMet = (count ?? 0) >= 1;
      }

      // PR count badges
      else if (achievement.code.startsWith("PR_COUNT_")) {
        const threshold = achievement.threshold_value ?? 0;
        const { count } = await supabaseAdmin
          .from("workout_sets")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("is_pr", true)
          .eq("deleted_at", null);

        conditionMet = (count ?? 0) >= threshold;
      }

      // Level badges
      else if (achievement.code.startsWith("LEVEL_")) {
        const threshold = achievement.threshold_value ?? 0;
        const { data: userLevel } = await supabaseAdmin
          .from("user_levels")
          .select("level")
          .eq("user_id", userId)
          .single();

        conditionMet = (userLevel?.level ?? 0) >= threshold;
      }

      // Muscle group specific badges (e.g., "CHEST_CHAMPION")
      else if (achievement.relevant_muscle_group) {
        // Check if user has X workouts with this muscle group
        const threshold = achievement.threshold_value ?? 10;

        const { data: muscleGroupSets } = await supabaseAdmin
          .from("workout_sets")
          .select("exercise_id, exercises!inner(muscle_group)")
          .eq("user_id", userId)
          .eq("exercises.muscle_group", achievement.relevant_muscle_group)
          .eq("deleted_at", null);

        conditionMet = (muscleGroupSets?.length ?? 0) >= threshold;
      }

      // If condition met, create badge
      if (conditionMet) {
        const now = new Date().toISOString();

        const { error: insertError } = await supabaseAdmin
          .from("user_badges")
          .insert({
            user_id: userId,
            achievement_code: achievement.code,
            earned_at: now,
            is_rusty: false,
            last_maintained_at: now,
          });

        if (insertError) {
          console.error("Error creating badge:", insertError);
        } else {
          newlyUnlocked.push({
            code: achievement.code,
            title: achievement.title,
            description: achievement.description,
            earnedAt: now,
          });
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
