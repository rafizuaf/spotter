-- ============================================
-- Migration 00022: User Entitlements (Security Critical)
-- ============================================
-- This table is READ-ONLY for users via RLS.
-- Only payment webhooks (using service role) can write to it.
-- This is the source of truth for subscription status.

-- ============================================
-- Entitlement Source Type
-- ============================================
CREATE TYPE entitlement_source AS ENUM (
    'STRIPE',
    'REVENUECAT',
    'MANUAL_GIFT',
    'LIFETIME'
);

-- ============================================
-- User Entitlements Table
-- ============================================
CREATE TABLE user_entitlements (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    tier TEXT NOT NULL DEFAULT 'FREE' CHECK (tier IN ('FREE', 'PRO', 'ELITE')),
    is_trial BOOLEAN NOT NULL DEFAULT FALSE,
    trial_ends_at TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,  -- NULL = lifetime/never expires
    source entitlement_source NOT NULL DEFAULT 'MANUAL_GIFT',
    original_transaction_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment for documentation
COMMENT ON TABLE user_entitlements IS 'Security-critical table: READ-ONLY for users. Only payment webhooks can write.';
COMMENT ON COLUMN user_entitlements.tier IS 'Subscription tier: FREE, PRO, or ELITE';
COMMENT ON COLUMN user_entitlements.valid_until IS 'NULL means lifetime/never expires';
COMMENT ON COLUMN user_entitlements.source IS 'Where the entitlement came from';

-- Auto-update updated_at
CREATE TRIGGER update_user_entitlements_updated_at
    BEFORE UPDATE ON user_entitlements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Index for expiry checks (scheduled job)
CREATE INDEX idx_user_entitlements_valid_until
    ON user_entitlements(valid_until)
    WHERE valid_until IS NOT NULL;

-- Index for sync
CREATE INDEX idx_user_entitlements_sync
    ON user_entitlements(updated_at);

-- ============================================
-- CRITICAL: Row Level Security (READ-ONLY for users)
-- ============================================
ALTER TABLE user_entitlements ENABLE ROW LEVEL SECURITY;

-- Users can ONLY SELECT their own entitlement
-- NO INSERT policy = users cannot create entitlements
-- NO UPDATE policy = users cannot modify entitlements
-- NO DELETE policy = users cannot delete entitlements
-- Service role (used by payment webhook) bypasses RLS entirely
CREATE POLICY "Users can view own entitlement"
    ON user_entitlements FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================
-- Trigger: Auto-create entitlement on user creation
-- ============================================
CREATE OR REPLACE FUNCTION create_user_entitlement()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_entitlements (user_id, tier, source, created_at, updated_at)
    VALUES (NEW.id, 'FREE', 'MANUAL_GIFT', NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_created_create_entitlement
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_entitlement();

-- ============================================
-- Backfill: Create entitlements for existing users
-- ============================================
INSERT INTO user_entitlements (user_id, tier, source, created_at, updated_at)
SELECT id, 'FREE', 'MANUAL_GIFT', NOW(), NOW()
FROM users
WHERE id NOT IN (SELECT user_id FROM user_entitlements)
ON CONFLICT (user_id) DO NOTHING;
