-- ============================================================================
-- Migration: 00012_weekly_activity_system.sql
-- Description: Weekly-based streak system (replaces harmful daily streaks)
-- Created: 2026-01-09
-- Priority: HIGH - Core gamification feature
-- ============================================================================

-- ============================================================================
-- WHY WEEKLY STREAKS?
-- Daily streaks punish rest days, which are essential for recovery.
-- Weekly streaks encourage consistency (3-4 workouts/week) while allowing
-- flexibility and proper recovery.
-- ============================================================================

-- ============================================================================
-- USER_ACTIVITY_WEEKS TABLE
-- Tracks workout activity per week for each user
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_activity_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Week identifier (always Monday of that week in user's timezone)
  week_start DATE NOT NULL,

  -- Activity metrics
  active_days INTEGER NOT NULL DEFAULT 0 CHECK (active_days >= 0 AND active_days <= 7),
  workouts_completed INTEGER NOT NULL DEFAULT 0 CHECK (workouts_completed >= 0),
  total_sets INTEGER NOT NULL DEFAULT 0 CHECK (total_sets >= 0),
  total_volume_kg DECIMAL(12, 2) DEFAULT 0 CHECK (total_volume_kg >= 0),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one record per user per week
  UNIQUE(user_id, week_start)
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_activity_weeks_user_week
  ON user_activity_weeks(user_id, week_start DESC);

-- ============================================================================
-- USER_STREAK_LOGS TABLE
-- Tracks qualifying week streaks (e.g., "8 consecutive weeks with 4+ workouts")
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_streak_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Streak type: WEEKLY_3 (3+ days/week), WEEKLY_4 (4+ days/week), WEEKLY_5 (5+ days/week)
  streak_type TEXT NOT NULL CHECK (streak_type IN ('WEEKLY_3', 'WEEKLY_4', 'WEEKLY_5', 'WEEKLY_ANY')),

  -- Current streak length in weeks
  streak_length INTEGER NOT NULL DEFAULT 1 CHECK (streak_length >= 1),

  -- The week this streak ended (or is current as of)
  week_ended DATE NOT NULL,

  -- Is this streak currently active?
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one active streak per type per user (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_streak_logs_unique_active
  ON user_streak_logs(user_id, streak_type)
  WHERE is_active = TRUE;

-- Index for active streak queries
CREATE INDEX IF NOT EXISTS idx_streak_logs_user_active
  ON user_streak_logs(user_id, is_active) WHERE is_active = TRUE;

-- ============================================================================
-- UPDATE ACHIEVEMENTS TABLE
-- Replace daily streak achievements with weekly-based ones
-- ============================================================================

-- First, mark old streak achievements as deprecated (don't delete for history)
UPDATE achievements
SET description = '[DEPRECATED] ' || description
WHERE code IN ('STREAK_7', 'STREAK_30', 'STREAK_90')
  AND description NOT LIKE '[DEPRECATED]%';

-- Insert new weekly-based achievements
INSERT INTO achievements (code, title, description, icon_url, threshold_value)
VALUES
  -- Weekly consistency achievements
  ('WEEKLY_3_x4', 'Consistent Starter', 'Work out 3+ days per week for 4 consecutive weeks', '/badges/weekly_3_4.png', 4),
  ('WEEKLY_3_x8', 'Habit Builder', 'Work out 3+ days per week for 8 consecutive weeks', '/badges/weekly_3_8.png', 8),
  ('WEEKLY_3_x12', 'Quarter Champion', 'Work out 3+ days per week for 12 consecutive weeks', '/badges/weekly_3_12.png', 12),

  -- Serious lifter achievements (4+ days/week)
  ('WEEKLY_4_x4', 'Dedicated Lifter', 'Work out 4+ days per week for 4 consecutive weeks', '/badges/weekly_4_4.png', 4),
  ('WEEKLY_4_x8', 'Iron Regular', 'Work out 4+ days per week for 8 consecutive weeks', '/badges/weekly_4_8.png', 8),
  ('WEEKLY_4_x12', 'Gym Warrior', 'Work out 4+ days per week for 12 consecutive weeks', '/badges/weekly_4_12.png', 12),

  -- Long-term consistency
  ('CONSISTENCY_26', 'Half Year Hero', 'Complete at least 1 workout every week for 26 weeks', '/badges/consistency_26.png', 26),
  ('CONSISTENCY_52', 'Year-Round Athlete', 'Complete at least 1 workout every week for 52 weeks', '/badges/consistency_52.png', 52),

  -- Single week achievements
  ('PERFECT_WEEK_5', 'Perfect Week', 'Complete 5+ workouts in a single week', '/badges/perfect_week.png', 5),
  ('PERFECT_WEEK_6', 'Beast Mode Week', 'Complete 6+ workouts in a single week', '/badges/beast_week.png', 6)
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  threshold_value = EXCLUDED.threshold_value;

-- ============================================================================
-- HELPER FUNCTION: Get Week Start (Monday)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_week_start(input_date DATE)
RETURNS DATE AS $$
BEGIN
  -- Returns Monday of the week containing input_date
  -- PostgreSQL: dow 0=Sunday, 1=Monday, ..., 6=Saturday
  RETURN input_date - EXTRACT(DOW FROM input_date)::INTEGER +
    CASE WHEN EXTRACT(DOW FROM input_date) = 0 THEN -6 ELSE 1 END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================================

CREATE TRIGGER update_activity_weeks_updated_at
  BEFORE UPDATE ON user_activity_weeks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_streak_logs_updated_at
  BEFORE UPDATE ON user_streak_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE user_activity_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streak_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own activity weeks
CREATE POLICY "Users can view own activity weeks"
  ON user_activity_weeks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only see their own streak logs
CREATE POLICY "Users can view own streak logs"
  ON user_streak_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert/update (via edge functions)
CREATE POLICY "Service role can manage activity weeks"
  ON user_activity_weeks FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage streak logs"
  ON user_streak_logs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE user_activity_weeks IS 'Tracks workout activity per week for weekly streak system';
COMMENT ON TABLE user_streak_logs IS 'Tracks consecutive qualifying weeks for streak achievements';
COMMENT ON COLUMN user_activity_weeks.week_start IS 'Monday of the week (ISO week start)';
COMMENT ON COLUMN user_streak_logs.streak_type IS 'WEEKLY_3 = 3+ workouts/week, WEEKLY_4 = 4+, etc.';
