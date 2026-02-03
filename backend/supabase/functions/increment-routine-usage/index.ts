// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js";
import { getResponseHeaders } from "../_shared/security.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rateLimit.ts";

// CORS: Restrict to specific origin for security
const getAllowedOrigin = (): string => {
  const allowedOrigin = Deno.env.get("FRONTEND_URL") || "https://spotter-app.com";
  return allowedOrigin;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": getAllowedOrigin(),
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface IncrementUsageRequest {
  routine_id: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getResponseHeaders(corsHeaders) });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header", code: "AUTH_REQUIRED" }),
        {
          status: 401,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

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
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_REQUIRED" }),
        {
          status: 401,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // Use admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SECRET_KEY") ?? ""
    );

    // SECURITY: Rate limiting to prevent usage count inflation
    const rateLimit = await checkRateLimit(
      user.id,
      'increment-routine-usage',
      RATE_LIMITS['increment-routine-usage'].maxRequests,
      RATE_LIMITS['increment-routine-usage'].windowMs,
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
            "X-RateLimit-Limit": RATE_LIMITS['increment-routine-usage'].maxRequests.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.resetAt.toString(),
          },
        }
      );
    }

    // Parse request
    const { routine_id }: IncrementUsageRequest = await req.json();

    if (!routine_id) {
      return new Response(
        JSON.stringify({ error: "Missing routine_id" }),
        {
          status: 400,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // C7: Verify routine exists and is public
    const { data: routine, error: routineError } = await supabaseAdmin
      .from("routines")
      .select("id, is_public, user_id")
      .eq("id", routine_id)
      .is("deleted_at", null)
      .single();

    if (routineError || !routine) {
      return new Response(
        JSON.stringify({ error: "Routine not found", code: "NOT_FOUND" }),
        {
          status: 404,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // C7: Only increment usage for public routines (templates)
    if (!routine.is_public) {
      return new Response(
        JSON.stringify({ error: "Routine is not public", code: "FORBIDDEN" }),
        {
          status: 403,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // C7: Increment usage_count atomically
    const { error: updateError } = await supabaseAdmin.rpc("increment_routine_usage", {
      routine_id_param: routine_id,
    });

    // If RPC doesn't exist, use direct update (fallback)
    if (updateError) {
      const { data: currentRoutine } = await supabaseAdmin
        .from("routines")
        .select("usage_count")
        .eq("id", routine_id)
        .single();

      const newUsageCount = (currentRoutine?.usage_count || 0) + 1;

      const { error: fallbackError } = await supabaseAdmin
        .from("routines")
        .update({ usage_count: newUsageCount, updated_at: new Date().toISOString() })
        .eq("id", routine_id);

      if (fallbackError) {
        throw fallbackError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        routine_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Increment routine usage error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: getResponseHeaders(corsHeaders),
      }
    );
  }
});
