-- ============================================
-- Migration 00023: Remove Legacy Subscription Fields
-- ============================================
-- Phase 2F Security: Remove subscription_tier, is_trial_period, subscription_expires_at
-- from users table. These fields have been migrated to user_entitlements table
-- which is server-controlled and secure (READ-ONLY for users via RLS).
--
-- SECURITY NOTE: The user_entitlements table is the source of truth for subscription
-- status. Only the payment-webhook edge function (using service role) can write to it.
-- Users cannot modify their entitlements, preventing subscription tampering.

-- ============================================
-- Remove Legacy Columns from users table
-- ============================================

-- Drop the subscription_tier column (replaced by user_entitlements.tier)
ALTER TABLE users DROP COLUMN IF EXISTS subscription_tier;

-- Drop the is_trial_period column (replaced by user_entitlements.is_trial)
ALTER TABLE users DROP COLUMN IF EXISTS is_trial_period;

-- Drop the subscription_expires_at column (replaced by user_entitlements.valid_until)
ALTER TABLE users DROP COLUMN IF EXISTS subscription_expires_at;

-- ============================================
-- Drop Legacy ENUM Type (if no longer used)
-- ============================================
-- Note: subscription_tier ENUM was only used in users table
-- Since we're removing the column, we can drop the ENUM type
-- However, we check if it's still referenced elsewhere first
DO $$
BEGIN
    -- Only drop if not used by any other table
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE udt_name = 'subscription_tier'
    ) THEN
        DROP TYPE IF EXISTS subscription_tier;
    END IF;
END $$;

-- ============================================
-- Add Comment for Documentation
-- ============================================
COMMENT ON TABLE users IS 'User public profile. Subscription status is stored in user_entitlements table (secure, server-controlled).';
