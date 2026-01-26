// Edge Function: leave-challenge
// Phase 2G: Social & Competition - Challenge System
// Description: Leave/abandon a challenge

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";
import { getResponseHeaders } from "../_shared/security.ts";

const getAllowedOrigin = (): string => {
  return Deno.env.get("FRONTEND_URL") || "https://spotter-app.com";
};

const corsHeaders = {
  "Access-Control-Allow-Origin": getAllowedOrigin(),
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface LeaveChallengeRequest {
  challenge_id: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getResponseHeaders(corsHeaders) });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header", code: "AUTH_REQUIRED" }),
        { status: 401, headers: getResponseHeaders(corsHeaders) }
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
        { status: 401, headers: getResponseHeaders(corsHeaders) }
      );
    }

    const { challenge_id }: LeaveChallengeRequest = await req.json();

    if (!challenge_id || !UUID_REGEX.test(challenge_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid challenge_id", code: "INVALID_INPUT", field: "challenge_id" }),
        { status: 400, headers: getResponseHeaders(corsHeaders) }
      );
    }

    // Check if user is participating
    const { data: participant, error: participantError } = await supabaseClient
      .from("challenge_participants")
      .select("id, status")
      .eq("challenge_id", challenge_id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (participantError || !participant) {
      return new Response(
        JSON.stringify({ error: "Not participating in this challenge", code: "NOT_FOUND", resource: "participant" }),
        { status: 404, headers: getResponseHeaders(corsHeaders) }
      );
    }

    if (participant.status !== "ACTIVE") {
      return new Response(
        JSON.stringify({ error: "Already left this challenge", code: "CONFLICT" }),
        { status: 409, headers: getResponseHeaders(corsHeaders) }
      );
    }

    // Check if user is the challenge creator
    const { data: challenge } = await supabaseClient
      .from("challenges")
      .select("created_by_id, status")
      .eq("id", challenge_id)
      .single();

    if (challenge?.created_by_id === user.id) {
      // Creator leaving cancels the challenge if it hasn't started
      if (challenge.status === "PENDING") {
        const { error: cancelError } = await supabaseClient
          .from("challenges")
          .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
          .eq("id", challenge_id);

        if (cancelError) {
          console.error("Error cancelling challenge:", cancelError);
        }

        return new Response(
          JSON.stringify({ success: true, action: "cancelled", challenge_id }),
          { headers: getResponseHeaders(corsHeaders) }
        );
      }
    }

    // Mark participation as abandoned
    const { error: leaveError } = await supabaseClient
      .from("challenge_participants")
      .update({
        status: "ABANDONED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", participant.id);

    if (leaveError) {
      console.error("Error leaving challenge:", leaveError);
      return new Response(
        JSON.stringify({ error: "Failed to leave challenge", code: "INTERNAL_ERROR" }),
        { status: 500, headers: getResponseHeaders(corsHeaders) }
      );
    }

    return new Response(
      JSON.stringify({ success: true, action: "left", challenge_id }),
      { headers: getResponseHeaders(corsHeaders) }
    );
  } catch (error) {
    console.error("leave-challenge error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, code: "INTERNAL_ERROR" }),
      { status: 500, headers: getResponseHeaders(corsHeaders) }
    );
  }
});
