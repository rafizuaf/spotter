// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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

interface NotificationPreferences {
  follow: boolean;
  achievement: boolean;
  pr: boolean;
  streak: boolean;
  system: boolean;
}

// Default preferences if user hasn't set any
const defaultPreferences: NotificationPreferences = {
  follow: true,
  achievement: true,
  pr: true,
  streak: true,
  system: true,
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    // 5. Map notification type to preference key
    const typeToPreferenceKey: Record<string, keyof NotificationPreferences> = {
      FOLLOW: "follow",
      ACHIEVEMENT: "achievement",
      PR: "pr",
      STREAK: "streak",
      SYSTEM: "system",
      LEVEL_UP: "achievement",
      LIKE: "follow",
      COMMENT: "follow",
    };

    const preferenceKey = typeToPreferenceKey[type] || "system";

    // 6. Check if user wants this type of notification
    if (!preferences[preferenceKey]) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: "User has disabled this notification type",
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
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get(
                "SUPABASE_SERVICE_ROLE_KEY"
              )}`,
            },
            body: JSON.stringify({
              userId: recipientId,
              title,
              body: body || "",
              data: { notificationId: notification.id, type, ...metadata },
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
