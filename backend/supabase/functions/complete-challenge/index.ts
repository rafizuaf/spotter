// Edge Function: complete-challenge
// Phase 2G: Challenge Rewards System
// Description: Process XP rewards, badge unlocks, and notifications when challenge ends

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";
import { getResponseHeaders } from "../_shared/security.ts";

const getAllowedOrigin = (): string => {
  return Deno.env.get("FRONTEND_URL") || "https://spotter-app.com";
};

const corsHeaders = {
  "Access-Control-Allow-Origin": getAllowedOrigin(),
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// XP amounts (exempt from daily cap)
const XP_FIRST_PLACE = 200;
const XP_SECOND_PLACE = 100;
const XP_THIRD_PLACE = 50;
const XP_PARTICIPATION = 25;

interface CompleteChallengeRequest {
  challenge_id: string;
}

interface Participant {
  id: string;
  user_id: string;
  rank: number | null;
  current_score: number;
}

interface Challenge {
  id: string;
  title: string;
  status: string;
  challenge_type: string;
  rewards_processed_at: string | null;
}

/**
 * Get minimum participation threshold based on challenge type
 * Prevents abuse by requiring meaningful contribution
 */
function getMinimumParticipationThreshold(challengeType: string): number {
  switch (challengeType) {
    case "MOST_VOLUME":
      // Require at least 100kg total volume (one decent workout)
      return 100;
    case "MOST_WORKOUTS":
      // Require at least 1 workout
      return 1;
    case "MOST_SETS":
      // Require at least 1 set
      return 1;
    case "FIRST_TO_TARGET":
      // Winners already get winner XP, but if someone didn't win, require meaningful contribution
      // Use same threshold as MOST_VOLUME since it's volume-based
      return 100;
    default:
      // Default: require at least 1 (prevents zero contribution)
      return 1;
  }
}

/**
 * Update user level based on total XP
 * Level formula: level = floor(sqrt(totalXp / 100)) + 1
 */
async function updateUserLevel(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<void> {
  const { data: xpLogs } = await supabase
    .from("user_xp_logs")
    .select("xp_amount")
    .eq("user_id", userId);

  const totalXp =
    (xpLogs as Array<{ xp_amount: number }> | null)?.reduce(
      (sum, log) => sum + log.xp_amount,
      0
    ) || 0;

  const level = Math.floor(Math.sqrt(totalXp / 100)) + 1;
  const xpForNextLevel = Math.pow(level, 2) * 100;
  const xpToNextLevel = xpForNextLevel - totalXp;

  await supabase.from("user_levels").upsert(
    {
      user_id: userId,
      total_xp: totalXp,
      level,
      xp_to_next_level: Math.max(0, xpToNextLevel),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getResponseHeaders(corsHeaders) });
  }

  try {
    // SECURITY: This function should be called internally (by cron or other edge functions)
    // We'll accept either service role key or user auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header", code: "AUTH_REQUIRED" }),
        { status: 401, headers: getResponseHeaders(corsHeaders) }
      );
    }

    // Try to authenticate as user first (for FIRST_TO_TARGET calls)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Always use admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { challenge_id }: CompleteChallengeRequest = await req.json();

    if (!challenge_id || !UUID_REGEX.test(challenge_id)) {
      return new Response(
        JSON.stringify({
          error: "Invalid challenge_id",
          code: "INVALID_INPUT",
          field: "challenge_id",
        }),
        { status: 400, headers: getResponseHeaders(corsHeaders) }
      );
    }

    // Get challenge details (including challenge_type for threshold calculation)
    const { data: challenge, error: challengeError } = await supabaseAdmin
      .from("challenges")
      .select("id, title, status, challenge_type, rewards_processed_at")
      .eq("id", challenge_id)
      .is("deleted_at", null)
      .single();

    if (challengeError || !challenge) {
      return new Response(
        JSON.stringify({
          error: "Challenge not found",
          code: "NOT_FOUND",
          resource: "challenge",
        }),
        { status: 404, headers: getResponseHeaders(corsHeaders) }
      );
    }

    const typedChallenge = challenge as Challenge;

    // Verify challenge is COMPLETED
    if (typedChallenge.status !== "COMPLETED") {
      return new Response(
        JSON.stringify({
          error: "Challenge is not completed",
          code: "INVALID_STATE",
          current_status: typedChallenge.status,
        }),
        { status: 400, headers: getResponseHeaders(corsHeaders) }
      );
    }

    // Get minimum participation threshold for this challenge type
    const minThreshold = getMinimumParticipationThreshold(typedChallenge.challenge_type);

    // SECURITY: Check if rewards already processed (idempotency)
    // Also check if currently processing to prevent concurrent execution
    if (typedChallenge.rewards_processed_at) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Rewards already processed",
          processed_at: typedChallenge.rewards_processed_at,
          challenges_processed: 0,
        }),
        { headers: getResponseHeaders(corsHeaders) }
      );
    }

    // SECURITY: Mark as processing to prevent concurrent completion
    // Use conditional update: only update if rewards_processed_at is still null
    const { data: lockCheck, error: lockError } = await supabaseAdmin
      .from("challenges")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", challenge_id)
      .is("rewards_processed_at", null) // Only update if not already processed
      .select("id")
      .single();

    if (lockError || !lockCheck) {
      // Another process is already processing or already processed
      return new Response(
        JSON.stringify({
          success: false,
          message: "Challenge rewards are being processed or already processed",
          code: "CONFLICT",
        }),
        { status: 409, headers: getResponseHeaders(corsHeaders) }
      );
    }

    // Get all participants ordered by rank
    const { data: participants, error: participantsError } = await supabaseAdmin
      .from("challenge_participants")
      .select("id, user_id, rank, current_score")
      .eq("challenge_id", challenge_id)
      .eq("status", "ACTIVE")
      .is("deleted_at", null)
      .order("rank", { ascending: true, nullsFirst: false });

    if (participantsError) {
      console.error("Error fetching participants:", participantsError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch participants",
          code: "INTERNAL_ERROR",
        }),
        { status: 500, headers: getResponseHeaders(corsHeaders) }
      );
    }

    if (!participants || participants.length === 0) {
      // Mark as processed even if no participants
      await supabaseAdmin
        .from("challenges")
        .update({ rewards_processed_at: new Date().toISOString() })
        .eq("id", challenge_id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "No participants to reward",
          challenges_processed: 0,
        }),
        { headers: getResponseHeaders(corsHeaders) }
      );
    }

    // SECURITY: Require minimum 3 participants to prevent creator from gaming the system
    // Creator creates challenge, invites only themselves, wins easily for badges/XP
    if (participants.length < 3) {
      // Mark as processed but don't award rewards
      await supabaseAdmin
        .from("challenges")
        .update({ rewards_processed_at: new Date().toISOString() })
        .eq("id", challenge_id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Challenge requires minimum 3 participants to award rewards",
          participants_count: participants.length,
          rewards_awarded: false,
        }),
        { headers: getResponseHeaders(corsHeaders) }
      );
    }

    const typedParticipants = participants as Participant[];
    const rewardsAwarded: Array<{
      user_id: string;
      rank: number | null;
      xp_amount: number;
      source_type: string;
    }> = [];

    // Award XP to each participant
    for (const participant of typedParticipants) {
      const rank = participant.rank ?? 999; // Use 999 for unranked
      const score = Number(participant.current_score) || 0;
      let xpAmount = 0;
      let sourceType = "";

      // SECURITY: Require minimum contribution for participation XP
      // Top 3 always get rewards (they contributed enough to rank)
      // Others must have score > 0 to get participation XP (prevents abuse)
      if (rank === 1) {
        xpAmount = XP_FIRST_PLACE;
        sourceType = "CHALLENGE_WIN";
      } else if (rank === 2) {
        xpAmount = XP_SECOND_PLACE;
        sourceType = "CHALLENGE_PODIUM";
      } else if (rank === 3) {
        xpAmount = XP_THIRD_PLACE;
        sourceType = "CHALLENGE_PODIUM";
      } else if (score >= minThreshold) {
        // Only award participation XP if user met minimum contribution threshold
        // Prevents abuse: e.g., joining 10,000kg challenge and only lifting 1kg
        xpAmount = XP_PARTICIPATION;
        sourceType = "CHALLENGE_PARTICIPATION";
      } else {
        // Skip participants who didn't meet minimum threshold (joined but didn't contribute meaningfully)
        continue;
      }

      // Idempotency: source_id format "challenge:{challenge_id}:user:{user_id}"
      const sourceId = `challenge:${challenge_id}:user:${participant.user_id}`;

      // Check if already awarded
      const { data: existingLog } = await supabaseAdmin
        .from("user_xp_logs")
        .select("id")
        .eq("user_id", participant.user_id)
        .eq("source_type", sourceType)
        .eq("source_id", sourceId)
        .maybeSingle();

      if (!existingLog) {
        // Award XP (exempt from daily cap - this is bonus XP for competition)
        // SECURITY NOTE: Challenge XP is intentionally exempt from the 1000 XP daily cap
        // to reward competitive participation. However, we enforce idempotency via unique constraint
        // and check for existing logs to prevent duplicate awards.
        const { error: xpError } = await supabaseAdmin
          .from("user_xp_logs")
          .insert({
            user_id: participant.user_id,
            source_type: sourceType,
            source_id: sourceId,
            xp_amount: xpAmount,
          })
          .onConflict('user_id, source_type, source_id')
          .ignoreDuplicates(); // Handle race conditions gracefully

        if (!xpError) {
          rewardsAwarded.push({
            user_id: participant.user_id,
            rank,
            xp_amount: xpAmount,
            source_type: sourceType,
          });

          // Update user level
          await updateUserLevel(supabaseAdmin, participant.user_id);

          // Check for badge unlocks
          try {
            await supabaseAdmin.functions.invoke("unlock-badge", {
              body: { userId: participant.user_id },
            });
          } catch (badgeError) {
            console.error("Error unlocking badges:", badgeError);
            // Don't fail the whole operation if badge unlock fails
          }
        } else {
          console.error("Error awarding XP:", xpError);
        }
      }
    }

    // Create notifications only for participants who earned rewards
    const challengeTitle = typedChallenge.title;
    const now = new Date().toISOString();

    for (const reward of rewardsAwarded) {
      const participant = typedParticipants.find((p) => p.user_id === reward.user_id);
      if (!participant) continue;

      const rank = reward.rank ?? 999;
      let notificationTitle = "";
      let notificationBody = "";
      let notificationType = "";

      if (rank === 1) {
        notificationTitle = "Challenge Won!";
        notificationBody = `You won "${challengeTitle}"! +${XP_FIRST_PLACE} XP`;
        notificationType = "CHALLENGE_WIN";
      } else if (rank === 2) {
        notificationTitle = "Challenge Complete";
        notificationBody = `You placed #2 in "${challengeTitle}"! +${XP_SECOND_PLACE} XP`;
        notificationType = "CHALLENGE_PODIUM";
      } else if (rank === 3) {
        notificationTitle = "Challenge Complete";
        notificationBody = `You placed #3 in "${challengeTitle}"! +${XP_THIRD_PLACE} XP`;
        notificationType = "CHALLENGE_PODIUM";
      } else {
        notificationTitle = "Challenge Complete";
        notificationBody = `You finished #${rank} in "${challengeTitle}". +${XP_PARTICIPATION} XP`;
        notificationType = "CHALLENGE_COMPLETE";
      }

      await supabaseAdmin.from("notifications").insert({
        recipient_id: reward.user_id,
        actor_id: reward.user_id,
        type: notificationType,
        title: notificationTitle,
        body: notificationBody,
        metadata: {
          challenge_id: challenge_id,
          rank: rank,
          xp_awarded: reward.xp_amount,
        },
      });
    }

    // Mark challenge as rewards processed
    await supabaseAdmin
      .from("challenges")
      .update({ rewards_processed_at: now })
      .eq("id", challenge_id);

    return new Response(
      JSON.stringify({
        success: true,
        challenge_id: challenge_id,
        participants_rewarded: rewardsAwarded.length,
        total_participants: typedParticipants.length,
        rewards: rewardsAwarded,
      }),
      { headers: getResponseHeaders(corsHeaders) }
    );
  } catch (error) {
    console.error("complete-challenge error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, code: "INTERNAL_ERROR" }),
      { status: 500, headers: getResponseHeaders(corsHeaders) }
    );
  }
});
