// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Badge Rust System
 *
 * Badges can become "rusty" if the user hasn't maintained the activity
 * that earned them. This encourages continued engagement without being punishing.
 *
 * Rust thresholds are generous - we want to reward consistency, not create anxiety.
 */

// Rust thresholds per badge type (in days)
const RUST_THRESHOLDS: Record<string, number> = {
  // Workout count badges - rust after 14 days of inactivity
  FIRST_WORKOUT: 14,
  WORKOUT_10: 14,
  WORKOUT_50: 14,
  WORKOUT_100: 14,
  WORKOUT_250: 14,
  WORKOUT_500: 14,

  // PR badges - rust after 30 days (PRs are harder to maintain)
  PR_FIRST: 30,
  PR_10: 30,
  PR_50: 30,
  PR_100: 30,

  // Weekly streak badges - rust after missing 2 consecutive weeks
  WEEKLY_3_x4: 14,
  WEEKLY_3_x8: 14,
  WEEKLY_3_x12: 14,
  WEEKLY_4_x4: 14,
  WEEKLY_4_x8: 14,
  WEEKLY_4_x12: 14,
  CONSISTENCY_26: 14,
  CONSISTENCY_52: 14,

  // Perfect week badges - never rust (single achievement)
  PERFECT_WEEK_5: -1, // -1 means no rust
  PERFECT_WEEK_6: -1,

  // Muscle group badges - rust after 21 days without training that group
  CHEST_MASTER: 21,
  BACK_MASTER: 21,
  LEG_MASTER: 21,
  SHOULDER_MASTER: 21,
  ARM_MASTER: 21,
  CORE_MASTER: 21,

  // Volume badges - never rust (cumulative achievements)
  VOLUME_1000KG: -1,
  VOLUME_10000KG: -1,
  VOLUME_100000KG: -1,
  VOLUME_1000000KG: -1,

  // Default for unknown badges
  DEFAULT: 30,
};

interface CheckRustRequest {
  userId: string;
}

interface UserBadge {
  id: string;
  user_id: string;
  achievement_code: string;
  is_rusty: boolean;
  last_maintained_at: string | null;
}

interface RustUpdate {
  badgeCode: string;
  wasRusty: boolean;
  isNowRusty: boolean;
  daysSinceActivity: number;
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId }: CheckRustRequest = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all non-rusty badges for this user
    const { data: badges, error: badgesError } = await supabaseAdmin
      .from("user_badges")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (badgesError) throw badgesError;

    if (!badges || badges.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No badges to check" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's last workout date
    const { data: lastWorkout } = await supabaseAdmin
      .from("workouts")
      .select("ended_at")
      .eq("user_id", userId)
      .not("ended_at", "is", null)
      .is("deleted_at", null)
      .order("ended_at", { ascending: false })
      .limit(1)
      .single();

    const lastWorkoutDate = lastWorkout?.ended_at
      ? new Date(lastWorkout.ended_at)
      : null;
    const now = new Date();

    const rustUpdates: RustUpdate[] = [];
    const polishedBadges: string[] = [];
    const newlyRustedBadges: string[] = [];

    for (const badge of badges as UserBadge[]) {
      const threshold =
        RUST_THRESHOLDS[badge.achievement_code] ?? RUST_THRESHOLDS.DEFAULT;

      // Skip badges that don't rust
      if (threshold === -1) continue;

      // Calculate days since last activity
      const lastActivity = badge.last_maintained_at
        ? new Date(badge.last_maintained_at)
        : lastWorkoutDate;

      if (!lastActivity) {
        // No activity recorded - badge should rust if threshold exceeded since earning
        continue;
      }

      const daysSinceActivity = Math.floor(
        (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
      );

      const shouldBeRusty = daysSinceActivity > threshold;

      if (shouldBeRusty !== badge.is_rusty) {
        // Update badge rust status
        await supabaseAdmin
          .from("user_badges")
          .update({
            is_rusty: shouldBeRusty,
            updated_at: now.toISOString(),
          })
          .eq("id", badge.id);

        rustUpdates.push({
          badgeCode: badge.achievement_code,
          wasRusty: badge.is_rusty,
          isNowRusty: shouldBeRusty,
          daysSinceActivity,
        });

        if (shouldBeRusty) {
          newlyRustedBadges.push(badge.achievement_code);
        } else {
          polishedBadges.push(badge.achievement_code);
        }
      }
    }

    // If badges just became rusty, create a notification
    if (newlyRustedBadges.length > 0) {
      await supabaseAdmin.from("notifications").insert({
        recipient_id: userId,
        type: "BADGE_RUST",
        title: "Badges Need Attention",
        body: `${newlyRustedBadges.length} badge${newlyRustedBadges.length > 1 ? "s have" : " has"} become rusty. Work out to polish them!`,
        metadata: JSON.stringify({ badges: newlyRustedBadges }),
      });
    }

    // If badges were polished, create a positive notification
    if (polishedBadges.length > 0) {
      await supabaseAdmin.from("notifications").insert({
        recipient_id: userId,
        type: "BADGE_POLISHED",
        title: "Badges Polished!",
        body: `${polishedBadges.length} badge${polishedBadges.length > 1 ? "s are" : " is"} shiny again!`,
        metadata: JSON.stringify({ badges: polishedBadges }),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkedBadges: badges.length,
        updates: rustUpdates,
        newlyRusted: newlyRustedBadges,
        polished: polishedBadges,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Check badge rust error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Polish a badge (called when user completes relevant activity)
 * This resets the rust timer
 */
export async function polishBadge(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  achievementCode: string
): Promise<void> {
  await supabase
    .from("user_badges")
    .update({
      is_rusty: false,
      last_maintained_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("achievement_code", achievementCode);
}
