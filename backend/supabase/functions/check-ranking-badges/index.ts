// Edge Function: check-ranking-badges
// Description: Award ranking badges based on leaderboard percentile position.
//   Called after compute-leaderboards completes. Uses service role to read all entries.
//   Awards ONLY the highest qualifying threshold per user per leaderboard.
//   Updates last_maintained_at for users who still qualify (for rust system).
// Security: Service role or internal service key only (not user-callable)

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

// Thresholds from strictest to least strict (process in this order)
const RANKING_THRESHOLDS = [
  { percent: 1, prefix: "TOP_1" },
  { percent: 5, prefix: "TOP_5" },
  { percent: 10, prefix: "TOP_10" },
  { percent: 25, prefix: "TOP_25" },
] as const;

const LEADERBOARD_CODES = [
  "WEEKLY_VOLUME",
  "WEEKLY_WORKOUTS",
  "MONTHLY_XP",
  "MONTHLY_PRS",
  "ALL_TIME_XP",
  "ALL_TIME_WORKOUTS",
] as const;

// Minimum participants for meaningful percentile badges
const MIN_PARTICIPANTS = 10;

interface LeaderboardRow {
  id: string;
  code: string;
  last_total_participants: number;
  time_period: string;
}

interface LeaderboardEntryRow {
  user_id: string;
  rank: number;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getResponseHeaders(corsHeaders) });
  }

  try {
    // Verify this is a service-level call (not user-callable)
    const authHeader = req.headers.get("Authorization");
    const internalKey = Deno.env.get("INTERNAL_SERVICE_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const isServiceRole = authHeader?.includes(serviceRoleKey);
    const isInternalCall =
      internalKey && authHeader === `Bearer ${internalKey}`;

    if (!isServiceRole && !isInternalCall) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_REQUIRED" }),
        { status: 401, headers: getResponseHeaders(corsHeaders) }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceRoleKey
    );

    const now = new Date().toISOString();
    let badgesAwarded = 0;
    let badgesMaintained = 0;
    let leaderboardsProcessed = 0;
    const skippedLowParticipation: string[] = [];

    // Fetch all active leaderboards with participant counts
    const { data: leaderboards, error: lbError } = await supabaseAdmin
      .from("leaderboards")
      .select("id, code, last_total_participants, time_period")
      .eq("is_active", true);

    if (lbError) {
      console.error("Error fetching leaderboards:", lbError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to fetch leaderboards",
          details: lbError.message,
        }),
        { status: 500, headers: getResponseHeaders(corsHeaders) }
      );
    }

    for (const lb of (leaderboards as LeaderboardRow[]) || []) {
      const totalParticipants = lb.last_total_participants || 0;

      // Skip if too few participants for meaningful percentiles
      if (totalParticipants < MIN_PARTICIPANTS) {
        skippedLowParticipation.push(lb.code);
        continue;
      }

      leaderboardsProcessed++;

      // Track users already awarded a badge for THIS leaderboard
      // (to ensure only highest threshold is awarded)
      const awardedUsersForLb = new Set<string>();

      // Process thresholds from strictest (1%) to least strict (25%)
      for (const { percent, prefix } of RANKING_THRESHOLDS) {
        const rankCutoff = Math.max(
          1,
          Math.floor(totalParticipants * (percent / 100))
        );
        const achievementCode = `${prefix}_${lb.code}`;

        // Fetch entries within this rank cutoff
        // For periodic leaderboards, get current period entries
        let query = supabaseAdmin
          .from("leaderboard_entries")
          .select("user_id, rank")
          .eq("leaderboard_id", lb.id)
          .lte("rank", rankCutoff)
          .order("rank", { ascending: true });

        // For weekly/monthly, filter to most recent period
        // (all-time uses fixed epoch dates, so no filtering needed)
        if (lb.time_period === "WEEKLY" || lb.time_period === "MONTHLY") {
          // Get entries with the most recent period_start for this leaderboard
          const { data: latestEntry } = await supabaseAdmin
            .from("leaderboard_entries")
            .select("period_start")
            .eq("leaderboard_id", lb.id)
            .order("period_start", { ascending: false })
            .limit(1)
            .single();

          if (latestEntry) {
            query = query.eq("period_start", latestEntry.period_start);
          }
        }

        const { data: entries, error: entriesError } = await query;

        if (entriesError) {
          console.error(
            `Error fetching entries for ${achievementCode}:`,
            entriesError
          );
          continue;
        }

        for (const entry of (entries as LeaderboardEntryRow[]) || []) {
          // Skip if user already got a higher threshold badge for this leaderboard
          if (awardedUsersForLb.has(entry.user_id)) {
            continue;
          }

          // Mark user as awarded for this leaderboard (prevents lower thresholds)
          awardedUsersForLb.add(entry.user_id);

          // Try to insert badge (idempotent via UNIQUE constraint)
          const { error: insertError } = await supabaseAdmin
            .from("user_badges")
            .insert({
              user_id: entry.user_id,
              achievement_code: achievementCode,
              earned_at: now,
              is_rusty: false,
              last_maintained_at: now,
            });

          if (!insertError) {
            // Newly awarded badge
            badgesAwarded++;

            // Create notification for new badge
            const { data: achievement } = await supabaseAdmin
              .from("achievements")
              .select("title, description")
              .eq("code", achievementCode)
              .single();

            if (achievement) {
              await supabaseAdmin.from("notifications").insert({
                recipient_id: entry.user_id,
                type: "ACHIEVEMENT",
                title: "Ranking Badge Earned!",
                body: `You earned "${achievement.title}" - Top ${percent}%!`,
                metadata: JSON.stringify({
                  achievementCode,
                  rank: entry.rank,
                  totalParticipants,
                  earnedAt: now,
                }),
                created_at: now,
                updated_at: now,
              });
            }
          } else if (insertError.code === "23505") {
            // Badge already exists - update last_maintained_at (for rust system)
            await supabaseAdmin
              .from("user_badges")
              .update({
                last_maintained_at: now,
                is_rusty: false,
              })
              .eq("user_id", entry.user_id)
              .eq("achievement_code", achievementCode)
              .is("deleted_at", null);

            badgesMaintained++;
          } else {
            console.error(
              `Unexpected error inserting badge ${achievementCode} for user ${entry.user_id}:`,
              insertError
            );
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        leaderboards_processed: leaderboardsProcessed,
        badges_awarded: badgesAwarded,
        badges_maintained: badgesMaintained,
        skipped_low_participation: skippedLowParticipation,
      }),
      { headers: getResponseHeaders(corsHeaders) }
    );
  } catch (error) {
    console.error("check-ranking-badges error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, code: "INTERNAL_ERROR" }),
      { status: 500, headers: getResponseHeaders(corsHeaders) }
    );
  }
});
