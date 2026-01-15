-- ============================================
-- Migration 00017: Performance Indexes
-- ============================================
-- Adds critical indexes to improve query performance
-- Addresses N+1 query patterns and slow badge/XP lookups

-- Index for workout_sets user queries (used by badge unlock checks)
-- Partial index excludes soft-deleted records
CREATE INDEX IF NOT EXISTS idx_workout_sets_user_id 
ON workout_sets(user_id) 
WHERE deleted_at IS NULL;

-- Index for user_xp_logs daily cap checks
-- Composite index on user_id and created_at for efficient time-range queries
CREATE INDEX IF NOT EXISTS idx_user_xp_logs_user_created 
ON user_xp_logs(user_id, created_at DESC);

-- Index for follows queries (follower lookups)
-- Composite index includes deleted_at for efficient filtering
CREATE INDEX IF NOT EXISTS idx_follows_following_deleted 
ON follows(following_id, deleted_at);

-- Add comment
COMMENT ON INDEX idx_workout_sets_user_id IS 'Optimizes badge unlock queries that filter sets by user_id';
COMMENT ON INDEX idx_user_xp_logs_user_created IS 'Optimizes daily XP cap calculations with time-range queries';
COMMENT ON INDEX idx_follows_following_deleted IS 'Optimizes follower queries and feed generation';
