// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Calculate estimated 1RM using Brzycki formula
function calculate1RM(weightKg: number, reps: number): number {
  if (reps === 1) return weightKg;
  if (reps === 0) return 0;

  // Brzycki formula: 1RM = weight × (36 / (37 - reps))
  // Simplified version used in plan: 1RM = weightKg * (1 + reps / 30)
  return weightKg * (1 + reps / 30);
}

interface DetectPrRequest {
  workoutId: string;
}

interface WorkoutSet {
  id: string;
  exercise_id: string;
  weight_kg: number;
  reps: number;
  user_id: string;
}

interface ExercisePR {
  exerciseId: string;
  setId: string;
  newPR: number;
  previousPR: number;
  improvement: number;
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
    const { workoutId }: DetectPrRequest = await req.json();

    if (!workoutId) {
      return new Response(JSON.stringify({ error: "Missing workoutId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SECRET_KEY") ?? ""
    );

    // Get all sets from this workout
    const { data: workoutSets, error: setsError } = await supabaseAdmin
      .from("workout_sets")
      .select("id, exercise_id, weight_kg, reps")
      .eq("workout_id", workoutId)
      .eq("deleted_at", null);

    if (setsError) {
      console.error("Error fetching workout sets:", setsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch workout sets" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!workoutSets || workoutSets.length === 0) {
      return new Response(
        JSON.stringify({ success: true, prs: [], message: "No sets in workout" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const prs: ExercisePR[] = [];

    // Group sets by exercise
    const exerciseGroups = new Map<string, WorkoutSet[]>();
    for (const set of workoutSets as WorkoutSet[]) {
      if (!exerciseGroups.has(set.exercise_id)) {
        exerciseGroups.set(set.exercise_id, []);
      }
      exerciseGroups.get(set.exercise_id)!.push(set);
    }

    // Check each exercise for PRs
    for (const [exerciseId, sets] of exerciseGroups.entries()) {
      // Find best set from this workout
      let bestSet = sets[0];
      let best1RM = calculate1RM(sets[0].weight_kg, sets[0].reps);

      for (const set of sets) {
        const current1RM = calculate1RM(set.weight_kg, set.reps);
        if (current1RM > best1RM) {
          best1RM = current1RM;
          bestSet = set;
        }
      }

      // Get historical best for this exercise (excluding current workout)
      const { data: historicalSets, error: histError } = await supabaseAdmin
        .from("workout_sets")
        .select("weight_kg, reps")
        .eq("exercise_id", exerciseId)
        .eq("user_id", user.id)
        .neq("workout_id", workoutId)
        .eq("deleted_at", null)
        .order("weight_kg", { ascending: false })
        .limit(100); // Get top 100 to find best 1RM

      if (histError) {
        console.error("Error fetching historical sets:", histError);
        continue;
      }

      let historicalBest1RM = 0;
      if (historicalSets && historicalSets.length > 0) {
        for (const histSet of historicalSets) {
          const hist1RM = calculate1RM(histSet.weight_kg, histSet.reps);
          if (hist1RM > historicalBest1RM) {
            historicalBest1RM = hist1RM;
          }
        }
      }

      // Check if this is a new PR
      if (best1RM > historicalBest1RM) {
        // Mark this set as PR
        const { error: updateError } = await supabaseAdmin
          .from("workout_sets")
          .update({ is_pr: true })
          .eq("id", bestSet.id);

        if (updateError) {
          console.error("Error marking set as PR:", updateError);
        } else {
          prs.push({
            exerciseId,
            setId: bestSet.id,
            newPR: best1RM,
            previousPR: historicalBest1RM,
            improvement: best1RM - historicalBest1RM,
          });
        }
      }
    }

    // Return PR summary
    return new Response(
      JSON.stringify({
        success: true,
        prs,
        prCount: prs.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Detect PR error:", error);
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
