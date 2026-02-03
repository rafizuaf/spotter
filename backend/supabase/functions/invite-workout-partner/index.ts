// Edge Function: invite-workout-partner
// Phase 2G: Social & Competition - Workout Partners
// Description: Send invitation to a user to join as workout partner

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";
import { getResponseHeaders } from "../_shared/security.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rateLimit.ts";

const getAllowedOrigin = (): string => {
  return Deno.env.get("FRONTEND_URL") || "https://spotter-app.com";
};

const corsHeaders = {
  "Access-Control-Allow-Origin": getAllowedOrigin(),
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface InviteRequest {
  workout_id: string;
  partner_user_id: string;
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

    const { workout_id, partner_user_id }: InviteRequest = await req.json();

    if (!workout_id || !UUID_REGEX.test(workout_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid workout_id", code: "INVALID_INPUT", field: "workout_id" }),
        { status: 400, headers: getResponseHeaders(corsHeaders) }
      );
    }

    if (!partner_user_id || !UUID_REGEX.test(partner_user_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid partner_user_id", code: "INVALID_INPUT", field: "partner_user_id" }),
        { status: 400, headers: getResponseHeaders(corsHeaders) }
      );
    }

    if (partner_user_id === user.id) {
      return new Response(
        JSON.stringify({ error: "Cannot invite yourself", code: "INVALID_INPUT" }),
        { status: 400, headers: getResponseHeaders(corsHeaders) }
      );
    }

    // Verify workout ownership
    const { data: workout, error: workoutError } = await supabaseClient
      .from("workouts")
      .select("id, user_id, ended_at")
      .eq("id", workout_id)
      .is("deleted_at", null)
      .single();

    if (workoutError || !workout) {
      return new Response(
        JSON.stringify({ error: "Workout not found", code: "NOT_FOUND", resource: "workout" }),
        { status: 404, headers: getResponseHeaders(corsHeaders) }
      );
    }

    if (workout.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "You don't own this workout", code: "FORBIDDEN" }),
        { status: 403, headers: getResponseHeaders(corsHeaders) }
      );
    }

    if (workout.ended_at) {
      return new Response(
        JSON.stringify({ error: "Cannot invite partners to completed workout", code: "FORBIDDEN" }),
        { status: 403, headers: getResponseHeaders(corsHeaders) }
      );
    }

    // Create admin client for rate limiting and block checks
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SECRET_KEY") ?? ""
    );

    // SECURITY: Rate limiting to prevent invitation spam
    const rateLimit = await checkRateLimit(
      user.id,
      'invite-workout-partner',
      RATE_LIMITS['invite-workout-partner'].maxRequests,
      RATE_LIMITS['invite-workout-partner'].windowMs,
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
            "X-RateLimit-Limit": RATE_LIMITS['invite-workout-partner'].maxRequests.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.resetAt.toString(),
          },
        }
      );
    }

    // SECURITY: Check if users are blocked (either direction) before sending invitation
    const { data: blockCheck } = await supabaseAdmin
      .from("user_blocks")
      .select("id")
      .or(
        `and(blocker_id.eq.${user.id},blocked_id.eq.${partner_user_id}),and(blocker_id.eq.${partner_user_id},blocked_id.eq.${user.id})`
      )
      .maybeSingle();

    if (blockCheck) {
      return new Response(
        JSON.stringify({ error: "Cannot invite blocked user", code: "FORBIDDEN" }),
        { status: 403, headers: getResponseHeaders(corsHeaders) }
      );
    }

    // Check if already partners
    const { data: existingPartner } = await supabaseClient
      .from("workout_partners")
      .select("id")
      .eq("workout_id", workout_id)
      .eq("user_id", user.id)
      .eq("partner_user_id", partner_user_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingPartner) {
      return new Response(
        JSON.stringify({ error: "Already partners in this workout", code: "CONFLICT" }),
        { status: 409, headers: getResponseHeaders(corsHeaders) }
      );
    }

    // Check for existing pending invitation
    const { data: existingInvitation } = await supabaseClient
      .from("workout_partner_invitations")
      .select("id, status")
      .eq("workout_id", workout_id)
      .eq("invitee_user_id", partner_user_id)
      .eq("status", "PENDING")
      .maybeSingle();

    if (existingInvitation) {
      return new Response(
        JSON.stringify({ error: "Invitation already sent", code: "CONFLICT" }),
        { status: 409, headers: getResponseHeaders(corsHeaders) }
      );
    }

    // Create invitation
    const { data: invitation, error: inviteError } = await supabaseClient
      .from("workout_partner_invitations")
      .insert({
        workout_id,
        inviter_user_id: user.id,
        invitee_user_id: partner_user_id,
        status: "PENDING",
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Error creating invitation:", inviteError);
      return new Response(
        JSON.stringify({ error: "Failed to create invitation", code: "INTERNAL_ERROR" }),
        { status: 500, headers: getResponseHeaders(corsHeaders) }
      );
    }

    // Create notification for invitee
    const { data: inviter } = await supabaseClient
      .from("users")
      .select("username")
      .eq("id", user.id)
      .single();

    await supabaseAdmin.functions.invoke("create-notification", {
      body: {
        recipient_id: partner_user_id,
        actor_id: user.id,
        type: "WORKOUT_PARTNER_INVITE",
        metadata: {
          workout_id,
          invitation_id: invitation.id,
          inviter_username: inviter?.username || "Someone",
        },
        title: "Workout Partner Invitation",
        body: `${inviter?.username || "Someone"} invited you to train together`,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        invitation: {
          id: invitation.id,
          workout_id: invitation.workout_id,
          partner_user_id: invitation.invitee_user_id,
          expires_at: invitation.expires_at,
        },
      }),
      { headers: getResponseHeaders(corsHeaders) }
    );
  } catch (error) {
    console.error("invite-workout-partner error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, code: "INTERNAL_ERROR" }),
      { status: 500, headers: getResponseHeaders(corsHeaders) }
    );
  }
});
