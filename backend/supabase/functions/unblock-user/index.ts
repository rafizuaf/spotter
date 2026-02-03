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

interface UnblockUserRequest {
  blockedId: string;
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
        headers: getResponseHeaders(corsHeaders),
      });
    }

    // SECURITY: Rate limiting to prevent spam
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SECRET_KEY") ?? ""
    );

    const rateLimit = await checkRateLimit(
      user.id,
      'unblock-user',
      RATE_LIMITS['unblock-user'].maxRequests,
      RATE_LIMITS['unblock-user'].windowMs,
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
            "X-RateLimit-Limit": RATE_LIMITS['unblock-user'].maxRequests.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.resetAt.toString(),
          },
        }
      );
    }

    // 2. Parse request
    const { blockedId }: UnblockUserRequest = await req.json();

    if (!blockedId) {
      return new Response(
        JSON.stringify({ error: "Missing blockedId" }),
        {
          status: 400,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // 3. Use admin client for business logic (already created above for rate limiting)

    // 4. Find the block record
    const { data: existingBlock } = await supabaseAdmin
      .from("user_blocks")
      .select("id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", blockedId)
      .single();

    if (!existingBlock) {
      return new Response(
        JSON.stringify({ error: "User is not blocked" }),
        {
          status: 404,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // 5. Hard delete the block record (user_blocks has no soft delete)
    const { error: deleteError } = await supabaseAdmin
      .from("user_blocks")
      .delete()
      .eq("id", existingBlock.id);

    if (deleteError) {
      throw deleteError;
    }

    // 6. Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: "Successfully unblocked user",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unblock user error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: getResponseHeaders(corsHeaders),
      }
    );
  }
});
