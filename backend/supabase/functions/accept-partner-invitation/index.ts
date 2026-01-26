// Edge Function: accept-partner-invitation
// Phase 2G: Social & Competition - Workout Partners
// Description: Accept a workout partner invitation

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

interface AcceptRequest {
  invitation_id: string;
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

    const { invitation_id }: AcceptRequest = await req.json();

    if (!invitation_id || !UUID_REGEX.test(invitation_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid invitation_id", code: "INVALID_INPUT", field: "invitation_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get invitation
    const { data: invitation, error: inviteError } = await supabaseClient
      .from("workout_partner_invitations")
      .select("id, workout_id, inviter_user_id, invitee_user_id, status, expires_at")
      .eq("id", invitation_id)
      .single();

    if (inviteError || !invitation) {
      return new Response(
        JSON.stringify({ error: "Invitation not found", code: "NOT_FOUND", resource: "invitation" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify invitee
    if (invitation.invitee_user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "This invitation is not for you", code: "FORBIDDEN" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check status
    if (invitation.status !== "PENDING") {
      return new Response(
        JSON.stringify({ error: `Invitation is ${invitation.status.toLowerCase()}`, code: "FORBIDDEN" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiration
    if (new Date(invitation.expires_at) < new Date()) {
      // Auto-expire
      await supabaseClient
        .from("workout_partner_invitations")
        .update({ status: "EXPIRED", updated_at: new Date().toISOString() })
        .eq("id", invitation_id);

      return new Response(
        JSON.stringify({ error: "Invitation has expired", code: "FORBIDDEN" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify workout still exists and is active
    const { data: workout, error: workoutError } = await supabaseClient
      .from("workouts")
      .select("id, user_id, ended_at")
      .eq("id", invitation.workout_id)
      .is("deleted_at", null)
      .single();

    if (workoutError || !workout) {
      return new Response(
        JSON.stringify({ error: "Workout not found", code: "NOT_FOUND", resource: "workout" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (workout.ended_at) {
      return new Response(
        JSON.stringify({ error: "Workout has already ended", code: "FORBIDDEN" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update invitation status
    const { error: updateError } = await supabaseClient
      .from("workout_partner_invitations")
      .update({ status: "ACCEPTED", updated_at: new Date().toISOString() })
      .eq("id", invitation_id);

    if (updateError) {
      console.error("Error updating invitation:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to accept invitation", code: "INTERNAL_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create partner relationships (bidirectional)
    const { error: partner1Error } = await supabaseClient
      .from("workout_partners")
      .insert({
        workout_id: invitation.workout_id,
        user_id: invitation.inviter_user_id,
        partner_user_id: user.id,
        status: "ACTIVE",
      });

    const { error: partner2Error } = await supabaseClient
      .from("workout_partners")
      .insert({
        workout_id: invitation.workout_id,
        user_id: user.id,
        partner_user_id: invitation.inviter_user_id,
        status: "ACTIVE",
      });

    if (partner1Error || partner2Error) {
      console.error("Error creating partner relationships:", partner1Error || partner2Error);
      // Rollback invitation status
      await supabaseClient
        .from("workout_partner_invitations")
        .update({ status: "PENDING", updated_at: new Date().toISOString() })
        .eq("id", invitation_id);

      return new Response(
        JSON.stringify({ error: "Failed to create partner relationship", code: "INTERNAL_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create notification for inviter
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: invitee } = await supabaseClient
      .from("users")
      .select("username")
      .eq("id", user.id)
      .single();

    await supabaseAdmin.functions.invoke("create-notification", {
      body: {
        recipient_id: invitation.inviter_user_id,
        actor_id: user.id,
        type: "WORKOUT_PARTNER_ACCEPTED",
        metadata: {
          workout_id: invitation.workout_id,
          partner_user_id: user.id,
        },
        title: "Partner Joined",
        body: `${invitee?.username || "Someone"} joined your workout`,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        workout_id: invitation.workout_id,
        partner_user_id: invitation.inviter_user_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("accept-partner-invitation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
