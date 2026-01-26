// Edge Function: leave-workout-partner
// Phase 2G: Social & Competition - Workout Partners
// Description: Leave a workout partner session

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

interface LeaveRequest {
  workout_id: string;
  partner_user_id?: string; // Optional: leave specific partner, or leave all if not provided
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

    const { workout_id, partner_user_id }: LeaveRequest = await req.json();

    if (!workout_id || !UUID_REGEX.test(workout_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid workout_id", code: "INVALID_INPUT", field: "workout_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build query
    let query = supabaseClient
      .from("workout_partners")
      .update({
        status: "LEFT",
        left_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("workout_id", workout_id)
      .eq("user_id", user.id)
      .eq("status", "ACTIVE");

    if (partner_user_id) {
      if (!UUID_REGEX.test(partner_user_id)) {
        return new Response(
          JSON.stringify({ error: "Invalid partner_user_id", code: "INVALID_INPUT", field: "partner_user_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      query = query.eq("partner_user_id", partner_user_id);
    }

    const { error: updateError } = await query;

    if (updateError) {
      console.error("Error leaving partner session:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to leave partner session", code: "INTERNAL_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        workout_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("leave-workout-partner error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
