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
import { getResponseHeaders } from "../_shared/security.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rateLimit.ts";

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
  type: "WORKOUT" | "MONTHLY" | "RE_ENGAGEMENT";
  workout_id?: string; // Required if type === 'WORKOUT'
}

type ReEngagementCardType = "FRAUD_ALERT" | "RANSOM_NOTE" | "WANTED_POSTER" | "TOMBSTONE" | null;

interface MuscleGroupVolume {
  lastVolume: Date;
  daysSince: number;
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

interface MonthlyWorkout {
  id: string;
  started_at: string;
}

interface MonthlySet {
  rpe: number | null;
  exercises: {
    muscle_group: string | null;
  };
  weight_kg: number | null;
  reps: number | null;
}

type ArchetypeCode =
  | "THE_GHOST"
  | "VAMPIRE"
  | "BENCH_LORD"
  | "SCIENTIST"
  | "THE_MACHINE"
  | "CARDIO_CAPYBARA"
  | "DEFAULT";

interface ArchetypeCopy {
  title: string;
  copy: string;
}

// LOCKED ARCHETYPE COPY - DO NOT MODIFY WITHOUT PRODUCT APPROVAL
const ARCHETYPE_COPY: Record<ArchetypeCode, ArchetypeCopy> = {
  THE_GHOST: {
    title: "The Ghost",
    copy: "Boo. That's the sound of your gains disappearing.",
  },
  VAMPIRE: {
    title: "The Vampire",
    copy: "While the city sleeps, you grind. The night shift staff knows your order by heart.",
  },
  BENCH_LORD: {
    title: "The Bench Lord",
    copy: "Every day is chest day when you believe. International Chest Day is every day in your calendar.",
  },
  SCIENTIST: {
    title: "The Scientist",
    copy: "Data is the new protein. Your spreadsheet has more tabs than your browser.",
  },
  THE_MACHINE: {
    title: "The Machine",
    copy: "Same time. Same place. Same gains. Your gym doesn't have hours. It has YOUR hours.",
  },
  CARDIO_CAPYBARA: {
    title: "The Cardio Capybara",
    copy: "Slow and steady wins the... wait, what were we racing? Cardio killed the gains. But you look relaxed.",
  },
  DEFAULT: {
    title: "The Grinder",
    copy: "Showing up is half the battle. You showed up. The other half is suffering. You did that too.",
  },
};

// ============================================================================
// INPUT VALIDATION
// ============================================================================

const validateInput = (body: unknown): body is GenerateViralStatsRequest => {
  if (typeof body !== "object" || body === null) return false;

  const data = body as Record<string, unknown>;

  // Validate type field
  if (data.type !== "WORKOUT" && data.type !== "MONTHLY" && data.type !== "RE_ENGAGEMENT") return false;

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
// RE-ENGAGEMENT CALCULATION LOGIC (LOCKED - DO NOT MODIFY)
// ============================================================================

/**
 * Calculate Re-Engagement Card (LOCKED LOGIC)
 *
 * Priority order - first match wins:
 * 1. FRAUD_ALERT: Legs volume = 0 for >21 days
 * 2. RANSOM_NOTE: Last workout > 14 days ago
 * 3. WANTED_POSTER: Any muscle group volume = 0 for >21 days
 * 4. null: No re-engagement card needed
 *
 * Note: TOMBSTONE is triggered by workout completion (0 reps on >= 90% 1RM)
 * and is handled separately in the WORKOUT type.
 */
const calculateReEngagementCard = (
  lastWorkoutDate: Date | null,
  muscleGroupVolumes: Record<string, MuscleGroupVolume>
): {
  cardType: ReEngagementCardType;
  muscleGroup?: string;
  daysMissing: number;
} => {
  const now = new Date();

  // Calculate days since last workout
  const daysSinceWorkout = lastWorkoutDate
    ? Math.floor(
        (now.getTime() - lastWorkoutDate.getTime()) / (1000 * 60 * 60 * 24)
      )
    : 999;

  // 1. FRAUD_ALERT: Leg day skipper detection (highest priority)
  const legData = muscleGroupVolumes["Legs"];
  if (legData && legData.daysSince > 21) {
    return {
      cardType: "FRAUD_ALERT",
      muscleGroup: "Legs",
      daysMissing: legData.daysSince,
    };
  }

  // 2. RANSOM_NOTE: General inactivity
  if (daysSinceWorkout > 14) {
    return {
      cardType: "RANSOM_NOTE",
      daysMissing: daysSinceWorkout,
    };
  }

  // 3. WANTED_POSTER: Any neglected muscle group
  for (const [muscleGroup, data] of Object.entries(muscleGroupVolumes)) {
    if (data.daysSince > 21 && muscleGroup !== "Legs") {
      // Legs handled by FRAUD_ALERT
      return {
        cardType: "WANTED_POSTER",
        muscleGroup,
        daysMissing: data.daysSince,
      };
    }
  }

  // No re-engagement card needed
  return {
    cardType: null,
    daysMissing: daysSinceWorkout,
  };
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
 * Calculate Monthly Archetype (LOCKED FORMULA)
 * Priority order - first match wins:
 * 1. THE_GHOST: <3 workouts in rolling 30 days
 * 2. VAMPIRE: >50% of workouts started after 8:00 PM local time
 * 3. BENCH_LORD: >40% of monthly volume from Chest + Tricep exercises
 * 4. SCIENTIST: RPE logged on >90% of all sets
 * 5. THE_MACHINE: 0 missed weeks in rolling 30 days
 * 6. CARDIO_CAPYBARA: Avg RPE < 5 OR 100% cardio exercises
 * 7. DEFAULT: None of above
 */
const calculateArchetype = (
  workouts: MonthlyWorkout[],
  sets: MonthlySet[]
): ArchetypeCode => {
  const totalWorkouts = workouts.length;

  // 1. Ghost check first (low activity)
  if (totalWorkouts < 3) {
    return "THE_GHOST";
  }

  // 2. Vampire check - >50% night workouts (8 PM to 4 AM)
  const nightWorkouts = workouts.filter((w) => {
    const hour = new Date(w.started_at).getHours();
    return hour >= 20 || hour < 4;
  });
  if (nightWorkouts.length / totalWorkouts > 0.5) {
    return "VAMPIRE";
  }

  // 3. Bench Lord check - >40% chest/tricep volume
  const chestTricepMuscles = ["chest", "triceps", "tricep"];
  const chestTricepVolume = sets
    .filter((s) =>
      chestTricepMuscles.includes(
        s.exercises?.muscle_group?.toLowerCase() ?? ""
      )
    )
    .reduce((sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0), 0);
  const totalVolume = sets.reduce(
    (sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0),
    0
  );
  if (totalVolume > 0 && chestTricepVolume / totalVolume > 0.4) {
    return "BENCH_LORD";
  }

  // 4. Scientist check - >90% sets have RPE
  const setsWithRpe = sets.filter((s) => s.rpe !== null).length;
  if (sets.length > 0 && setsWithRpe / sets.length > 0.9) {
    return "SCIENTIST";
  }

  // 5. Machine check (no missed weeks in 30 days = 4 weeks)
  const weeksWithWorkouts = new Set(
    workouts.map((w) => {
      const date = new Date(w.started_at);
      // Get ISO week number
      const d = new Date(
        Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
      );
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil(
        ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
      );
      return `${d.getUTCFullYear()}-W${weekNo}`;
    })
  );
  // Expect at least 4 unique weeks if no missed weeks
  if (weeksWithWorkouts.size >= 4) {
    return "THE_MACHINE";
  }

  // 6. Cardio Capybara check - avg RPE < 5 or all cardio
  const avgRpe =
    setsWithRpe > 0
      ? sets.filter((s) => s.rpe !== null).reduce((sum, s) => sum + (s.rpe ?? 0), 0) /
        setsWithRpe
      : 7;
  const allCardio = sets.every(
    (s) => s.exercises?.muscle_group?.toLowerCase() === "cardio"
  );
  if (avgRpe < 5 || allCardio) {
    return "CARDIO_CAPYBARA";
  }

  // 7. Default
  return "DEFAULT";
};

/**
 * Get the most common muscle group from sets
 */
const getTopMuscleGroup = (sets: MonthlySet[]): string => {
  const counts: Record<string, number> = {};
  for (const set of sets) {
    const mg = set.exercises?.muscle_group ?? "Unknown";
    counts[mg] = (counts[mg] ?? 0) + 1;
  }
  let topMuscle = "Full Body";
  let topCount = 0;
  for (const [muscle, count] of Object.entries(counts)) {
    if (count > topCount) {
      topMuscle = muscle;
      topCount = count;
    }
  }
  return topMuscle;
};

/**
 * Get favorite workout time
 */
const getFavoriteTime = (workouts: MonthlyWorkout[]): string => {
  if (workouts.length === 0) return "N/A";

  const hourCounts: Record<number, number> = {};
  for (const w of workouts) {
    const hour = new Date(w.started_at).getHours();
    hourCounts[hour] = (hourCounts[hour] ?? 0) + 1;
  }

  let topHour = 12;
  let topCount = 0;
  for (const [hour, count] of Object.entries(hourCounts)) {
    if (count > topCount) {
      topHour = parseInt(hour, 10);
      topCount = count;
    }
  }

  const amPm = topHour >= 12 ? "PM" : "AM";
  const displayHour = topHour % 12 || 12;
  return `${displayHour}:00 ${amPm}`;
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
    return new Response("ok", { headers: getResponseHeaders(corsHeaders) });
  }

  try {
    // 1. Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_REQUIRED" }),
        {
          status: 401,
          headers: getResponseHeaders(corsHeaders),
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
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // SECURITY: Rate limiting to prevent expensive calculation spam
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SECRET_KEY") ?? ""
    );

    const rateLimit = await checkRateLimit(
      user.id,
      'generate-viral-stats',
      RATE_LIMITS['generate-viral-stats'].maxRequests,
      RATE_LIMITS['generate-viral-stats'].windowMs,
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
            "X-RateLimit-Limit": RATE_LIMITS['generate-viral-stats'].maxRequests.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.resetAt.toString(),
          },
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
          details: "type must be WORKOUT, MONTHLY, or RE_ENGAGEMENT. workout_id required for WORKOUT",
        }),
        {
          status: 400,
          headers: getResponseHeaders(corsHeaders),
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
            headers: getResponseHeaders(corsHeaders),
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
            headers: getResponseHeaders(corsHeaders),
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
            headers: getResponseHeaders(corsHeaders),
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
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // 5. Handle MONTHLY type request
    if (body.type === "MONTHLY") {
      // Calculate date 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Fetch workouts for the past 30 days
      const { data: workouts, error: workoutsError } = await supabaseAdmin
        .from("workouts")
        .select("id, started_at")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .gte("started_at", thirtyDaysAgo.toISOString())
        .order("started_at", { ascending: false });

      if (workoutsError) {
        console.error("Error fetching monthly workouts:", workoutsError);
        return new Response(
          JSON.stringify({
            error: "Failed to fetch workout data",
            code: "INTERNAL_ERROR",
          }),
          {
            status: 500,
            headers: getResponseHeaders(corsHeaders),
          }
        );
      }

      const typedWorkouts = (workouts || []) as MonthlyWorkout[];
      const workoutIds = typedWorkouts.map((w) => w.id);

      // Fetch all sets for these workouts
      let typedSets: MonthlySet[] = [];
      if (workoutIds.length > 0) {
        const { data: sets, error: setsError } = await supabaseAdmin
          .from("workout_sets")
          .select(
            `
            rpe,
            weight_kg,
            reps,
            exercises!inner (
              muscle_group
            )
          `
          )
          .in("workout_id", workoutIds)
          .is("deleted_at", null);

        if (setsError) {
          console.error("Error fetching monthly sets:", setsError);
          return new Response(
            JSON.stringify({
              error: "Failed to fetch workout data",
              code: "INTERNAL_ERROR",
            }),
            {
              status: 500,
              headers: getResponseHeaders(corsHeaders),
            }
          );
        }

        typedSets = (sets || []) as unknown as MonthlySet[];
      }

      // Calculate archetype
      const archetypeCode = calculateArchetype(typedWorkouts, typedSets);
      const archetypeCopy = ARCHETYPE_COPY[archetypeCode];

      // Count night workouts for stats
      const nightWorkouts = typedWorkouts.filter((w) => {
        const hour = new Date(w.started_at).getHours();
        return hour >= 20 || hour < 4;
      });

      // Get current month name
      const monthName = new Date().toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      return new Response(
        JSON.stringify({
          type: "MONTHLY",
          archetype: {
            archetype: archetypeCode,
            title: archetypeCopy.title,
            copy: archetypeCopy.copy,
            stats: {
              totalWorkouts: typedWorkouts.length,
              nightWorkouts: nightWorkouts.length,
              favoriteTime: getFavoriteTime(typedWorkouts),
              topMuscleGroup: getTopMuscleGroup(typedSets),
              month: monthName,
            },
          },
        }),
        {
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // 6. Handle RE_ENGAGEMENT type request
    if (body.type === "RE_ENGAGEMENT") {
      // Get user's last workout
      const { data: lastWorkout, error: lastWorkoutError } = await supabaseAdmin
        .from("workouts")
        .select("started_at")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      const lastWorkoutDate = lastWorkout?.started_at
        ? new Date(lastWorkout.started_at)
        : null;

      // Get muscle group volumes for the past 60 days
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      // Get all sets with muscle groups from last 60 days
      const { data: recentSets, error: setsError } = await supabaseAdmin
        .from("workout_sets")
        .select(
          `
          workout_id,
          weight_kg,
          reps,
          exercises!inner (
            muscle_group
          ),
          workouts!inner (
            user_id,
            started_at
          )
        `
        )
        .eq("workouts.user_id", user.id)
        .is("deleted_at", null)
        .gte("workouts.started_at", sixtyDaysAgo.toISOString());

      if (setsError) {
        console.error("Error fetching recent sets:", setsError);
      }

      // Calculate last volume date for each muscle group
      const muscleGroupVolumes: Record<string, MuscleGroupVolume> = {};
      const allMuscleGroups = [
        "Chest",
        "Back",
        "Shoulders",
        "Arms",
        "Legs",
        "Core",
      ];
      const now = new Date();

      // Initialize all muscle groups with 60+ days ago
      for (const mg of allMuscleGroups) {
        muscleGroupVolumes[mg] = {
          lastVolume: sixtyDaysAgo,
          daysSince: 60,
        };
      }

      // Update with actual data
      if (recentSets) {
        for (const set of recentSets) {
          const typedSet = set as {
            exercises: { muscle_group: string | null };
            workouts: { started_at: string };
            weight_kg: number | null;
            reps: number | null;
          };
          const muscleGroup = typedSet.exercises?.muscle_group;
          const workoutDate = new Date(typedSet.workouts.started_at);
          const volume = (typedSet.weight_kg ?? 0) * (typedSet.reps ?? 0);

          if (muscleGroup && volume > 0) {
            const existing = muscleGroupVolumes[muscleGroup];
            if (!existing || workoutDate > existing.lastVolume) {
              muscleGroupVolumes[muscleGroup] = {
                lastVolume: workoutDate,
                daysSince: Math.floor(
                  (now.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24)
                ),
              };
            }
          }
        }
      }

      // Calculate which re-engagement card to show
      const reEngagementResult = calculateReEngagementCard(
        lastWorkoutDate,
        muscleGroupVolumes
      );

      return new Response(
        JSON.stringify({
          type: "RE_ENGAGEMENT",
          card_type: reEngagementResult.cardType,
          muscle_group: reEngagementResult.muscleGroup ?? null,
          days_missing: reEngagementResult.daysMissing,
          last_workout_date: lastWorkoutDate?.toISOString() ?? null,
        }),
        {
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // Should not reach here due to validation
    return new Response(
      JSON.stringify({ error: "Invalid request", code: "INVALID_INPUT" }),
      {
        status: 400,
        headers: getResponseHeaders(corsHeaders),
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
        headers: getResponseHeaders(corsHeaders),
      }
    );
  }
});
