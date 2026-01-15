-- ============================================
-- Migration 00017: Performance Indexes
-- ============================================
-- Adds critical indexes to improve query performance
-- Addresses N+1 query patterns and slow badge/XP lookups

-- Note: workout_sets doesn't have user_id directly - it joins through workouts
-- The existing idx_workouts_user_id and idx_workout_sets_workout_id indexes
-- are sufficient for badge unlock queries that join workouts and workout_sets

-- Index for user_xp_logs daily cap checks
-- Composite index on user_id and created_at for efficient time-range queries
CREATE INDEX IF NOT EXISTS idx_user_xp_logs_user_created 
ON user_xp_logs(user_id, created_at DESC);

-- Index for follows queries (follower lookups)
-- Composite index includes deleted_at for efficient filtering
CREATE INDEX IF NOT EXISTS idx_follows_following_deleted 
ON follows(following_id, deleted_at);

-- Add comments
COMMENT ON INDEX idx_user_xp_logs_user_created IS 'Optimizes daily XP cap calculations with time-range queries';
COMMENT ON INDEX idx_follows_following_deleted IS 'Optimizes follower queries and feed generation';
