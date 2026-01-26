-- Migration: 00029_user_feedback.sql
-- Description: Add user feedback table for bug reports and feature requests

-- ============================================================================
-- USER FEEDBACK TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'general')),
    message TEXT NOT NULL CHECK (LENGTH(message) >= 10 AND LENGTH(message) <= 5000),
    app_version TEXT,
    platform TEXT,
    device_info JSONB,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Add comment for documentation
COMMENT ON TABLE user_feedback IS 'Stores user feedback, bug reports, and feature requests';
COMMENT ON COLUMN user_feedback.feedback_type IS 'Type of feedback: bug, feature, or general';
COMMENT ON COLUMN user_feedback.status IS 'Status: pending, reviewed, resolved, or dismissed';

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for fetching feedback by user
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id) WHERE deleted_at IS NULL;

-- Index for fetching feedback by status (admin queries)
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status) WHERE deleted_at IS NULL;

-- Index for fetching recent feedback
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at DESC) WHERE deleted_at IS NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Users can only see their own feedback
CREATE POLICY "Users can view their own feedback"
    ON user_feedback
    FOR SELECT
    USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Users can insert their own feedback
CREATE POLICY "Users can create their own feedback"
    ON user_feedback
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own feedback (only if status is pending)
CREATE POLICY "Users can update their own pending feedback"
    ON user_feedback
    FOR UPDATE
    USING (auth.uid() = user_id AND status = 'pending' AND deleted_at IS NULL)
    WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Admins can view all feedback (via service role, bypasses RLS)
-- No policy needed - service role bypasses RLS

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_feedback_updated_at
    BEFORE UPDATE ON user_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_user_feedback_updated_at();
