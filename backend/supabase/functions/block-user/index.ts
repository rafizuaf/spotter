// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BlockUserRequest {
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Parse request
    const { blockedId }: BlockUserRequest = await req.json();

    if (!blockedId) {
      return new Response(
        JSON.stringify({ error: "Missing blockedId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Prevent self-block
    if (user.id === blockedId) {
      return new Response(
        JSON.stringify({ error: "Cannot block yourself" }),
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

    // 5. Check if already blocked
    const { data: existingBlock } = await supabaseAdmin
      .from("user_blocks")
      .select("id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", blockedId)
      .single();

    if (existingBlock) {
      return new Response(
        JSON.stringify({ message: "User already blocked", blockId: existingBlock.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Create block record (note: no soft delete for blocks)
    const { data: newBlock, error: blockError } = await supabaseAdmin
      .from("user_blocks")
      .insert({
        blocker_id: user.id,
        blocked_id: blockedId,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (blockError) {
      throw blockError;
    }

    // 7. Soft delete all follow relationships (both directions)
    const now = new Date().toISOString();

    // Delete follows where current user follows blocked user
    await supabaseAdmin
      .from("follows")
      .update({ deleted_at: now, updated_at: now })
      .eq("follower_id", user.id)
      .eq("following_id", blockedId)
      .is("deleted_at", null);

    // Delete follows where blocked user follows current user
    await supabaseAdmin
      .from("follows")
      .update({ deleted_at: now, updated_at: now })
      .eq("follower_id", blockedId)
      .eq("following_id", user.id)
      .is("deleted_at", null);

    // 8. Return success
    return new Response(
      JSON.stringify({
        success: true,
        blockId: newBlock.id,
        message: "Successfully blocked user",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Block user error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
