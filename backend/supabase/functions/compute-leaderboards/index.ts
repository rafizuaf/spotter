// Edge Function: compute-leaderboards
// Phase 2G: Social & Competition - Leaderboards
// Description: Scheduled job to compute all leaderboard rankings
// NOTE: This should be called by a scheduled job (cron), not directly by users

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

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify this is a scheduled call or internal service
    const authHeader = req.headers.get("Authorization");
    const internalKey = Deno.env.get("INTERNAL_SERVICE_KEY");

    // Allow calls with service role key or internal key
    const isServiceRole = authHeader?.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
    const isInternalCall = internalKey && authHeader === `Bearer ${internalKey}`;

    if (!isServiceRole && !isInternalCall) {
      // Also allow authenticated admin users to trigger manually
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader || "" } } }
      );

      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

      // For now, just require authentication
      // In production, you'd check for admin role
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized", code: "AUTH_REQUIRED" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const startTime = Date.now();
    const results: Record<string, { success: boolean; entries: number; error?: string }> = {};

    // Call the compute_all_leaderboards function
    const { error: computeError } = await supabaseAdmin.rpc("compute_all_leaderboards");

    if (computeError) {
      console.error("Error computing leaderboards:", computeError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to compute leaderboards",
          details: computeError.message,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get counts for each leaderboard
    const { data: leaderboards } = await supabaseAdmin
      .from("leaderboards")
      .select("code, title")
      .eq("is_active", true);

    for (const lb of leaderboards || []) {
      const { count } = await supabaseAdmin
        .from("leaderboard_entries")
        .select("*", { count: "exact", head: true })
        .eq("leaderboard_id", lb.code);

      results[lb.code] = {
        success: true,
        entries: count || 0,
      };
    }

    const durationMs = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        computed_at: new Date().toISOString(),
        duration_ms: durationMs,
        leaderboards: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("compute-leaderboards error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
