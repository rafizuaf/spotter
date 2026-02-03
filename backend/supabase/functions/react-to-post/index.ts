// Edge Function: react-to-post
// Phase 2G: Social & Competition - Feed Reactions
// Description: Toggle reaction on a social post (like, fire, muscle, clap)

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

// Valid reaction types
const VALID_REACTION_TYPES = ["LIKE", "FIRE", "MUSCLE", "CLAP"] as const;
type ReactionType = (typeof VALID_REACTION_TYPES)[number];

interface ReactToPostRequest {
  social_post_id: string;
  reaction_type: ReactionType;
}

interface ReactToPostResponse {
  success: boolean;
  action: "added" | "removed";
  reaction_type: ReactionType;
  reaction_counts: {
    like: number;
    fire: number;
    muscle: number;
    clap: number;
  };
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getResponseHeaders(corsHeaders) });
  }

  try {
    // Get authorization header
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

    // Create Supabase client with user's auth token
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    // Get current user
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

    // Parse and validate request body
    const body = await req.json();
    const { social_post_id, reaction_type }: ReactToPostRequest = body;

    // Validate social_post_id
    if (!social_post_id || typeof social_post_id !== "string") {
      return new Response(
        JSON.stringify({
          error: "social_post_id is required",
          code: "INVALID_INPUT",
          field: "social_post_id",
        }),
        {
          status: 400,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    if (!UUID_REGEX.test(social_post_id)) {
      return new Response(
        JSON.stringify({
          error: "Invalid social_post_id format",
          code: "INVALID_INPUT",
          field: "social_post_id",
        }),
        {
          status: 400,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // Validate reaction_type
    if (!reaction_type || !VALID_REACTION_TYPES.includes(reaction_type)) {
      return new Response(
        JSON.stringify({
          error: `Invalid reaction_type. Must be one of: ${VALID_REACTION_TYPES.join(", ")}`,
          code: "INVALID_INPUT",
          field: "reaction_type",
        }),
        {
          status: 400,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // Check if post exists and is visible to user (RLS will handle visibility)
    const { data: post, error: postError } = await supabaseClient
      .from("social_posts")
      .select("id, user_id")
      .eq("id", social_post_id)
      .is("deleted_at", null)
      .single();

    if (postError || !post) {
      return new Response(
        JSON.stringify({
          error: "Post not found or not visible",
          code: "NOT_FOUND",
          resource: "social_post",
        }),
        {
          status: 404,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // Check if user already has this reaction
    const { data: existingReaction, error: existingError } = await supabaseClient
      .from("post_reactions")
      .select("id, deleted_at")
      .eq("social_post_id", social_post_id)
      .eq("user_id", user.id)
      .eq("reaction_type", reaction_type)
      .maybeSingle();

    if (existingError) {
      console.error("Error checking existing reaction:", existingError);
      return new Response(
        JSON.stringify({
          error: "Failed to check existing reaction",
          code: "INTERNAL_ERROR",
        }),
        {
          status: 500,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    let action: "added" | "removed";

    if (existingReaction) {
      if (existingReaction.deleted_at === null) {
        // Reaction exists and is active - soft delete it (toggle off)
        const { error: deleteError } = await supabaseClient
          .from("post_reactions")
          .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", existingReaction.id);

        if (deleteError) {
          console.error("Error removing reaction:", deleteError);
          return new Response(
            JSON.stringify({
              error: "Failed to remove reaction",
              code: "INTERNAL_ERROR",
            }),
            {
              status: 500,
              headers: getResponseHeaders(corsHeaders),
            }
          );
        }
        action = "removed";
      } else {
        // Reaction exists but was deleted - un-delete it (toggle on)
        const { error: restoreError } = await supabaseClient
          .from("post_reactions")
          .update({ deleted_at: null, updated_at: new Date().toISOString() })
          .eq("id", existingReaction.id);

        if (restoreError) {
          console.error("Error restoring reaction:", restoreError);
          return new Response(
            JSON.stringify({
              error: "Failed to restore reaction",
              code: "INTERNAL_ERROR",
            }),
            {
              status: 500,
              headers: getResponseHeaders(corsHeaders),
            }
          );
        }
        action = "added";
      }
    } else {
      // No existing reaction - create new one
      const { error: insertError } = await supabaseClient
        .from("post_reactions")
        .insert({
          social_post_id,
          user_id: user.id,
          reaction_type,
        });

      if (insertError) {
        console.error("Error creating reaction:", insertError);
        return new Response(
          JSON.stringify({
            error: "Failed to create reaction",
            code: "INTERNAL_ERROR",
          }),
          {
            status: 500,
            headers: getResponseHeaders(corsHeaders),
          }
        );
      }
      action = "added";
    }

    // Get updated reaction counts from social_posts (cached counts)
    const { data: updatedPost, error: countsError } = await supabaseClient
      .from("social_posts")
      .select("reaction_count_like, reaction_count_fire, reaction_count_muscle, reaction_count_clap")
      .eq("id", social_post_id)
      .single();

    if (countsError) {
      console.error("Error fetching updated counts:", countsError);
    }

    const reactionCounts = {
      like: updatedPost?.reaction_count_like ?? 0,
      fire: updatedPost?.reaction_count_fire ?? 0,
      muscle: updatedPost?.reaction_count_muscle ?? 0,
      clap: updatedPost?.reaction_count_clap ?? 0,
    };

    // Create notification for post author if reaction was added (not for own posts)
    if (action === "added" && post.user_id !== user.id) {
      // Use admin client for creating notification (bypasses RLS)
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Get reactor's username for notification
      const { data: reactor } = await supabaseClient
        .from("users")
        .select("username")
        .eq("id", user.id)
        .single();

      const reactionEmoji = {
        LIKE: "❤️",
        FIRE: "🔥",
        MUSCLE: "💪",
        CLAP: "👏",
      }[reaction_type];

      await supabaseAdmin
        .from("notifications")
        .insert({
          recipient_id: post.user_id,
          actor_id: user.id,
          type: "REACTION",
          title: `${reactor?.username || "Someone"} reacted ${reactionEmoji}`,
          body: `${reactor?.username || "Someone"} reacted to your workout post`,
          metadata: {
            social_post_id,
            reaction_type,
          },
        })
        .single();
    }

    const response: ReactToPostResponse = {
      success: true,
      action,
      reaction_type,
      reaction_counts: reactionCounts,
    };

    return new Response(JSON.stringify(response), {
      headers: getResponseHeaders(corsHeaders),
    });
  } catch (error) {
    console.error("react-to-post error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, code: "INTERNAL_ERROR" }),
      {
        status: 500,
        headers: getResponseHeaders(corsHeaders),
      }
    );
  }
});
