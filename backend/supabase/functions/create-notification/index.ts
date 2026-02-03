// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js";
import { getResponseHeaders } from "../_shared/security.ts";

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

type NotificationType =
  | "FOLLOW"
  | "LIKE"
  | "COMMENT"
  | "ACHIEVEMENT"
  | "PR"
  | "STREAK"
  | "SYSTEM"
  | "LEVEL_UP";

interface CreateNotificationRequest {
  recipientId: string;
  actorId?: string;
  type: NotificationType;
  metadata?: Record<string, unknown>;
  title: string;
  body?: string;
  sendPush?: boolean;
}

// C6: Updated notification categories
interface NotificationPreferences {
  WORKOUT_PR?: boolean; // PR notifications
  BADGES_LEVELS?: boolean; // Badge unlocks and level ups
  CHALLENGES?: boolean; // Challenge-related notifications
  SOCIAL?: boolean; // Follows, reactions, etc.
  REMINDERS?: boolean; // Workout reminders
  // Legacy keys (for backward compatibility)
  follow?: boolean;
  achievement?: boolean;
  pr?: boolean;
  streak?: boolean;
  system?: boolean;
}

// Default preferences if user hasn't set any
const defaultPreferences: NotificationPreferences = {
  WORKOUT_PR: true,
  BADGES_LEVELS: true,
  CHALLENGES: true,
  SOCIAL: true,
  REMINDERS: true,
};

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

    // 2. Parse request
    const {
      recipientId,
      actorId,
      type,
      metadata,
      title,
      body,
      sendPush = true,
    }: CreateNotificationRequest = await req.json();

    if (!recipientId || !type || !title) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: recipientId, type, title",
        }),
        {
          status: 400,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // SECURITY: Validate input length to prevent abuse
    if (title.length > 200) {
      return new Response(
        JSON.stringify({ error: "Title too long (max 200 characters)" }),
        {
          status: 400,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    if (body && body.length > 500) {
      return new Response(
        JSON.stringify({ error: "Body too long (max 500 characters)" }),
        {
          status: 400,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // 3. Use admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SECRET_KEY") ?? ""
    );

    // 4. Get user's notification preferences
    const { data: userSettings } = await supabaseAdmin
      .from("user_settings")
      .select("notification_preferences")
      .eq("user_id", recipientId)
      .single();

    let preferences = defaultPreferences;
    if (userSettings?.notification_preferences) {
      try {
        const parsed =
          typeof userSettings.notification_preferences === "string"
            ? JSON.parse(userSettings.notification_preferences)
            : userSettings.notification_preferences;
        preferences = { ...defaultPreferences, ...parsed };
      } catch {
        // Use defaults if parsing fails
      }
    }

    // C6: Map notification type to category
    const typeToCategory: Record<string, keyof NotificationPreferences> = {
      FOLLOW: "SOCIAL",
      LIKE: "SOCIAL",
      COMMENT: "SOCIAL",
      PR: "WORKOUT_PR",
      ACHIEVEMENT: "BADGES_LEVELS",
      LEVEL_UP: "BADGES_LEVELS",
      STREAK: "BADGES_LEVELS",
      SYSTEM: "REMINDERS", // System notifications treated as reminders
      // Legacy mapping (for backward compatibility)
      follow: "SOCIAL",
      achievement: "BADGES_LEVELS",
      pr: "WORKOUT_PR",
      streak: "BADGES_LEVELS",
      system: "REMINDERS",
    };

    const category = typeToCategory[type] || "REMINDERS";

    // C6: Check if user wants this category of notification
    // Support both new category keys and legacy keys for backward compatibility
    const isEnabled =
      preferences[category] !== false && // New category system (defaults to true if not set)
      (preferences[category] === true || // Explicitly enabled
        (category === "SOCIAL" && preferences.follow !== false) || // Legacy: follow
        (category === "WORKOUT_PR" && preferences.pr !== false) || // Legacy: pr
        (category === "BADGES_LEVELS" && preferences.achievement !== false) || // Legacy: achievement
        (category === "REMINDERS" && preferences.system !== false)); // Legacy: system

    if (!isEnabled) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: "User has disabled this notification category",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Check for duplicate notification in last 5 minutes (idempotency)
    const now = new Date().toISOString();
    const metadataStr = metadata ? JSON.stringify(metadata) : "{}";
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: existingNotification } = await supabaseAdmin
      .from("notifications")
      .select("id")
      .eq("recipient_id", recipientId)
      .eq("type", type)
      .eq("metadata", metadataStr)
      .gte("created_at", fiveMinutesAgo)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingNotification) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: "Duplicate notification",
          notificationId: existingNotification.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8. Insert notification
    const { data: notification, error: insertError } = await supabaseAdmin
      .from("notifications")
      .insert({
        recipient_id: recipientId,
        actor_id: actorId || null,
        type,
        metadata: metadataStr,
        title,
        body: body || null,
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error creating notification:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create notification" }),
        {
          status: 500,
          headers: getResponseHeaders(corsHeaders),
        }
      );
    }

    // 9. Optionally send push notification
    let pushSent = false;
    if (sendPush) {
      try {
        const pushResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push-notification`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: recipientId,
              title,
              body,
              data: metadata,
              notificationType: type, // C6: Pass notification type for category filtering
            }),
          }
        );
        pushSent = pushResponse.ok;
      } catch (error) {
        console.error("Error sending push notification:", error);
        // Don't fail the whole operation if push fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationId: notification.id,
        pushSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Create notification error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: getResponseHeaders(corsHeaders),
      }
    );
  }
});
