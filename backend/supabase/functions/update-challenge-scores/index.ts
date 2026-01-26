// Edge Function: update-challenge-scores
// Phase 2G: Social & Competition - Challenge System
// Description: Update challenge scores after workout completion

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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface UpdateChallengeScoresRequest {
  workout_id: string;
}

interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  current_score: number;
  challenge: {
    id: string;
    challenge_type: string;
    target_value: number | null;
    status: string;
  };
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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_REQUIRED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { workout_id }: UpdateChallengeScoresRequest = await req.json();

    if (!workout_id || !UUID_REGEX.test(workout_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid workout_id", code: "INVALID_INPUT", field: "workout_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get workout details
    const { data: workout, error: workoutError } = await supabaseClient
      .from("workouts")
      .select("id, user_id, name, started_at")
      .eq("id", workout_id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();

    if (workoutError || !workout) {
      return new Response(
        JSON.stringify({ error: "Workout not found", code: "NOT_FOUND", resource: "workout" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get workout sets for volume calculation
    const { data: sets } = await supabaseClient
      .from("workout_sets")
      .select("weight_kg, reps")
      .eq("workout_id", workout_id)
      .is("deleted_at", null);

    const totalVolume = sets?.reduce((acc, set) => acc + (set.weight_kg * set.reps), 0) || 0;
    const totalSets = sets?.length || 0;

    // Get user's active challenge participations
    const { data: participations, error: participationsError } = await supabaseAdmin
      .from("challenge_participants")
      .select(`
        id,
        challenge_id,
        current_score,
        challenge:challenges!inner(
          id,
          challenge_type,
          target_value,
          status,
          start_date,
          end_date
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "ACTIVE")
      .is("deleted_at", null);

    if (participationsError) {
      console.error("Error fetching participations:", participationsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch challenge participations", code: "INTERNAL_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!participations || participations.length === 0) {
      return new Response(
        JSON.stringify({ success: true, challenges_updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const updatedChallenges: string[] = [];
    const workoutDate = new Date(workout.started_at);

    for (const participation of participations) {
      const challenge = Array.isArray(participation.challenge)
        ? participation.challenge[0]
        : participation.challenge;

      if (!challenge || challenge.status !== "ACTIVE") continue;

      // Check if workout falls within challenge period
      const challengeStart = new Date(challenge.start_date);
      const challengeEnd = new Date(challenge.end_date);

      if (workoutDate < challengeStart || workoutDate > challengeEnd) {
        continue;
      }

      // Calculate points based on challenge type
      let pointsEarned = 0;
      switch (challenge.challenge_type) {
        case "MOST_VOLUME":
          pointsEarned = totalVolume;
          break;
        case "MOST_WORKOUTS":
          pointsEarned = 1;
          break;
        case "MOST_SETS":
          pointsEarned = totalSets;
          break;
        case "FIRST_TO_TARGET":
          pointsEarned = totalVolume;
          break;
        default:
          continue;
      }

      if (pointsEarned <= 0) continue;

      const newScore = Number(participation.current_score) + pointsEarned;

      // Check if already logged this workout for this challenge (idempotency)
      const { data: existingLog } = await supabaseAdmin
        .from("challenge_score_logs")
        .select("id")
        .eq("participant_id", participation.id)
        .eq("workout_id", workout_id)
        .maybeSingle();

      if (existingLog) {
        continue; // Already processed
      }

      // Update participant score
      const { error: updateError } = await supabaseAdmin
        .from("challenge_participants")
        .update({
          current_score: newScore,
          updated_at: new Date().toISOString(),
        })
        .eq("id", participation.id);

      if (updateError) {
        console.error("Error updating participant score:", updateError);
        continue;
      }

      // Log the score update
      await supabaseAdmin
        .from("challenge_score_logs")
        .insert({
          participant_id: participation.id,
          workout_id,
          points_earned: pointsEarned,
          running_total: newScore,
          description: `${workout.name || "Workout"} - ${pointsEarned} points`,
        });

      // Update rankings for this challenge
      await supabaseAdmin.rpc("update_challenge_ranks", { p_challenge_id: challenge.id });

      updatedChallenges.push(challenge.id);

      // Check for FIRST_TO_TARGET completion
      if (challenge.challenge_type === "FIRST_TO_TARGET" && challenge.target_value) {
        if (newScore >= challenge.target_value) {
          // Mark participant as completed (winner!)
          await supabaseAdmin
            .from("challenge_participants")
            .update({
              status: "COMPLETED",
              rank: 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", participation.id);

          // Complete the challenge
          await supabaseAdmin
            .from("challenges")
            .update({
              status: "COMPLETED",
              updated_at: new Date().toISOString(),
            })
            .eq("id", challenge.id);

          // Notify the winner
          const { data: userInfo } = await supabaseClient
            .from("users")
            .select("username")
            .eq("id", user.id)
            .single();

          await supabaseAdmin
            .from("notifications")
            .insert({
              recipient_id: user.id,
              actor_id: user.id,
              type: "CHALLENGE_WIN",
              title: "Challenge Complete!",
              body: `You won the challenge by reaching ${challenge.target_value}!`,
              metadata: { challenge_id: challenge.id },
            });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        challenges_updated: updatedChallenges.length,
        challenge_ids: updatedChallenges,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("update-challenge-scores error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
