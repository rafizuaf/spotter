// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SearchUsersRequest {
  query: string;
  limit?: number;
}

interface User {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
}

interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
}

interface UserBlock {
  id: string;
}

interface UserWithFollowStatus extends User {
  isFollowing: boolean;
  isFollower: boolean;
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
    const { query, limit = 20 }: SearchUsersRequest = await req.json();

    if (!query || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Search query is required" }),
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

    // 4. Get list of blocked user IDs (both directions)
    const { data: blocks } = await supabaseAdmin
      .from("user_blocks")
      .select("blocker_id, blocked_id")
      .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

    const blockedUserIds = new Set<string>();
    if (blocks) {
      for (const block of blocks as UserBlock[]) {
        const blockData = block as unknown as { blocker_id: string; blocked_id: string };
        if (blockData.blocker_id === user.id) {
          blockedUserIds.add(blockData.blocked_id);
        } else {
          blockedUserIds.add(blockData.blocker_id);
        }
      }
    }

    // 5. Search users by username (case-insensitive)
    const { data: users, error: searchError } = await supabaseAdmin
      .from("users")
      .select("id, username, avatar_url, bio")
      .ilike("username", `%${query}%`)
      .eq("account_status", "ACTIVE")
      .is("deleted_at", null)
      .neq("id", user.id) // Exclude current user
      .limit(limit);

    if (searchError) {
      throw searchError;
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ users: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Filter out blocked users
    const filteredUsers = (users as User[]).filter(
      (u) => !blockedUserIds.has(u.id)
    );

    if (filteredUsers.length === 0) {
      return new Response(
        JSON.stringify({ users: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Get follow status for each user
    const userIds = filteredUsers.map((u) => u.id);

    // Get follows where current user follows these users
    const { data: following } = await supabaseAdmin
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id)
      .in("following_id", userIds)
      .is("deleted_at", null);

    const followingIds = new Set(
      (following as Follow[] | null)?.map((f) => f.following_id) || []
    );

    // Get follows where these users follow current user
    const { data: followers } = await supabaseAdmin
      .from("follows")
      .select("follower_id")
      .eq("following_id", user.id)
      .in("follower_id", userIds)
      .is("deleted_at", null);

    const followerIds = new Set(
      (followers as Follow[] | null)?.map((f) => f.follower_id) || []
    );

    // 8. Combine user data with follow status
    const usersWithStatus: UserWithFollowStatus[] = filteredUsers.map((u) => ({
      ...u,
      isFollowing: followingIds.has(u.id),
      isFollower: followerIds.has(u.id),
    }));

    // 9. Return results
    return new Response(
      JSON.stringify({ users: usersWithStatus }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Search users error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
