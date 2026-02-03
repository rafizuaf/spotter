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

interface EnrollProgramRequest {
  programCode: string;
}

interface BeginnerProgram {
  id: string;
  code: string;
  title: string;
  duration_weeks: number;
  workouts_per_week: number;
}

interface BeginnerProgramDay {
  id: string;
  program_id: string;
  order_index: number;
}

interface UserProgramEnrollment {
  id: string;
  user_id: string;
  program_id: string;
  current_day_index: number;
  days_completed: number;
  started_at: string;
  completed_at: string | null;
}

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

    // Create client with user's auth token to get user ID
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

    // Create admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SECRET_KEY") ?? ""
    );

    // SECURITY: Rate limiting to prevent enrollment spam
    const rateLimit = await checkRateLimit(
      user.id,
      'enroll-program',
      RATE_LIMITS['enroll-program'].maxRequests,
      RATE_LIMITS['enroll-program'].windowMs,
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
            "X-RateLimit-Limit": RATE_LIMITS['enroll-program'].maxRequests.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.resetAt.toString(),
          },
        }
      );
    }

    const { programCode }: EnrollProgramRequest = await req.json();

    if (!programCode) {
      return new Response(
        JSON.stringify({ error: "Missing programCode" }),
        {
          status: 400,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // Get the program by code
    const { data: program, error: programError } = await supabaseAdmin
      .from("beginner_programs")
      .select("id, code, title, duration_weeks, workouts_per_week")
      .eq("code", programCode)
      .eq("is_active", true)
      .is("deleted_at", null)
      .single();

    if (programError || !program) {
      return new Response(
        JSON.stringify({ error: "Program not found" }),
        {
          status: 404,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    const typedProgram = program as BeginnerProgram;

    // SECURITY: Check subscription tier for program access
    // Beginner programs are FREE, but we validate tier anyway for future-proofing
    const { data: entitlement } = await supabaseAdmin
      .from("user_entitlements")
      .select("tier, valid_until")
      .eq("user_id", user.id)
      .single();

    const tier = entitlement?.tier ?? "FREE";
    const isExpired = entitlement?.valid_until && new Date(entitlement.valid_until) < new Date();
    const effectiveTier = isExpired ? "FREE" : tier;

    // Note: Beginner programs are FREE, but if we add required_tier column in future,
    // we would check it here. For now, all beginner programs are accessible to all tiers.

    // Check if user is already enrolled in this program
    const { data: existingEnrollment } = await supabaseAdmin
      .from("user_program_enrollments")
      .select("id, completed_at")
      .eq("user_id", user.id)
      .eq("program_id", typedProgram.id)
      .is("deleted_at", null)
      .single();

    if (existingEnrollment) {
      const typedEnrollment = existingEnrollment as UserProgramEnrollment;
      // User is already enrolled
      if (!typedEnrollment.completed_at) {
        return new Response(
          JSON.stringify({
            error: "Already enrolled",
            message: "You are already enrolled in this program",
            enrollmentId: typedEnrollment.id,
          }),
          {
            status: 409,
            headers: getResponseHeaders(corsHeaders),
          }
        );
      }
      // If completed, allow re-enrollment by soft deleting the old one
      await supabaseAdmin
        .from("user_program_enrollments")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", typedEnrollment.id);
    }

    // Get all program days
    const { data: programDays, error: daysError } = await supabaseAdmin
      .from("beginner_program_days")
      .select("id, program_id, order_index")
      .eq("program_id", typedProgram.id)
      .is("deleted_at", null)
      .order("order_index", { ascending: true });

    if (daysError || !programDays || programDays.length === 0) {
      return new Response(
        JSON.stringify({ error: "Program has no days configured" }),
        {
          status: 500,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    const typedDays = programDays as BeginnerProgramDay[];

    // Create enrollment
    const { data: enrollment, error: enrollError } = await supabaseAdmin
      .from("user_program_enrollments")
      .insert({
        user_id: user.id,
        program_id: typedProgram.id,
        current_day_index: 1,
        days_completed: 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (enrollError || !enrollment) {
      console.error("Error creating enrollment:", enrollError);
      return new Response(
        JSON.stringify({ error: "Failed to create enrollment" }),
        {
          status: 500,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    const typedEnrollment = enrollment as UserProgramEnrollment;

    // Create day progress records for all days
    const dayProgressRecords = typedDays.map((day) => ({
      enrollment_id: typedEnrollment.id,
      program_day_id: day.id,
      skipped: false,
    }));

    const { error: progressError } = await supabaseAdmin
      .from("user_program_day_progress")
      .insert(dayProgressRecords);

    if (progressError) {
      console.error("Error creating day progress records:", progressError);
      // Rollback enrollment
      await supabaseAdmin
        .from("user_program_enrollments")
        .delete()
        .eq("id", typedEnrollment.id);

      return new Response(
        JSON.stringify({ error: "Failed to create day progress records" }),
        {
          status: 500,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        enrollment: {
          id: typedEnrollment.id,
          programId: typedProgram.id,
          programTitle: typedProgram.title,
          currentDayIndex: 1,
          totalDays: typedDays.length,
          startedAt: typedEnrollment.started_at,
        },
      }),
      {
            headers: getResponseHeaders(corsHeaders),
      }
    );
  } catch (error) {
    console.error("Enroll program error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
            headers: getResponseHeaders(corsHeaders),
    });
  }
});
