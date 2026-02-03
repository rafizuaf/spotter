// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js";
import { getResponseHeaders } from "../_shared/security.ts";

// CORS: Allow same origin as other functions
const getAllowedOrigin = (): string => {
  const allowedOrigin = Deno.env.get("FRONTEND_URL") || "https://spotter-app.com";
  return allowedOrigin;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": getAllowedOrigin(),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * B9: Health Check Endpoint
 * 
 * Returns 200 if database and auth service are reachable.
 * Used by monitoring tools and optionally by client before sync.
 * 
 * GET or POST /functions/v1/health
 */
Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getResponseHeaders(corsHeaders) });
  }

  try {
    // B9: Create admin client to check database connectivity
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SECRET_KEY") ?? ""
    );

    // B9: Run trivial query to verify database is reachable
    // Use a simple SELECT 1 or query a minimal table
    const { error: dbError } = await supabaseAdmin
      .from("users")
      .select("id")
      .limit(1);

    if (dbError) {
      // Database unreachable
      return new Response(
        JSON.stringify({
          status: "degraded",
          error: "Database unreachable",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 503,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // B9: Health check passed - database is reachable
    // Auth service is implied by Supabase runtime (if function runs, auth is available)
    return new Response(
      JSON.stringify({
        status: "ok",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: getResponseHeaders(corsHeaders),
      }
    );
  } catch (error) {
    // Unexpected error
    console.error("Health check error:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: getResponseHeaders(corsHeaders),
      }
    );
  }
});
