/**
 * generate-viral-stats Edge Function
 *
 * Calculates workout statistics for viral sharing cards.
 * All calculation logic is LOCKED - do not modify formulas without Product approval.
 *
 * Request Types:
 * - WORKOUT: Calculate stats for a specific workout (NutritionLabel, Receipt, Tombstone)
 * - MONTHLY: Calculate archetype for monthly stats (Archetype card)
 *
 * @see CLAUDE.md → "Edge Function Request/Response Reference" for LOCKED formulas
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";

// SECURITY: Restrict CORS to specific origins (not "*")
const getAllowedOrigin = (): string => {
  const allowedOrigin =
    Deno.env.get("FRONTEND_URL") || "https://spotter-app.com";
  return allowedOrigin;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": getAllowedOrigin(),
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface GenerateViralStatsRequest {
  type: "WORKOUT" | "MONTHLY";
  workout_id?: string; // Required if type === 'WORKOUT'
}

interface WorkoutSet {
  id: string;
  exercise_id: string;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  is_failure: boolean | null;
  is_pr: boolean | null;
  skipped: boolean | null;
  exercises: {
    muscle_group: string | null;
  };
}

interface Workout {
  id: string;
  user_id: string;
  name: string | null;
  started_at: string;
  ended_at: string | null;
}

interface NutritionLabelStats {
  total_volume_kg: number;
  sets_completed: number;
  duration_minutes: number;
  exercises_count: number;
  muscle_groups: string[];
  prs_hit: number;
  xp_earned: number;
  pain_percent: number;
  sweat_liters: number;
  regret_percent: number;
}

// ============================================================================
// INPUT VALIDATION
// ============================================================================

const validateInput = (body: unknown): body is GenerateViralStatsRequest => {
  if (typeof body !== "object" || body === null) return false;

  const data = body as Record<string, unknown>;

  // Validate type field
  if (data.type !== "WORKOUT" && data.type !== "MONTHLY") return false;

  // Validate workout_id if type is WORKOUT
  if (data.type === "WORKOUT") {
    if (typeof data.workout_id !== "string") return false;

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(data.workout_id)) return false;
  }

  return true;
};

// ============================================================================
// LOCKED CALCULATION LOGIC - DO NOT MODIFY WITHOUT PRODUCT APPROVAL
// ============================================================================

/**
 * Calculate Pain % (LOCKED FORMULA)
 * Formula: min(100, (avgRPE / 10) * 100 + (failureSets * 5))
 */
const calculatePainPercent = (
  sets: WorkoutSet[],
  avgRpe: number,
  failureSetsCount: number
): number => {
  return Math.min(
    100,
    Math.round((avgRpe / 10) * 100 + failureSetsCount * 5)
  );
};

/**
 * Calculate Sweat (L) (LOCKED FORMULA)
 * Formula: (durationMins * avgIntensity) / 60
 * Where avgIntensity = avgRPE / 10
 */
const calculateSweatLiters = (
  durationMinutes: number,
  avgRpe: number
): number => {
  const avgIntensity = avgRpe / 10;
  return Math.round(((durationMinutes * avgIntensity) / 60) * 10) / 10;
};

/**
 * Calculate Regret % (LOCKED FORMULA)
 * Formula: 100% if (muscleGroup = 'Legs' AND skippedSets > 0), else 0%
 */
const calculateRegretPercent = (sets: WorkoutSet[]): number => {
  const legSets = sets.filter(
    (s) => s.exercises?.muscle_group?.toLowerCase() === "legs"
  );
  const skippedLegSets = legSets.filter((s) => s.skipped === true);

  return legSets.length > 0 && skippedLegSets.length > 0 ? 100 : 0;
};

/**
 * Calculate workout stats for NutritionLabel
 */
const calculateWorkoutStats = (
  workout: Workout,
  sets: WorkoutSet[]
): NutritionLabelStats => {
  // Filter out skipped sets for most calculations
  const completedSets = sets.filter((s) => s.skipped !== true);

  // Calculate total volume (weight × reps for all completed sets)
  const totalVolumeKg = completedSets.reduce((sum, s) => {
    const weight = s.weight_kg ?? 0;
    const reps = s.reps ?? 0;
    return sum + weight * reps;
  }, 0);

  // Count sets
  const setsCompleted = completedSets.length;

  // Calculate duration
  const startedAt = new Date(workout.started_at);
  const endedAt = workout.ended_at ? new Date(workout.ended_at) : new Date();
  const durationMinutes = Math.round(
    (endedAt.getTime() - startedAt.getTime()) / 60000
  );

  // Count unique exercises
  const uniqueExercises = new Set(completedSets.map((s) => s.exercise_id));
  const exercisesCount = uniqueExercises.size;

  // Get unique muscle groups
  const muscleGroups = [
    ...new Set(
      completedSets
        .map((s) => s.exercises?.muscle_group)
        .filter((mg): mg is string => mg !== null && mg !== undefined)
    ),
  ];

  // Count PRs hit
  const prsHit = completedSets.filter((s) => s.is_pr === true).length;

  // Calculate average RPE (default to 7 if no RPE logged)
  const setsWithRpe = completedSets.filter((s) => s.rpe !== null);
  const avgRpe =
    setsWithRpe.length > 0
      ? setsWithRpe.reduce((sum, s) => sum + (s.rpe ?? 0), 0) /
        setsWithRpe.length
      : 7;

  // Count failure sets
  const failureSetsCount = completedSets.filter(
    (s) => s.is_failure === true
  ).length;

  // Calculate LOCKED metrics
  const painPercent = calculatePainPercent(
    completedSets,
    avgRpe,
    failureSetsCount
  );
  const sweatLiters = calculateSweatLiters(durationMinutes, avgRpe);
  const regretPercent = calculateRegretPercent(sets); // Use all sets for regret check

  // Estimate XP earned (10 XP per set base)
  const xpEarned = setsCompleted * 10;

  return {
    total_volume_kg: Math.round(totalVolumeKg),
    sets_completed: setsCompleted,
    duration_minutes: durationMinutes,
    exercises_count: exercisesCount,
    muscle_groups: muscleGroups,
    prs_hit: prsHit,
    xp_earned: xpEarned,
    pain_percent: painPercent,
    sweat_liters: sweatLiters,
    regret_percent: regretPercent,
  };
};

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_REQUIRED" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
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
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Parse and validate request
    const body = await req.json();

    if (!validateInput(body)) {
      return new Response(
        JSON.stringify({
          error: "Invalid input",
          code: "INVALID_INPUT",
          details: "type must be WORKOUT or MONTHLY, workout_id required for WORKOUT",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Use admin client for database queries
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 4. Handle WORKOUT type request
    if (body.type === "WORKOUT") {
      const workoutId = body.workout_id!;

      // Fetch workout
      const { data: workout, error: workoutError } = await supabaseAdmin
        .from("workouts")
        .select("id, user_id, name, started_at, ended_at")
        .eq("id", workoutId)
        .is("deleted_at", null)
        .single();

      if (workoutError || !workout) {
        return new Response(
          JSON.stringify({
            error: "Workout not found",
            code: "NOT_FOUND",
            resource: "workout",
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // SECURITY: Verify user owns this workout
      if (workout.user_id !== user.id) {
        return new Response(
          JSON.stringify({
            error: "You don't have permission to access this workout",
            code: "FORBIDDEN",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Fetch workout sets with exercise muscle group
      const { data: sets, error: setsError } = await supabaseAdmin
        .from("workout_sets")
        .select(
          `
          id,
          exercise_id,
          weight_kg,
          reps,
          rpe,
          is_failure,
          is_pr,
          skipped,
          exercises!inner (
            muscle_group
          )
        `
        )
        .eq("workout_id", workoutId)
        .is("deleted_at", null);

      if (setsError) {
        console.error("Error fetching sets:", setsError);
        return new Response(
          JSON.stringify({
            error: "Failed to fetch workout data",
            code: "INTERNAL_ERROR",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Calculate stats
      const typedWorkout = workout as Workout;
      const typedSets = (sets || []) as unknown as WorkoutSet[];
      const nutritionLabelStats = calculateWorkoutStats(typedWorkout, typedSets);

      // Return response
      return new Response(
        JSON.stringify({
          type: "WORKOUT",
          workout_id: workoutId,
          workout_name: typedWorkout.name || "Workout",
          workout_date: typedWorkout.started_at,
          nutrition_label: nutritionLabelStats,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 5. Handle MONTHLY type request (placeholder for now)
    if (body.type === "MONTHLY") {
      // TODO: Implement monthly archetype calculation
      // This requires querying workouts for the past 30 days
      // and determining the archetype based on LOCKED priority logic
      return new Response(
        JSON.stringify({
          error: "Monthly archetype not yet implemented",
          code: "NOT_IMPLEMENTED",
        }),
        {
          status: 501,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Should not reach here due to validation
    return new Response(
      JSON.stringify({ error: "Invalid request", code: "INVALID_INPUT" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("generate-viral-stats error:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        code: "INTERNAL_ERROR",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
