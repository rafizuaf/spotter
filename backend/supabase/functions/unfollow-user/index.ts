// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UnfollowUserRequest {
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
    const { followingId }: UnfollowUserRequest = await req.json();

    if (!followingId) {
      return new Response(
        JSON.stringify({ error: "Missing followingId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Use admin client for business logic
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SECRET_KEY") ?? ""
    );

    // 4. Find the follow relationship
    const { data: existingFollow } = await supabaseAdmin
      .from("follows")
      .select("id, deleted_at")
      .eq("follower_id", user.id)
      .eq("following_id", followingId)
      .single();

    if (!existingFollow) {
      return new Response(
        JSON.stringify({ error: "Not following this user" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 5. Check if already unfollowed (soft-deleted)
    if (existingFollow.deleted_at) {
      return new Response(
        JSON.stringify({ message: "Already unfollowed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Soft delete the follow record
    const { error: deleteError } = await supabaseAdmin
      .from("follows")
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingFollow.id);

    if (deleteError) {
      throw deleteError;
    }

    // 7. Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: "Successfully unfollowed user",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unfollow user error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
