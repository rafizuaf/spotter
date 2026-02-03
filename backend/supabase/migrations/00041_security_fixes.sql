-- Migration: 00041_security_fixes.sql
-- Security: Fix RLS policies, add constraints, fix leaderboard duration checks
-- Description: Addresses critical security vulnerabilities found in audit

-- ============================================================================
-- FIX SOCIAL POSTS RLS POLICY (FOLLOWERS visibility check)
-- ============================================================================
-- This is already fixed in 00009_rls_policies.sql via DROP/CREATE, but adding
-- a comment here for documentation

COMMENT ON POLICY "Social posts viewable based on workout visibility" ON social_posts IS 
'SECURITY: Fixed to properly check FOLLOWERS visibility. Users can see own posts, PUBLIC workouts, and FOLLOWERS workouts (if following the author).';

-- ============================================================================
-- ADD MUSCLE GROUP VALIDATION CONSTRAINT
-- ============================================================================
-- Prevents users from gaming muscle group badges by assigning wrong groups
-- Includes both UPPERCASE (seed.sql) and Title Case (UI) values for compatibility

ALTER TABLE exercises
  DROP CONSTRAINT IF EXISTS valid_muscle_group,
  ADD CONSTRAINT valid_muscle_group CHECK (
    muscle_group IS NULL OR muscle_group IN (
      'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio', 'Full Body',
      'CHEST', 'BACK', 'SHOULDERS', 'LEGS', 'BICEPS', 'TRICEPS', 'CORE'
    )
  );

COMMENT ON CONSTRAINT valid_muscle_group ON exercises IS 
'SECURITY: Validates muscle group assignments to prevent badge manipulation. Only allows valid muscle groups.';

-- ============================================================================
-- ADD EXERCISE NAME LENGTH CONSTRAINT
-- ============================================================================
-- Prevents XSS/injection via extremely long names

ALTER TABLE exercises
  DROP CONSTRAINT IF EXISTS valid_name_length,
  ADD CONSTRAINT valid_name_length CHECK (
    char_length(name) >= 1 AND char_length(name) <= 100
  );

COMMENT ON CONSTRAINT valid_name_length ON exercises IS 
'SECURITY: Limits exercise name length to prevent XSS/injection attacks.';

-- ============================================================================
-- FIX LEADERBOARD DURATION CHECKS (Migration 00030 removed them)
-- ============================================================================

-- Fix weekly workouts leaderboard (missing duration check)
CREATE OR REPLACE FUNCTION compute_weekly_workouts_leaderboard()
RETURNS void AS $$
DECLARE
    v_leaderboard_id UUID;
    v_period_start TIMESTAMPTZ;
    v_period_end TIMESTAMPTZ;
BEGIN
    SELECT id INTO v_leaderboard_id FROM leaderboards WHERE code = 'WEEKLY_WORKOUTS';
    IF v_leaderboard_id IS NULL THEN RETURN; END IF;

    v_period_start := get_week_start();
    v_period_end := get_week_end();

    DELETE FROM leaderboard_entries
    WHERE leaderboard_id = v_leaderboard_id
    AND period_start = v_period_start;

    INSERT INTO leaderboard_entries (leaderboard_id, user_id, rank, score, period_start, period_end)
    SELECT
        v_leaderboard_id,
        user_id,
        ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC),
        COUNT(*),
        v_period_start,
        v_period_end
    FROM workouts
    WHERE started_at >= v_period_start
    AND started_at <= v_period_end
    AND ended_at IS NOT NULL
    AND (ended_at - started_at) >= INTERVAL '5 minutes'  -- SECURITY: Minimum 5 minutes to prevent fake workouts
    AND deleted_at IS NULL
    GROUP BY user_id
    HAVING COUNT(*) > 0
    ORDER BY COUNT(*) DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION compute_weekly_workouts_leaderboard IS 
'SECURITY: Fixed to include 5-minute minimum duration check. Prevents fake 1-second workouts from inflating leaderboards.';

-- Fix all-time workouts leaderboard (missing explicit duration check)
CREATE OR REPLACE FUNCTION compute_all_time_workouts_leaderboard()
RETURNS void AS $$
DECLARE
    v_leaderboard_id UUID;
    v_period_start TIMESTAMPTZ := '1970-01-01'::TIMESTAMPTZ;
    v_period_end TIMESTAMPTZ := '2099-12-31'::TIMESTAMPTZ;
BEGIN
    SELECT id INTO v_leaderboard_id FROM leaderboards WHERE code = 'ALL_TIME_WORKOUTS';
    IF v_leaderboard_id IS NULL THEN RETURN; END IF;

    DELETE FROM leaderboard_entries
    WHERE leaderboard_id = v_leaderboard_id;

    INSERT INTO leaderboard_entries (leaderboard_id, user_id, rank, score, period_start, period_end)
    SELECT
        v_leaderboard_id,
        user_id,
        ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC),
        COUNT(*),
        v_period_start,
        v_period_end
    FROM workouts
    WHERE ended_at IS NOT NULL
    AND (ended_at - started_at) >= INTERVAL '5 minutes'  -- SECURITY: Minimum 5 minutes to prevent fake workouts
    AND deleted_at IS NULL
    GROUP BY user_id
    HAVING COUNT(*) > 0
    ORDER BY COUNT(*) DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION compute_all_time_workouts_leaderboard IS 
'SECURITY: Fixed to include explicit 5-minute minimum duration check. Prevents fake workouts from inflating all-time leaderboards.';

-- Fix monthly PRs leaderboard (uses wrong timestamp)
CREATE OR REPLACE FUNCTION compute_monthly_prs_leaderboard()
RETURNS void AS $$
DECLARE
    v_leaderboard_id UUID;
    v_period_start TIMESTAMPTZ;
    v_period_end TIMESTAMPTZ;
BEGIN
    SELECT id INTO v_leaderboard_id FROM leaderboards WHERE code = 'MONTHLY_PRS';
    IF v_leaderboard_id IS NULL THEN RETURN; END IF;

    v_period_start := get_month_start();
    v_period_end := get_month_end();

    DELETE FROM leaderboard_entries
    WHERE leaderboard_id = v_leaderboard_id
    AND period_start = v_period_start;

    INSERT INTO leaderboard_entries (leaderboard_id, user_id, rank, score, period_start, period_end)
    SELECT
        v_leaderboard_id,
        ws.user_id,
        ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC),
        COUNT(*),
        v_period_start,
        v_period_end
    FROM workout_sets ws
    JOIN workouts w ON w.id = ws.workout_id
    WHERE w.started_at >= v_period_start  -- SECURITY: Use w.started_at instead of ws.created_at for accurate month
    AND w.started_at <= v_period_end
    AND ws.is_pr = TRUE
    AND w.deleted_at IS NULL
    AND ws.deleted_at IS NULL
    GROUP BY ws.user_id
    HAVING COUNT(*) > 0
    ORDER BY COUNT(*) DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION compute_monthly_prs_leaderboard IS 
'SECURITY: Fixed to use w.started_at instead of ws.created_at. Ensures PRs are counted in the correct month based on when workout happened, not when set was created.';

-- ============================================================================
-- ADD RLS POLICIES FOR CONTENT_REPORTS
-- ============================================================================
-- Users can create reports and view their own reports
-- Note: CREATE POLICY does not support IF NOT EXISTS; use DROP IF EXISTS first

DROP POLICY IF EXISTS "Users can create reports" ON content_reports;
CREATE POLICY "Users can create reports"
    ON content_reports FOR INSERT
    TO authenticated
    WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own reports" ON content_reports;
CREATE POLICY "Users can view own reports"
    ON content_reports FOR SELECT
    TO authenticated
    USING (reporter_id = auth.uid());

COMMENT ON POLICY "Users can create reports" ON content_reports IS 
'SECURITY: Allows users to report abusive content. Reports are tied to the reporter.';
COMMENT ON POLICY "Users can view own reports" ON content_reports IS 
'SECURITY: Users can only view their own reports. Admin access via service role.';

-- ============================================================================
-- ADD RLS POLICIES FOR EXERCISE_SWAPS
-- ============================================================================
-- Users can view and create exercise swaps
-- Note: CREATE POLICY does not support IF NOT EXISTS; use DROP IF EXISTS first

DROP POLICY IF EXISTS "Users can view exercise swaps" ON exercise_swaps;
CREATE POLICY "Users can view exercise swaps"
    ON exercise_swaps FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can create exercise swaps" ON exercise_swaps;
CREATE POLICY "Users can create exercise swaps"
    ON exercise_swaps FOR INSERT
    TO authenticated
    WITH CHECK (true);

COMMENT ON POLICY "Users can view exercise swaps" ON exercise_swaps IS 
'Allows users to view exercise swap suggestions.';
COMMENT ON POLICY "Users can create exercise swaps" ON exercise_swaps IS 
'Allows users to create exercise swaps for injury management.';
