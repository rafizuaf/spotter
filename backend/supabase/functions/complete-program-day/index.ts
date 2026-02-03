// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js";
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

interface CompleteProgramDayRequest {
  enrollmentId: string;
  dayIndex: number;
  workoutId?: string;
  lessonRead?: boolean;
  workoutCompleted?: boolean;
  skipped?: boolean;
  skipReason?: string;
}

interface UserProgramEnrollment {
  id: string;
  user_id: string;
  program_id: string;
  current_day_index: number;
  days_completed: number;
  completed_at: string | null;
}

interface BeginnerProgramDay {
  id: string;
  order_index: number;
}

interface UserProgramDayProgress {
  id: string;
  enrollment_id: string;
  program_day_id: string;
  lesson_read_at: string | null;
  workout_completed_at: string | null;
  skipped: boolean;
}

const TOTAL_PROGRAM_DAYS = 12;
const BADGE_CODE = "FIRST_30_DAYS_COMPLETE";

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getResponseHeaders(corsHeaders) });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: getResponseHeaders(corsHeaders),
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SECRET_KEY") ?? ""
    );

    // SECURITY: Rate limiting to prevent rapid day completion spam
    const rateLimit = await checkRateLimit(
      user.id,
      'complete-program-day',
      RATE_LIMITS['complete-program-day'].maxRequests,
      RATE_LIMITS['complete-program-day'].windowMs,
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
            "X-RateLimit-Limit": RATE_LIMITS['complete-program-day'].maxRequests.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.resetAt.toString(),
          },
        }
      );
    }

    const {
      enrollmentId,
      dayIndex,
      workoutId,
      lessonRead,
      workoutCompleted,
      skipped,
      skipReason,
    }: CompleteProgramDayRequest = await req.json();

    if (!enrollmentId || !dayIndex) {
      return new Response(
        JSON.stringify({ error: "Missing enrollmentId or dayIndex" }),
        {
          status: 400,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // Validate dayIndex range
    if (dayIndex < 1 || dayIndex > TOTAL_PROGRAM_DAYS) {
      return new Response(
        JSON.stringify({
          error: "Invalid dayIndex",
          message: `Day index must be between 1 and ${TOTAL_PROGRAM_DAYS}`,
        }),
        {
          status: 400,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // Get enrollment and verify ownership
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from("user_program_enrollments")
      .select("*")
      .eq("id", enrollmentId)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();

    if (enrollmentError || !enrollment) {
      return new Response(
        JSON.stringify({ error: "Enrollment not found" }),
        {
          status: 404,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    const typedEnrollment = enrollment as UserProgramEnrollment;

    // Check if already completed
    if (typedEnrollment.completed_at) {
      return new Response(
        JSON.stringify({
          error: "Program already completed",
          completedAt: typedEnrollment.completed_at,
        }),
        {
          status: 409,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // Get the program day by order_index
    const { data: programDay, error: dayError } = await supabaseAdmin
      .from("beginner_program_days")
      .select("id, order_index")
      .eq("program_id", typedEnrollment.program_id)
      .eq("order_index", dayIndex)
      .is("deleted_at", null)
      .single();

    if (dayError || !programDay) {
      return new Response(
        JSON.stringify({ error: "Program day not found" }),
        {
          status: 404,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    const typedDay = programDay as BeginnerProgramDay;

    // Get the day progress record
    const { data: dayProgress, error: progressError } = await supabaseAdmin
      .from("user_program_day_progress")
      .select("*")
      .eq("enrollment_id", enrollmentId)
      .eq("program_day_id", typedDay.id)
      .is("deleted_at", null)
      .single();

    if (progressError || !dayProgress) {
      return new Response(
        JSON.stringify({ error: "Day progress record not found" }),
        {
          status: 404,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    const typedProgress = dayProgress as UserProgramDayProgress;
    const now = new Date().toISOString();

    // Build update object
    const progressUpdate: Record<string, unknown> = {
      updated_at: now,
    };

    if (skipped) {
      progressUpdate.skipped = true;
      progressUpdate.skip_reason = skipReason || null;
    } else {
      if (lessonRead && !typedProgress.lesson_read_at) {
        progressUpdate.lesson_read_at = now;
      }
      if (workoutCompleted && !typedProgress.workout_completed_at) {
        // SECURITY: Validate workoutId when marking workout as completed
        // Prevents users from completing program days without actual workouts
        if (!workoutId) {
          return new Response(
            JSON.stringify({
              error: "workoutId is required when workoutCompleted is true",
              code: "INVALID_INPUT",
            }),
            {
              status: 400,
              headers: getResponseHeaders(corsHeaders),
            }
          );
        }

        // Verify workout exists, belongs to user, is completed, and has sets
        const { data: workout, error: workoutError } = await supabaseAdmin
          .from("workouts")
          .select("id, user_id, ended_at")
          .eq("id", workoutId)
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .single();

        if (workoutError || !workout) {
          return new Response(
            JSON.stringify({
              error: "Workout not found or does not belong to you",
              code: "NOT_FOUND",
            }),
            {
              status: 404,
              headers: getResponseHeaders(corsHeaders),
            }
          );
        }

        if (!workout.ended_at) {
          return new Response(
            JSON.stringify({
              error: "Workout must be completed (ended_at must be set)",
              code: "INVALID_INPUT",
            }),
            {
              status: 400,
              headers: getResponseHeaders(corsHeaders),
            }
          );
        }

        // Verify workout has at least 1 set
        const { count: setCount, error: setCountError } = await supabaseAdmin
          .from("workout_sets")
          .select("*", { count: "exact", head: true })
          .eq("workout_id", workoutId)
          .is("deleted_at", null);

        if (setCountError || (setCount ?? 0) === 0) {
          return new Response(
            JSON.stringify({
              error: "Workout must have at least 1 set",
              code: "INVALID_INPUT",
            }),
            {
              status: 400,
              headers: getResponseHeaders(corsHeaders),
            }
          );
        }

        progressUpdate.workout_completed_at = now;
        progressUpdate.workout_id = workoutId;
      }
    }

    // Update day progress
    await supabaseAdmin
      .from("user_program_day_progress")
      .update(progressUpdate)
      .eq("id", typedProgress.id);

    // Check if this day is now complete
    const wasAlreadyComplete =
      typedProgress.skipped ||
      (typedProgress.lesson_read_at && typedProgress.workout_completed_at);

    const isNowComplete =
      skipped ||
      ((lessonRead || typedProgress.lesson_read_at) &&
        (workoutCompleted || typedProgress.workout_completed_at));

    let programCompleted = false;
    let badgeUnlocked = false;

    // If day just became complete, update enrollment
    if (!wasAlreadyComplete && isNowComplete) {
      const newDaysCompleted = typedEnrollment.days_completed + 1;
      const newCurrentDayIndex = Math.min(
        dayIndex + 1,
        TOTAL_PROGRAM_DAYS
      );

      const enrollmentUpdate: Record<string, unknown> = {
        days_completed: newDaysCompleted,
        updated_at: now,
      };

      // Only advance current_day_index if completing the current day
      if (dayIndex === typedEnrollment.current_day_index) {
        enrollmentUpdate.current_day_index = newCurrentDayIndex;
      }

      // Check if program is complete (all 12 days done)
      if (newDaysCompleted >= TOTAL_PROGRAM_DAYS) {
        programCompleted = true;
        enrollmentUpdate.completed_at = now;
      }

      await supabaseAdmin
        .from("user_program_enrollments")
        .update(enrollmentUpdate)
        .eq("id", enrollmentId);

      // If program just completed, award badge
      if (programCompleted) {
        // Check if badge already exists (idempotency)
        const { data: existingBadge } = await supabaseAdmin
          .from("user_badges")
          .select("id")
          .eq("user_id", user.id)
          .eq("achievement_code", BADGE_CODE)
          .is("deleted_at", null)
          .single();

        if (!existingBadge) {
          // Award badge
          const { error: badgeError } = await supabaseAdmin
            .from("user_badges")
            .insert({
              user_id: user.id,
              achievement_code: BADGE_CODE,
              earned_at: now,
              is_rusty: false,
              last_maintained_at: now,
            });

          if (!badgeError) {
            badgeUnlocked = true;

            // Create notification for badge
            await supabaseAdmin.from("notifications").insert({
              recipient_id: user.id,
              type: "BADGE",
              title: "Achievement Unlocked!",
              body: "You completed the First 30 Days program! Welcome to the lifter's club.",
              metadata: JSON.stringify({
                badge_code: BADGE_CODE,
                badge_title: "First 30 Days Graduate",
              }),
            });
          }
        }
      }
    }

    // Get updated enrollment
    const { data: updatedEnrollment } = await supabaseAdmin
      .from("user_program_enrollments")
      .select("days_completed, current_day_index, completed_at")
      .eq("id", enrollmentId)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        dayIndex,
        dayComplete: isNowComplete,
        programCompleted,
        badgeUnlocked,
        enrollment: updatedEnrollment,
      }),
      {
        headers: getResponseHeaders(corsHeaders),
      }
    );
  } catch (error) {
    console.error("Complete program day error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: getResponseHeaders(corsHeaders),
    });
  }
});
