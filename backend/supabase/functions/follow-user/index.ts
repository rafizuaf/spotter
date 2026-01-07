// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FollowUserRequest {
  followingId: string;
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Parse request
    const { followingId }: FollowUserRequest = await req.json();

    if (!followingId) {
      return new Response(
        JSON.stringify({ error: "Missing followingId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Prevent self-follow
    if (user.id === followingId) {
      return new Response(
        JSON.stringify({ error: "Cannot follow yourself" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Use admin client for business logic
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SECRET_KEY") ?? ""
    );

    // 5. Check if blocked (either direction)
    const { data: blocks } = await supabaseAdmin
      .from("user_blocks")
      .select("id")
      .or(
        `and(blocker_id.eq.${user.id},blocked_id.eq.${followingId}),and(blocker_id.eq.${followingId},blocked_id.eq.${user.id})`
      )
      .limit(1);

    if (blocks && blocks.length > 0) {
      return new Response(
        JSON.stringify({ error: "Cannot follow this user" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 6. Check if follow relationship already exists (including soft-deleted)
    const { data: existingFollow } = await supabaseAdmin
      .from("follows")
      .select("id, deleted_at")
      .eq("follower_id", user.id)
      .eq("following_id", followingId)
      .single();

    let followId: string;

    if (existingFollow) {
      // If soft-deleted, restore it by setting deleted_at to null
      if (existingFollow.deleted_at) {
        const { data: restoredFollow, error: restoreError } = await supabaseAdmin
          .from("follows")
          .update({ deleted_at: null, updated_at: new Date().toISOString() })
          .eq("id", existingFollow.id)
          .select("id")
          .single();

        if (restoreError) {
          throw restoreError;
        }

        followId = restoredFollow.id;
      } else {
        // Already following
        return new Response(
          JSON.stringify({ message: "Already following", followId: existingFollow.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Create new follow record
      const { data: newFollow, error: createError } = await supabaseAdmin
        .from("follows")
        .insert({
          follower_id: user.id,
          following_id: followingId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (createError) {
        throw createError;
      }

      followId = newFollow.id;
    }

    // 7. Create notification for the followed user
    const { data: followerUser } = await supabaseAdmin
      .from("users")
      .select("username")
      .eq("id", user.id)
      .single();

    const username = followerUser?.username || "Someone";

    await supabaseAdmin
      .from("notifications")
      .insert({
        recipient_id: followingId,
        actor_id: user.id,
        type: "FOLLOW",
        metadata: JSON.stringify({ followId }),
        title: "New Follower",
        body: `${username} started following you`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    // 8. Return success
    return new Response(
      JSON.stringify({
        success: true,
        followId,
        message: "Successfully followed user",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Follow user error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
