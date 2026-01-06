-- ============================================
-- Migration 00009: Row Level Security Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_swaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_body_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Users Policies
-- ============================================
-- Public profiles are readable by all authenticated users (if not blocked)
CREATE POLICY "Users are viewable by authenticated users"
    ON users FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL
        AND account_status = 'ACTIVE'
        AND NOT EXISTS (
            SELECT 1 FROM user_blocks
            WHERE blocker_id = id AND blocked_id = auth.uid()
        )
    );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- ============================================
-- User Settings Policies
-- ============================================
-- Users can only see their own settings
CREATE POLICY "Users can view own settings"
    ON user_settings FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own settings"
    ON user_settings FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- Equipment Bases Policies
-- ============================================
-- Everyone can read equipment bases (seed data)
CREATE POLICY "Equipment bases are viewable by all"
    ON equipment_bases FOR SELECT
    TO authenticated
    USING (true);

-- ============================================
-- Exercises Policies
-- ============================================
-- Users can see global exercises and their own custom exercises
CREATE POLICY "Exercises are viewable"
    ON exercises FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL
        AND (is_custom = FALSE OR created_by_user_id = auth.uid())
    );

-- Users can create custom exercises
CREATE POLICY "Users can create custom exercises"
    ON exercises FOR INSERT
    TO authenticated
    WITH CHECK (created_by_user_id = auth.uid() AND is_custom = TRUE);

-- Users can update their own custom exercises
CREATE POLICY "Users can update own exercises"
    ON exercises FOR UPDATE
    TO authenticated
    USING (created_by_user_id = auth.uid())
    WITH CHECK (created_by_user_id = auth.uid());

-- ============================================
-- Routines Policies
-- ============================================
CREATE POLICY "Users can view own routines"
    ON routines FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL AND user_id = auth.uid());

CREATE POLICY "Users can view public routines"
    ON routines FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL AND is_public = TRUE);

CREATE POLICY "Users can create routines"
    ON routines FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own routines"
    ON routines FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- Routine Exercises Policies
-- ============================================
CREATE POLICY "Users can view routine exercises for accessible routines"
    ON routine_exercises FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL
        AND EXISTS (
            SELECT 1 FROM routines
            WHERE routines.id = routine_exercises.routine_id
            AND (routines.user_id = auth.uid() OR routines.is_public = TRUE)
            AND routines.deleted_at IS NULL
        )
    );

CREATE POLICY "Users can manage own routine exercises"
    ON routine_exercises FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM routines
            WHERE routines.id = routine_exercises.routine_id
            AND routines.user_id = auth.uid()
        )
    );

-- ============================================
-- Workouts Policies
-- ============================================
CREATE POLICY "Users can view own workouts"
    ON workouts FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL AND user_id = auth.uid());

CREATE POLICY "Users can view public workouts"
    ON workouts FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL
        AND visibility = 'PUBLIC'
        AND NOT EXISTS (
            SELECT 1 FROM user_blocks
            WHERE blocker_id = user_id AND blocked_id = auth.uid()
        )
    );

CREATE POLICY "Users can view follower workouts"
    ON workouts FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL
        AND visibility = 'FOLLOWERS'
        AND EXISTS (
            SELECT 1 FROM follows
            WHERE follows.following_id = workouts.user_id
            AND follows.follower_id = auth.uid()
            AND follows.deleted_at IS NULL
        )
    );

CREATE POLICY "Users can create workouts"
    ON workouts FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own workouts"
    ON workouts FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- Workout Sets Policies
-- ============================================
CREATE POLICY "Users can view sets for accessible workouts"
    ON workout_sets FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL
        AND EXISTS (
            SELECT 1 FROM workouts
            WHERE workouts.id = workout_sets.workout_id
            AND (
                workouts.user_id = auth.uid()
                OR (workouts.visibility = 'PUBLIC' AND workouts.deleted_at IS NULL)
                OR (
                    workouts.visibility = 'FOLLOWERS'
                    AND EXISTS (
                        SELECT 1 FROM follows
                        WHERE follows.following_id = workouts.user_id
                        AND follows.follower_id = auth.uid()
                        AND follows.deleted_at IS NULL
                    )
                )
            )
        )
    );

CREATE POLICY "Users can manage own workout sets"
    ON workout_sets FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workouts
            WHERE workouts.id = workout_sets.workout_id
            AND workouts.user_id = auth.uid()
        )
    );

-- ============================================
-- User Body Logs Policies
-- ============================================
CREATE POLICY "Users can view own body logs"
    ON user_body_logs FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL AND user_id = auth.uid());

CREATE POLICY "Users can manage own body logs"
    ON user_body_logs FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- Follows Policies
-- ============================================
CREATE POLICY "Follows are viewable"
    ON follows FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY "Users can create follows"
    ON follows FOR INSERT
    TO authenticated
    WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users can delete own follows"
    ON follows FOR UPDATE
    TO authenticated
    USING (follower_id = auth.uid())
    WITH CHECK (follower_id = auth.uid());

-- ============================================
-- User Blocks Policies
-- ============================================
CREATE POLICY "Users can view own blocks"
    ON user_blocks FOR SELECT
    TO authenticated
    USING (blocker_id = auth.uid());

CREATE POLICY "Users can create blocks"
    ON user_blocks FOR INSERT
    TO authenticated
    WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can delete own blocks"
    ON user_blocks FOR DELETE
    TO authenticated
    USING (blocker_id = auth.uid());

-- ============================================
-- Social Posts Policies
-- ============================================
CREATE POLICY "Social posts viewable based on workout visibility"
    ON social_posts FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM workouts
                WHERE workouts.id = social_posts.workout_id
                AND workouts.visibility = 'PUBLIC'
                AND workouts.deleted_at IS NULL
            )
        )
        AND NOT EXISTS (
            SELECT 1 FROM user_blocks
            WHERE blocker_id = user_id AND blocked_id = auth.uid()
        )
    );

-- ============================================
-- Notifications Policies
-- ============================================
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL AND recipient_id = auth.uid());

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    TO authenticated
    USING (recipient_id = auth.uid())
    WITH CHECK (recipient_id = auth.uid());

-- ============================================
-- Push Devices Policies
-- ============================================
CREATE POLICY "Users can manage own push devices"
    ON push_devices FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- XP & Levels Policies
-- ============================================
CREATE POLICY "Users can view own XP logs"
    ON user_xp_logs FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can view own level"
    ON user_levels FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can view others levels"
    ON user_levels FOR SELECT
    TO authenticated
    USING (true);

-- ============================================
-- Achievements Policies
-- ============================================
CREATE POLICY "Achievements are viewable by all"
    ON achievements FOR SELECT
    TO authenticated
    USING (true);

-- ============================================
-- User Badges Policies
-- ============================================
CREATE POLICY "User badges are viewable"
    ON user_badges FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

-- ============================================
-- Payment Policies
-- ============================================
CREATE POLICY "Users can view own payment info"
    ON payment_customers FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can view own subscription history"
    ON subscription_history FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL AND user_id = auth.uid());
