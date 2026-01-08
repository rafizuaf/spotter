// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface SendPushRequest {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  priority?: "default" | "normal" | "high";
}

interface ExpoPushReceipt {
  status: "ok" | "error";
  message?: string;
  details?: {
    error?: string;
  };
}

interface ExpoPushResponse {
  data: ExpoPushReceipt[];
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // This function can be called internally with service key
    // or by an authenticated user for their own devices
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SECRET_KEY") ?? ""
    );

    // Parse request
    const { userId, title, body, data }: SendPushRequest = await req.json();

    if (!userId || !title) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, title" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user's push tokens
    const { data: devices, error: devicesError } = await supabaseAdmin
      .from("push_devices")
      .select("id, expo_push_token")
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (devicesError) {
      console.error("Error fetching devices:", devicesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch devices" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!devices || devices.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          reason: "No registered devices",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter valid Expo push tokens
    const validTokens = devices
      .filter(
        (d) =>
          d.expo_push_token &&
          d.expo_push_token.startsWith("ExponentPushToken[")
      )
      .map((d) => ({ id: d.id, token: d.expo_push_token }));

    if (validTokens.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          reason: "No valid Expo push tokens",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare push messages
    const messages: ExpoPushMessage[] = validTokens.map(({ token }) => ({
      to: token,
      title,
      body,
      data: data || {},
      sound: "default",
      priority: "high",
    }));

    // Send to Expo Push API
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Expo Push API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send push notification" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result: ExpoPushResponse = await response.json();
    const receipts = result.data;

    // Handle failed/invalid tokens
    const invalidTokenDeviceIds: string[] = [];
    receipts.forEach((receipt, index) => {
      if (receipt.status === "error") {
        const errorType = receipt.details?.error;
        // Mark device for removal if token is invalid
        if (
          errorType === "DeviceNotRegistered" ||
          errorType === "InvalidCredentials"
        ) {
          invalidTokenDeviceIds.push(validTokens[index].id);
        }
        console.error(`Push failed for token ${index}:`, receipt.message);
      }
    });

    // Soft delete invalid token devices
    if (invalidTokenDeviceIds.length > 0) {
      const now = new Date().toISOString();
      await supabaseAdmin
        .from("push_devices")
        .update({ deleted_at: now, updated_at: now })
        .in("id", invalidTokenDeviceIds);
    }

    const sentCount = receipts.filter((r) => r.status === "ok").length;

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        total: validTokens.length,
        invalidRemoved: invalidTokenDeviceIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send push notification error:", error);
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
