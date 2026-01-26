// Edge Function: create-challenge
// Phase 2G: Social & Competition - Challenge System
// Description: Create a new fitness challenge

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

const VALID_CHALLENGE_TYPES = ["MOST_VOLUME", "MOST_WORKOUTS", "MOST_SETS", "FIRST_TO_TARGET"] as const;
const VALID_VISIBILITY = ["PUBLIC", "FOLLOWERS", "INVITE_ONLY"] as const;

type ChallengeType = (typeof VALID_CHALLENGE_TYPES)[number];
type Visibility = (typeof VALID_VISIBILITY)[number];

interface CreateChallengeRequest {
  title: string;
  description?: string;
  challenge_type: ChallengeType;
  target_value?: number;
  start_date: string;
  end_date: string;
  visibility?: Visibility;
  max_participants?: number;
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

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_REQUIRED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CreateChallengeRequest = await req.json();
    const {
      title,
      description,
      challenge_type,
      target_value,
      start_date,
      end_date,
      visibility = "FOLLOWERS",
      max_participants = 50,
    } = body;

    // Validate required fields
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Title is required", code: "INVALID_INPUT", field: "title" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (title.length > 100) {
      return new Response(
        JSON.stringify({ error: "Title must be 100 characters or less", code: "INVALID_INPUT", field: "title" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (description && description.length > 500) {
      return new Response(
        JSON.stringify({ error: "Description must be 500 characters or less", code: "INVALID_INPUT", field: "description" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!VALID_CHALLENGE_TYPES.includes(challenge_type)) {
      return new Response(
        JSON.stringify({ error: `Invalid challenge_type. Must be one of: ${VALID_CHALLENGE_TYPES.join(", ")}`, code: "INVALID_INPUT", field: "challenge_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (challenge_type === "FIRST_TO_TARGET" && (!target_value || target_value <= 0)) {
      return new Response(
        JSON.stringify({ error: "target_value is required and must be > 0 for FIRST_TO_TARGET challenges", code: "INVALID_INPUT", field: "target_value" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!VALID_VISIBILITY.includes(visibility)) {
      return new Response(
        JSON.stringify({ error: `Invalid visibility. Must be one of: ${VALID_VISIBILITY.join(", ")}`, code: "INVALID_INPUT", field: "visibility" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const now = new Date();

    if (isNaN(startDate.getTime())) {
      return new Response(
        JSON.stringify({ error: "Invalid start_date format", code: "INVALID_INPUT", field: "start_date" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (isNaN(endDate.getTime())) {
      return new Response(
        JSON.stringify({ error: "Invalid end_date format", code: "INVALID_INPUT", field: "end_date" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (endDate <= startDate) {
      return new Response(
        JSON.stringify({ error: "end_date must be after start_date", code: "INVALID_INPUT", field: "end_date" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Challenge can't be longer than 30 days
    const durationMs = endDate.getTime() - startDate.getTime();
    const maxDurationMs = 30 * 24 * 60 * 60 * 1000;
    if (durationMs > maxDurationMs) {
      return new Response(
        JSON.stringify({ error: "Challenge duration cannot exceed 30 days", code: "INVALID_INPUT", field: "end_date" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (max_participants < 2 || max_participants > 100) {
      return new Response(
        JSON.stringify({ error: "max_participants must be between 2 and 100", code: "INVALID_INPUT", field: "max_participants" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine initial status
    const status = startDate <= now ? "ACTIVE" : "PENDING";

    // Create challenge
    const { data: challenge, error: createError } = await supabaseClient
      .from("challenges")
      .insert({
        created_by_id: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        challenge_type,
        target_value: challenge_type === "FIRST_TO_TARGET" ? target_value : null,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status,
        visibility,
        max_participants,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating challenge:", createError);
      return new Response(
        JSON.stringify({ error: "Failed to create challenge", code: "INTERNAL_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auto-join the creator as first participant
    const { error: joinError } = await supabaseClient
      .from("challenge_participants")
      .insert({
        challenge_id: challenge.id,
        user_id: user.id,
        rank: 1,
      });

    if (joinError) {
      console.error("Error auto-joining challenge:", joinError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        challenge: {
          id: challenge.id,
          title: challenge.title,
          challenge_type: challenge.challenge_type,
          status: challenge.status,
          start_date: challenge.start_date,
          end_date: challenge.end_date,
          visibility: challenge.visibility,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("create-challenge error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
