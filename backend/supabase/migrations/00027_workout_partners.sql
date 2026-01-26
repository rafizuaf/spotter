-- Migration: 00027_workout_partners.sql
-- Phase 2G: Social & Competition - Workout Partners
-- Description: Real-time workout partner system for training together

-- ============================================================================
-- WORKOUT PARTNERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS workout_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    partner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LEFT', 'COMPLETED')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_workout_partner UNIQUE (workout_id, user_id, partner_user_id),
    CONSTRAINT check_not_self CHECK (user_id != partner_user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workout_partners_workout_id ON workout_partners(workout_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workout_partners_user_id ON workout_partners(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workout_partners_partner_user_id ON workout_partners(partner_user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workout_partners_status ON workout_partners(status) WHERE deleted_at IS NULL;

-- Soft delete support
ALTER TABLE workout_partners ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================================
-- WORKOUT PARTNER INVITATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS workout_partner_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    inviter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_invitation UNIQUE (workout_id, invitee_user_id),
    CONSTRAINT check_not_self_invite CHECK (inviter_user_id != invitee_user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workout_partner_invitations_workout_id ON workout_partner_invitations(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_partner_invitations_inviter_user_id ON workout_partner_invitations(inviter_user_id);
CREATE INDEX IF NOT EXISTS idx_workout_partner_invitations_invitee_user_id ON workout_partner_invitations(invitee_user_id) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_workout_partner_invitations_status ON workout_partner_invitations(status);

-- Soft delete support
ALTER TABLE workout_partner_invitations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE workout_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_partner_invitations ENABLE ROW LEVEL SECURITY;

-- workout_partners: Users can view partners for their workouts
CREATE POLICY "Users can view partners for their workouts"
    ON workout_partners
    FOR SELECT
    USING (
        user_id = auth.uid() OR
        partner_user_id = auth.uid() OR
        workout_id IN (
            SELECT id FROM workouts WHERE user_id = auth.uid()
        )
    );

-- workout_partners: Users can create partner relationships for their workouts
CREATE POLICY "Users can create partner relationships for their workouts"
    ON workout_partners
    FOR INSERT
    WITH CHECK (
        workout_id IN (
            SELECT id FROM workouts WHERE user_id = auth.uid()
        ) AND
        user_id = auth.uid()
    );

-- workout_partners: Users can update their own partner status
CREATE POLICY "Users can update their own partner status"
    ON workout_partners
    FOR UPDATE
    USING (user_id = auth.uid() OR partner_user_id = auth.uid())
    WITH CHECK (user_id = auth.uid() OR partner_user_id = auth.uid());

-- workout_partner_invitations: Users can view invitations sent to them or by them
CREATE POLICY "Users can view their invitations"
    ON workout_partner_invitations
    FOR SELECT
    USING (
        inviter_user_id = auth.uid() OR
        invitee_user_id = auth.uid()
    );

-- workout_partner_invitations: Users can create invitations for their workouts
CREATE POLICY "Users can create invitations for their workouts"
    ON workout_partner_invitations
    FOR INSERT
    WITH CHECK (
        workout_id IN (
            SELECT id FROM workouts WHERE user_id = auth.uid()
        ) AND
        inviter_user_id = auth.uid()
    );

-- workout_partner_invitations: Invitees can update invitation status
CREATE POLICY "Invitees can update invitation status"
    ON workout_partner_invitations
    FOR UPDATE
    USING (invitee_user_id = auth.uid())
    WITH CHECK (invitee_user_id = auth.uid());

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_workout_partners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workout_partners_updated_at
    BEFORE UPDATE ON workout_partners
    FOR EACH ROW
    EXECUTE FUNCTION update_workout_partners_updated_at();

CREATE OR REPLACE FUNCTION update_workout_partner_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workout_partner_invitations_updated_at
    BEFORE UPDATE ON workout_partner_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_workout_partner_invitations_updated_at();

-- Auto-expire invitations
CREATE OR REPLACE FUNCTION expire_workout_partner_invitations()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE workout_partner_invitations
    SET status = 'EXPIRED', updated_at = NOW()
    WHERE status = 'PENDING' AND expires_at < NOW();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Run expiration check periodically (via cron or manual trigger)
-- This is a helper function that can be called by a scheduled job
CREATE OR REPLACE FUNCTION check_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE workout_partner_invitations
    SET status = 'EXPIRED', updated_at = NOW()
    WHERE status = 'PENDING' AND expires_at < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE workout_partners IS 'Active workout partner sessions - users training together in real-time';
COMMENT ON TABLE workout_partner_invitations IS 'Pending workout partner invitations';
COMMENT ON COLUMN workout_partners.status IS 'ACTIVE: Currently training together, LEFT: Partner left, COMPLETED: Workout completed';
COMMENT ON COLUMN workout_partner_invitations.status IS 'PENDING: Awaiting response, ACCEPTED: Invitation accepted, DECLINED: Invitation declined, EXPIRED: Invitation expired';
