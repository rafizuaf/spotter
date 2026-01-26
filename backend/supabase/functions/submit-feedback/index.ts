// Edge Function: submit-feedback
// Description: Submit user feedback (bug reports, feature requests, general feedback)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";
import { getResponseHeaders } from "../_shared/security.ts";

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

interface SubmitFeedbackRequest {
  feedback_type: "bug" | "feature" | "general";
  message: string;
  app_version?: string;
  platform?: string;
  device_info?: Record<string, unknown>;
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getResponseHeaders(corsHeaders) });
  }

  try {
    // 1. Authenticate user
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

    // 2. Parse and validate request body
    const body: SubmitFeedbackRequest = await req.json();

    // Validate feedback_type
    if (!body.feedback_type || !["bug", "feature", "general"].includes(body.feedback_type)) {
      return new Response(
        JSON.stringify({
          error: "Invalid feedback_type. Must be 'bug', 'feature', or 'general'",
          code: "INVALID_INPUT",
          field: "feedback_type",
        }),
        {
          status: 400,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // Validate message
    if (!body.message || typeof body.message !== "string") {
      return new Response(
        JSON.stringify({
          error: "Message is required",
          code: "INVALID_INPUT",
          field: "message",
        }),
        {
          status: 400,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    const trimmedMessage = body.message.trim();
    if (trimmedMessage.length < 10) {
      return new Response(
        JSON.stringify({
          error: "Message must be at least 10 characters",
          code: "INVALID_INPUT",
          field: "message",
        }),
        {
          status: 400,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    if (trimmedMessage.length > 5000) {
      return new Response(
        JSON.stringify({
          error: "Message must be 5000 characters or less",
          code: "INVALID_INPUT",
          field: "message",
        }),
        {
          status: 400,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // 3. Create feedback entry
    const { data: feedback, error: feedbackError } = await supabaseClient
      .from("user_feedback")
      .insert({
        user_id: user.id,
        feedback_type: body.feedback_type,
        message: trimmedMessage,
        app_version: body.app_version || null,
        platform: body.platform || null,
        device_info: body.device_info || null,
        status: "pending",
      })
      .select()
      .single();

    if (feedbackError) {
      console.error("Error creating feedback:", feedbackError);
      return new Response(
        JSON.stringify({
          error: "Failed to submit feedback",
          code: "INTERNAL_ERROR",
        }),
        {
          status: 500,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // 4. Return success response
    return new Response(
      JSON.stringify({
        success: true,
        feedback_id: feedback.id,
        message: "Feedback submitted successfully",
      }),
      {
        headers: getResponseHeaders(corsHeaders),
      }
    );
  } catch (error) {
    console.error("submit-feedback error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        error: errorMessage,
        code: "INTERNAL_ERROR",
      }),
      {
        status: 500,
        headers: getResponseHeaders(corsHeaders),
      }
    );
  }
});
