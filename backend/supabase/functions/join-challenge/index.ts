// Edge Function: join-challenge
// Phase 2G: Social & Competition - Challenge System
// Description: Join an existing challenge

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

interface JoinChallengeRequest {
  challenge_id: string;
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

    const { challenge_id }: JoinChallengeRequest = await req.json();

    if (!challenge_id || !UUID_REGEX.test(challenge_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid challenge_id", code: "INVALID_INPUT", field: "challenge_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get challenge details (RLS will filter based on visibility)
    const { data: challenge, error: challengeError } = await supabaseClient
      .from("challenges")
      .select("id, created_by_id, status, visibility, max_participants")
      .eq("id", challenge_id)
      .is("deleted_at", null)
      .single();

    if (challengeError || !challenge) {
      return new Response(
        JSON.stringify({ error: "Challenge not found or not accessible", code: "NOT_FOUND", resource: "challenge" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check challenge is joinable
    if (challenge.status === "COMPLETED" || challenge.status === "CANCELLED") {
      return new Response(
        JSON.stringify({ error: "Challenge has ended", code: "FORBIDDEN" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already participating
    const { data: existingParticipant } = await supabaseClient
      .from("challenge_participants")
      .select("id, deleted_at, status")
      .eq("challenge_id", challenge_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingParticipant) {
      if (existingParticipant.deleted_at === null && existingParticipant.status === "ACTIVE") {
        return new Response(
          JSON.stringify({ error: "Already participating in this challenge", code: "CONFLICT" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Re-join if previously abandoned/deleted
      const { error: rejoinError } = await supabaseClient
        .from("challenge_participants")
        .update({
          status: "ACTIVE",
          deleted_at: null,
          current_score: 0,
          rank: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingParticipant.id);

      if (rejoinError) {
        console.error("Error rejoining challenge:", rejoinError);
        return new Response(
          JSON.stringify({ error: "Failed to rejoin challenge", code: "INTERNAL_ERROR" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, action: "rejoined", challenge_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check participant count
    const { count: participantCount } = await supabaseClient
      .from("challenge_participants")
      .select("*", { count: "exact", head: true })
      .eq("challenge_id", challenge_id)
      .is("deleted_at", null)
      .eq("status", "ACTIVE");

    if (participantCount !== null && participantCount >= challenge.max_participants) {
      return new Response(
        JSON.stringify({ error: "Challenge is full", code: "LIMIT_EXCEEDED", limit: challenge.max_participants }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For INVITE_ONLY, check if user was invited
    if (challenge.visibility === "INVITE_ONLY") {
      const { data: invitation } = await supabaseClient
        .from("challenge_invitations")
        .select("id, status")
        .eq("challenge_id", challenge_id)
        .eq("invited_user_id", user.id)
        .eq("status", "PENDING")
        .maybeSingle();

      if (!invitation && challenge.created_by_id !== user.id) {
        return new Response(
          JSON.stringify({ error: "Invitation required to join this challenge", code: "FORBIDDEN" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark invitation as accepted
      if (invitation) {
        await supabaseClient
          .from("challenge_invitations")
          .update({ status: "ACCEPTED", updated_at: new Date().toISOString() })
          .eq("id", invitation.id);
      }
    }

    // Join the challenge
    const { error: joinError } = await supabaseClient
      .from("challenge_participants")
      .insert({
        challenge_id,
        user_id: user.id,
      });

    if (joinError) {
      console.error("Error joining challenge:", joinError);
      return new Response(
        JSON.stringify({ error: "Failed to join challenge", code: "INTERNAL_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create notification for challenge creator
    if (challenge.created_by_id !== user.id) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { data: joiner } = await supabaseClient
        .from("users")
        .select("username")
        .eq("id", user.id)
        .single();

      await supabaseAdmin
        .from("notifications")
        .insert({
          recipient_id: challenge.created_by_id,
          actor_id: user.id,
          type: "CHALLENGE_JOIN",
          title: `${joiner?.username || "Someone"} joined your challenge`,
          body: `${joiner?.username || "A user"} joined your fitness challenge`,
          metadata: { challenge_id },
        });
    }

    return new Response(
      JSON.stringify({ success: true, action: "joined", challenge_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("join-challenge error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
