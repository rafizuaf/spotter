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

// Streak thresholds
const STREAK_THRESHOLDS = {
  WEEKLY_3: 3, // 3+ workouts per week
  WEEKLY_4: 4, // 4+ workouts per week
  WEEKLY_5: 5, // 5+ workouts per week
  WEEKLY_ANY: 1, // At least 1 workout per week
};

interface TrackActivityRequest {
  userId: string;
  workoutId: string;
  timezone?: string; // User's timezone, e.g., "America/New_York"
}

interface ActivityWeek {
  id: string;
  user_id: string;
  week_start: string;
  active_days: number;
  workouts_completed: number;
  total_sets: number;
  total_volume_kg: number;
}

interface StreakLog {
  id: string;
  user_id: string;
  streak_type: string;
  streak_length: number;
  week_ended: string;
  is_active: boolean;
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId, workoutId, timezone = "UTC" }: TrackActivityRequest =
      await req.json();

    if (!userId || !workoutId) {
      return new Response(
        JSON.stringify({ error: "Missing userId or workoutId" }),
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

    // Get workout details
    const { data: workout, error: workoutError } = await supabaseAdmin
      .from("workouts")
      .select("id, user_id, started_at, ended_at, local_timezone")
      .eq("id", workoutId)
      .single();

    if (workoutError || !workout) {
      return new Response(
        JSON.stringify({ error: "Workout not found", code: "NOT_FOUND" }),
        {
          status: 404,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // SECURITY: Verify workout belongs to authenticated user
    if (workout.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Forbidden", code: "FORBIDDEN" }),
        {
          status: 403,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // Use workout's timezone or fallback to provided/UTC
    const userTimezone = workout.local_timezone || timezone;

    // Get the week start (Monday) for this workout using timezone-aware calculation
    const workoutDate = new Date(workout.started_at);
    const weekStart = getWeekStart(workoutDate, userTimezone);

    // Get workout stats (sets and volume)
    const { data: sets } = await supabaseAdmin
      .from("workout_sets")
      .select("id, weight_kg, reps")
      .eq("workout_id", workoutId)
      .is("deleted_at", null);

    const totalSets = sets?.length || 0;
    const totalVolume =
      sets?.reduce((sum, s) => sum + (s.weight_kg || 0) * (s.reps || 0), 0) ||
      0;

    // Update or create activity week record
    const { data: existingWeek } = await supabaseAdmin
      .from("user_activity_weeks")
      .select("*")
      .eq("user_id", userId)
      .eq("week_start", weekStart)
      .single();

    let activityWeek: ActivityWeek;

    if (existingWeek) {
      // Update existing week
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("user_activity_weeks")
        .update({
          workouts_completed: existingWeek.workouts_completed + 1,
          total_sets: existingWeek.total_sets + totalSets,
          total_volume_kg: existingWeek.total_volume_kg + totalVolume,
          // Increment active_days only if this is a new day
          active_days: await calculateActiveDays(
            supabaseAdmin,
            userId,
            weekStart
          ),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingWeek.id)
        .select()
        .single();

      if (updateError) throw updateError;
      activityWeek = updated as ActivityWeek;
    } else {
      // Create new week record
      const { data: created, error: createError } = await supabaseAdmin
        .from("user_activity_weeks")
        .insert({
          user_id: userId,
          week_start: weekStart,
          active_days: 1,
          workouts_completed: 1,
          total_sets: totalSets,
          total_volume_kg: totalVolume,
        })
        .select()
        .single();

      if (createError) throw createError;
      activityWeek = created as ActivityWeek;
    }

    // Check and update streaks
    const streakUpdates = await updateStreaks(
      supabaseAdmin,
      userId,
      weekStart,
      activityWeek.workouts_completed
    );

    // Check for perfect week badge
    const perfectWeekBadges = checkPerfectWeekBadges(
      activityWeek.workouts_completed
    );

    // C2: Restore rusty badges if workout meets criteria
    const restoredBadges = await restoreRustyBadges(
      supabaseAdmin,
      userId,
      workoutId,
      weekStart
    );

    return new Response(
      JSON.stringify({
        success: true,
        activityWeek: {
          weekStart,
          activeDays: activityWeek.active_days,
          workoutsCompleted: activityWeek.workouts_completed,
          totalSets: activityWeek.total_sets,
          totalVolumeKg: activityWeek.total_volume_kg,
        },
        streaks: streakUpdates,
        perfectWeekBadges,
        restoredBadges,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Track weekly activity error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Get the Monday of the week containing the given date
 * Uses timezone-aware calculation to determine the correct week boundary
 *
 * @param date - The date to find the week start for
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 */
function getWeekStart(date: Date, timezone: string = "UTC"): string {
  // Convert to the user's local date string to get the correct day
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };

  const localDateStr = date.toLocaleDateString("en-US", options);
  const dayOfWeek = date.toLocaleDateString("en-US", {
    timeZone: timezone,
    weekday: "short",
  });

  // Map day names to offsets from Monday
  const dayOffsets: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };

  const offset = dayOffsets[dayOfWeek] || 0;

  // Create a new date and subtract the offset to get Monday
  const mondayDate = new Date(date);
  mondayDate.setDate(mondayDate.getDate() - offset);

  // Format as YYYY-MM-DD in the user's timezone
  const year = mondayDate.toLocaleDateString("en-CA", {
    timeZone: timezone,
    year: "numeric",
  });
  const month = mondayDate.toLocaleDateString("en-CA", {
    timeZone: timezone,
    month: "2-digit",
  });
  const day = mondayDate.toLocaleDateString("en-CA", {
    timeZone: timezone,
    day: "2-digit",
  });

  return `${year}-${month}-${day}`;
}

/**
 * Calculate unique active days in a week
 */
async function calculateActiveDays(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  weekStart: string
): Promise<number> {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const { data: workouts } = await supabase
    .from("workouts")
    .select("started_at")
    .eq("user_id", userId)
    .gte("started_at", weekStart)
    .lt("started_at", weekEnd.toISOString())
    .is("deleted_at", null);

  if (!workouts || workouts.length === 0) return 0;

  // Count unique days
  const uniqueDays = new Set(
    workouts.map((w: { started_at: string }) => w.started_at.split("T")[0])
  );

  return uniqueDays.size;
}

/**
 * Update streak logs based on weekly activity
 */
async function updateStreaks(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  currentWeekStart: string,
  workoutsThisWeek: number
): Promise<Record<string, number>> {
  const streakUpdates: Record<string, number> = {};

  for (const [streakType, threshold] of Object.entries(STREAK_THRESHOLDS)) {
    const qualifies = workoutsThisWeek >= threshold;

    // Get current active streak
    const { data: activeStreak } = await supabase
      .from("user_streak_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("streak_type", streakType)
      .eq("is_active", true)
      .single();

    if (qualifies) {
      // User qualifies for this streak type this week
      if (activeStreak) {
        // Check if this is a continuation (consecutive week)
        const lastWeek = new Date(activeStreak.week_ended);
        const currentWeek = new Date(currentWeekStart);
        const daysDiff = Math.round(
          (currentWeek.getTime() - lastWeek.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff === 7) {
          // Consecutive week - extend streak
          const { data: updated } = await supabase
            .from("user_streak_logs")
            .update({
              streak_length: activeStreak.streak_length + 1,
              week_ended: currentWeekStart,
              updated_at: new Date().toISOString(),
            })
            .eq("id", activeStreak.id)
            .select()
            .single();

          streakUpdates[streakType] = (updated as StreakLog)?.streak_length || 0;
        } else if (daysDiff === 0) {
          // Same week, just updating
          streakUpdates[streakType] = activeStreak.streak_length;
        } else {
          // Gap in weeks - break old streak, start new
          await supabase
            .from("user_streak_logs")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("id", activeStreak.id);

          const { data: newStreak } = await supabase
            .from("user_streak_logs")
            .insert({
              user_id: userId,
              streak_type: streakType,
              streak_length: 1,
              week_ended: currentWeekStart,
              is_active: true,
            })
            .select()
            .single();

          streakUpdates[streakType] = (newStreak as StreakLog)?.streak_length || 1;
        }
      } else {
        // No active streak - start new one
        const { data: newStreak } = await supabase
          .from("user_streak_logs")
          .insert({
            user_id: userId,
            streak_type: streakType,
            streak_length: 1,
            week_ended: currentWeekStart,
            is_active: true,
          })
          .select()
          .single();

        streakUpdates[streakType] = (newStreak as StreakLog)?.streak_length || 1;
      }
    }
  }

  return streakUpdates;
}

/**
 * C2: Restore rusty badges if workout meets criteria
 * 
 * Restores badges that became rusty if the user completes a workout
 * that meets the badge's criteria (e.g., weekly consistency badges
 * are restored by any workout in the current week).
 */
async function restoreRustyBadges(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  workoutId: string,
  weekStart: string
): Promise<string[]> {
  // Get all rusty badges for this user
  const { data: rustyBadges, error: badgesError } = await supabase
    .from("user_badges")
    .select("achievement_code")
    .eq("user_id", userId)
    .eq("is_rusty", true)
    .is("deleted_at", null);

  if (badgesError || !rustyBadges || rustyBadges.length === 0) {
    return [];
  }

  const restored: string[] = [];
  const now = new Date().toISOString();

  // Get workout details for badge criteria checks
  const { data: workoutSets } = await supabase
    .from("workout_sets")
    .select(`
      id,
      is_pr,
      exercises!inner(muscle_group)
    `)
    .eq("workout_id", workoutId)
    .is("deleted_at", null);

  const hasPR = workoutSets?.some((s: { is_pr: boolean }) => s.is_pr) || false;
  const muscleGroups = new Set(
    workoutSets?.map((s: { exercises: { muscle_group: string } }) => s.exercises.muscle_group) || []
  );

  // Get current week's workout count for weekly badges
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const { count: weekWorkoutCount } = await supabase
    .from("workouts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("started_at", weekStart)
    .lt("started_at", weekEnd.toISOString())
    .is("deleted_at", null);

  for (const badge of rustyBadges) {
    const code = badge.achievement_code;
    let shouldRestore = false;

    // Weekly consistency badges: Any workout in the current week restores it
    if (
      code.startsWith("WEEKLY_") ||
      code === "CONSISTENCY_26" ||
      code === "CONSISTENCY_52"
    ) {
      // Any workout this week restores weekly badges
      shouldRestore = (weekWorkoutCount || 0) >= 1;
    }
    // Workout count badges: Any workout restores it
    else if (
      code === "FIRST_WORKOUT" ||
      code.startsWith("WORKOUT_")
    ) {
      shouldRestore = true; // Any workout restores cumulative badges
    }
    // PR badges: Restore if workout has a PR
    else if (code.startsWith("PR_") || code === "PR_FIRST") {
      shouldRestore = hasPR;
    }
    // Muscle group badges: Restore if workout trains that muscle group
    else if (
      code.includes("CHEST") ||
      code.includes("BACK") ||
      code.includes("LEG") ||
      code.includes("SHOULDER") ||
      code.includes("ARM") ||
      code.includes("CORE")
    ) {
      // Check if workout trains the relevant muscle group
      const muscleGroupMap: Record<string, string[]> = {
        CHEST: ["Chest"],
        BACK: ["Back"],
        LEG: ["Legs"],
        SHOULDER: ["Shoulders"],
        ARM: ["Biceps", "Triceps"],
        CORE: ["Core"],
      };

      for (const [key, groups] of Object.entries(muscleGroupMap)) {
        if (code.includes(key)) {
          shouldRestore = groups.some((mg) => muscleGroups.has(mg));
          break;
        }
      }
    }
    // Ranking badges: Skip (maintained by check-ranking-badges)
    else if (code.startsWith("TOP_")) {
      continue;
    }
    // Cumulative badges (volume, level): Any workout restores
    else if (
      code.startsWith("VOLUME_") ||
      code.startsWith("LEVEL_")
    ) {
      shouldRestore = true;
    }

    if (shouldRestore) {
      // Restore the badge
      await supabase
        .from("user_badges")
        .update({
          is_rusty: false,
          last_maintained_at: now,
          updated_at: now,
        })
        .eq("user_id", userId)
        .eq("achievement_code", code);

      restored.push(code);
    }
  }

  return restored;
}

/**
 * Check if user qualifies for perfect week badges
 */
function checkPerfectWeekBadges(workoutsCompleted: number): string[] {
  const badges: string[] = [];

  if (workoutsCompleted >= 5) {
    badges.push("PERFECT_WEEK_5");
  }
  if (workoutsCompleted >= 6) {
    badges.push("PERFECT_WEEK_6");
  }

  return badges;
}
