// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js";

// ============================================
// RevenueCat Webhook Handler
// ============================================
// This function processes webhook events from RevenueCat and updates
// the user_entitlements table. It's the ONLY way entitlements can be modified.
//
// Security:
// - Validates Authorization Bearer token against REVENUECAT_WEBHOOK_SECRET
// - Uses service role to bypass RLS (users cannot write to user_entitlements)
// - Logs all events to payment_webhooks table for audit
// - Idempotent via original_transaction_id

// CORS: This endpoint is called by RevenueCat servers, not the frontend
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

// Product ID to Tier mapping
const PRODUCT_TO_TIER: Record<string, "PRO" | "ELITE"> = {
  // Pro tier products
  spotter_pro_monthly: "PRO",
  spotter_pro_yearly: "PRO",
  spotter_pro_lifetime: "PRO",
  "com.spotter.pro.monthly": "PRO",
  "com.spotter.pro.yearly": "PRO",
  "com.spotter.pro.lifetime": "PRO",
  // Elite tier products
  spotter_elite_monthly: "ELITE",
  spotter_elite_yearly: "ELITE",
  spotter_elite_lifetime: "ELITE",
  "com.spotter.elite.monthly": "ELITE",
  "com.spotter.elite.yearly": "ELITE",
  "com.spotter.elite.lifetime": "ELITE",
};

// Lifetime product identifiers (never expire)
const LIFETIME_PRODUCTS = new Set([
  "spotter_pro_lifetime",
  "spotter_elite_lifetime",
  "com.spotter.pro.lifetime",
  "com.spotter.elite.lifetime",
]);

// RevenueCat webhook event types we care about
type WebhookEventType =
  | "INITIAL_PURCHASE"
  | "RENEWAL"
  | "CANCELLATION"
  | "UNCANCELLATION"
  | "EXPIRATION"
  | "BILLING_ISSUE"
  | "PRODUCT_CHANGE"
  | "SUBSCRIBER_ALIAS"
  | "TRANSFER"
  | "TEST";

interface RevenueCatWebhookPayload {
  event: {
    type: WebhookEventType;
    app_user_id: string; // This is our Supabase user ID
    product_id: string;
    original_transaction_id: string;
    expiration_at_ms?: number;
    is_trial_period?: boolean;
    purchased_at_ms?: number;
    store?: string;
  };
  api_version: string;
}

interface ProcessResult {
  success: boolean;
  message: string;
  tier?: string;
  validUntil?: string | null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight (shouldn't happen from RevenueCat, but just in case)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Create Supabase admin client (bypasses RLS)
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SECRET_KEY") ?? ""
  );

  try {
    // ============================================
    // 1. Verify Authorization
    // ============================================
    const authHeader = req.headers.get("Authorization");
    const expectedToken = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");

    if (!expectedToken) {
      console.error("REVENUECAT_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // RevenueCat sends: Authorization: Bearer <your-secret>
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      console.warn("Unauthorized webhook attempt");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================
    // 2. Parse Webhook Payload
    // ============================================
    const payload: RevenueCatWebhookPayload = await req.json();
    const { event } = payload;

    console.log(`Processing ${event.type} for user ${event.app_user_id}`);

    // ============================================
    // 3. Log to payment_webhooks (Audit Trail)
    // ============================================
    const { error: logError } = await supabaseAdmin
      .from("payment_webhooks")
      .insert({
        provider: "REVENUECAT",
        event_type: event.type,
        payload: payload,
        processing_status: "PENDING",
        received_at: new Date().toISOString(),
      });

    if (logError) {
      console.error("Failed to log webhook:", logError);
      // Don't fail the request, continue processing
    }

    // ============================================
    // 4. Validate User Exists
    // ============================================
    const userId = event.app_user_id;

    // Check if this is a valid Supabase user ID
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      console.error(`User not found: ${userId}`);
      // Return 200 anyway to prevent RevenueCat from retrying indefinitely
      // The event is logged for investigation
      return new Response(
        JSON.stringify({
          success: false,
          message: "User not found",
          logged: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ============================================
    // 5. Process Event by Type
    // ============================================
    let result: ProcessResult;

    switch (event.type) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "UNCANCELLATION":
        result = await handlePurchaseOrRenewal(supabaseAdmin, event);
        break;

      case "CANCELLATION":
        result = await handleCancellation(supabaseAdmin, event);
        break;

      case "EXPIRATION":
        result = await handleExpiration(supabaseAdmin, event);
        break;

      case "PRODUCT_CHANGE":
        result = await handleProductChange(supabaseAdmin, event);
        break;

      case "BILLING_ISSUE":
        result = await handleBillingIssue(supabaseAdmin, event);
        break;

      case "TEST":
        result = { success: true, message: "Test event received" };
        break;

      default:
        result = { success: true, message: `Event ${event.type} logged but not processed` };
    }

    // ============================================
    // 6. Update Webhook Log Status
    // ============================================
    await supabaseAdmin
      .from("payment_webhooks")
      .update({
        processing_status: result.success ? "PROCESSED" : "FAILED",
        error_message: result.success ? null : result.message,
      })
      .eq("payload->event->original_transaction_id", event.original_transaction_id)
      .eq("processing_status", "PENDING");

    // ============================================
    // 7. Log to subscription_history
    // ============================================
    if (
      event.type === "INITIAL_PURCHASE" ||
      event.type === "RENEWAL" ||
      event.type === "EXPIRATION"
    ) {
      await logSubscriptionHistory(supabaseAdmin, event, result);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, success: false }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Handle new purchase or renewal
 */
async function handlePurchaseOrRenewal(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  event: RevenueCatWebhookPayload["event"]
): Promise<ProcessResult> {
  const tier = PRODUCT_TO_TIER[event.product_id];

  if (!tier) {
    console.warn(`Unknown product_id: ${event.product_id}`);
    return {
      success: false,
      message: `Unknown product: ${event.product_id}`,
    };
  }

  // Determine validity period
  const isLifetime = LIFETIME_PRODUCTS.has(event.product_id);
  const validUntil = isLifetime
    ? null // NULL = never expires
    : event.expiration_at_ms
    ? new Date(event.expiration_at_ms).toISOString()
    : null;

  const isTrial = event.is_trial_period ?? false;
  const source = isLifetime ? "LIFETIME" : "REVENUECAT";

  // Upsert entitlement (idempotent via user_id primary key)
  const { error } = await supabase.from("user_entitlements").upsert(
    {
      user_id: event.app_user_id,
      tier,
      is_trial: isTrial,
      trial_ends_at: isTrial && event.expiration_at_ms
        ? new Date(event.expiration_at_ms).toISOString()
        : null,
      valid_until: validUntil,
      source,
      original_transaction_id: event.original_transaction_id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("Failed to update entitlement:", error);
    return { success: false, message: error.message };
  }

  console.log(`Updated entitlement for ${event.app_user_id}: ${tier}`);
  return {
    success: true,
    message: `Entitlement updated to ${tier}`,
    tier,
    validUntil,
  };
}

/**
 * Handle subscription cancellation
 * User keeps access until the end of their billing period
 */
async function handleCancellation(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  event: RevenueCatWebhookPayload["event"]
): Promise<ProcessResult> {
  // Keep the tier but ensure valid_until is set to period end
  const validUntil = event.expiration_at_ms
    ? new Date(event.expiration_at_ms).toISOString()
    : null;

  const { error } = await supabase
    .from("user_entitlements")
    .update({
      valid_until: validUntil,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", event.app_user_id);

  if (error) {
    console.error("Failed to update cancellation:", error);
    return { success: false, message: error.message };
  }

  console.log(`Marked ${event.app_user_id} as cancelled, valid until ${validUntil}`);
  return {
    success: true,
    message: "Subscription marked as cancelled",
    validUntil,
  };
}

/**
 * Handle subscription expiration
 * Reverts user to FREE tier
 */
async function handleExpiration(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  event: RevenueCatWebhookPayload["event"]
): Promise<ProcessResult> {
  const { error } = await supabase
    .from("user_entitlements")
    .update({
      tier: "FREE",
      is_trial: false,
      trial_ends_at: null,
      valid_until: new Date().toISOString(), // Mark as expired
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", event.app_user_id);

  if (error) {
    console.error("Failed to expire entitlement:", error);
    return { success: false, message: error.message };
  }

  console.log(`Expired ${event.app_user_id} to FREE tier`);
  return {
    success: true,
    message: "Subscription expired, reverted to FREE",
    tier: "FREE",
  };
}

/**
 * Handle product change (upgrade/downgrade)
 */
async function handleProductChange(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  event: RevenueCatWebhookPayload["event"]
): Promise<ProcessResult> {
  // Treat like a new purchase with the new product
  return handlePurchaseOrRenewal(supabase, event);
}

/**
 * Handle billing issue
 * Log but don't immediately downgrade (RevenueCat handles grace period)
 */
async function handleBillingIssue(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  event: RevenueCatWebhookPayload["event"]
): Promise<ProcessResult> {
  console.warn(`Billing issue for ${event.app_user_id}, product ${event.product_id}`);

  // Don't change entitlement - RevenueCat will send EXPIRATION if it fails
  // Just log for monitoring
  return {
    success: true,
    message: "Billing issue logged, awaiting resolution",
  };
}

/**
 * Log to subscription_history for audit trail
 */
async function logSubscriptionHistory(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  event: RevenueCatWebhookPayload["event"],
  result: ProcessResult
): Promise<void> {
  const status =
    event.type === "EXPIRATION"
      ? "EXPIRED"
      : event.is_trial_period
      ? "TRIAL"
      : "ACTIVE";

  await supabase.from("subscription_history").insert({
    user_id: event.app_user_id,
    provider: "REVENUECAT",
    original_transaction_id: event.original_transaction_id,
    status,
    purchase_date: event.purchased_at_ms
      ? new Date(event.purchased_at_ms).toISOString()
      : null,
    expiry_date: event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : null,
  });
}
