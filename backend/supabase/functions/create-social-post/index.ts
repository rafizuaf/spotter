// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateSocialPostRequest {
  workoutId?: string;
  achievementCode?: string;
  visibility?: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
}

interface Workout {
  id: string;
  name: string | null;
  user_id: string;
  visibility: string;
  ended_at: string | null;
}

interface WorkoutSet {
  id: string;
  exercise_id: string;
  is_pr: boolean;
}

interface Exercise {
  id: string;
  name: string;
}

interface Achievement {
  code: string;
  title: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Authenticate user
    const authHeader = req.headers.get("Authorization")!;
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Parse request
    const { workoutId, achievementCode, visibility }: CreateSocialPostRequest = await req.json();

    if (!workoutId && !achievementCode) {
      return new Response(
        JSON.stringify({ error: "Either workoutId or achievementCode is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Use admin client for business logic
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SECRET_KEY") ?? ""
    );

    let generatedHeadline = "";
    let postVisibility = visibility;

    // 4. If workout provided, generate workout-related headline
    if (workoutId) {
      const { data: workout, error: workoutError } = await supabaseAdmin
        .from("workouts")
        .select("id, name, user_id, visibility, ended_at")
        .eq("id", workoutId)
        .single();

      if (workoutError || !workout) {
        return new Response(
          JSON.stringify({ error: "Workout not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const workoutData = workout as Workout;

      // Verify ownership
      if (workoutData.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: "Not authorized to create post for this workout" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Use workout's visibility if not explicitly provided
      if (!postVisibility) {
        postVisibility = workoutData.visibility as "PUBLIC" | "FOLLOWERS" | "PRIVATE";
      }

      // Check if workout has any PRs
      const { data: sets } = await supabaseAdmin
        .from("workout_sets")
        .select("id, exercise_id, is_pr")
        .eq("workout_id", workoutId)
        .eq("is_pr", true)
        .limit(1);

      const hasPR = sets && sets.length > 0;

      if (hasPR) {
        // Get the exercise name for the PR
        const setData = sets[0] as WorkoutSet;
        const { data: exercise } = await supabaseAdmin
          .from("exercises")
          .select("name")
          .eq("id", setData.exercise_id)
          .single();

        const exerciseName = (exercise as Exercise)?.name || "an exercise";
        generatedHeadline = `Hit a new PR on ${exerciseName}! 💪`;
      } else {
        // No PRs, just workout completion
        const workoutName = workoutData.name || "a workout";
        generatedHeadline = `Completed ${workoutName}`;
      }
    }

    // 5. If achievement provided, generate achievement headline
    if (achievementCode) {
      const { data: achievement, error: achievementError } = await supabaseAdmin
        .from("achievements")
        .select("code, title")
        .eq("code", achievementCode)
        .single();

      if (achievementError || !achievement) {
        return new Response(
          JSON.stringify({ error: "Achievement not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const achievementData = achievement as Achievement;

      // If we already have a workout headline, append achievement
      if (generatedHeadline) {
        generatedHeadline += ` and unlocked "${achievementData.title}"! 🏆`;
      } else {
        generatedHeadline = `Unlocked achievement: "${achievementData.title}"! 🏆`;
      }
    }

    // 6. Check if user wants to share (respect privacy settings)
    if (postVisibility === "PRIVATE") {
      // Don't create social post for private workouts
      return new Response(
        JSON.stringify({
          success: true,
          message: "Workout is private, no social post created",
          postId: null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Check if social post already exists for this workout/achievement combo
    const { data: existingPost } = await supabaseAdmin
      .from("social_posts")
      .select("id")
      .eq("user_id", user.id)
      .eq("workout_id", workoutId || null)
      .eq("achievement_code", achievementCode || null)
      .is("deleted_at", null)
      .single();

    if (existingPost) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Social post already exists",
          postId: existingPost.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8. Create the social post
    const { data: newPost, error: createError } = await supabaseAdmin
      .from("social_posts")
      .insert({
        user_id: user.id,
        workout_id: workoutId || null,
        achievement_code: achievementCode || null,
        generated_headline: generatedHeadline,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (createError) {
      throw createError;
    }

    // 9. Return success
    return new Response(
      JSON.stringify({
        success: true,
        postId: newPost.id,
        headline: generatedHeadline,
        visibility: postVisibility,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Create social post error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
