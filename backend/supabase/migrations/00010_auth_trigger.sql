-- ============================================
-- Migration 00010: Auth Trigger & Final Setup
-- ============================================

-- Create trigger to auto-create user profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================
-- Performance Indexes
-- ============================================

-- Sync indexes (critical for offline-first sync)
CREATE INDEX IF NOT EXISTS idx_users_sync ON users(updated_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_settings_sync ON user_settings(updated_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_exercises_sync ON exercises(updated_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_routines_sync ON routines(updated_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_routine_exercises_sync ON routine_exercises(updated_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_body_logs_sync ON user_body_logs(updated_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_follows_sync ON follows(updated_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_social_posts_sync ON social_posts(updated_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_sync ON notifications(updated_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_badges_sync ON user_badges(updated_at) WHERE deleted_at IS NULL;

-- ============================================
-- Helper function for sync pull
-- ============================================
CREATE OR REPLACE FUNCTION get_changes_since(
    p_table_name TEXT,
    p_user_id UUID,
    p_last_pulled_at TIMESTAMPTZ
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- This is a simplified version - actual implementation would be in Edge Functions
    RETURN '{}'::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
