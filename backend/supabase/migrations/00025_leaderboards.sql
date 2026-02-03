-- Migration: 00025_leaderboards.sql
-- Phase 2G: Social & Competition - Leaderboards
-- Description: Add leaderboard definitions and cached entries

-- ============================================================================
-- LEADERBOARDS TABLE (Static Configuration)
-- ============================================================================

CREATE TABLE leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL, -- 'WEEKLY_VOLUME', 'MONTHLY_XP', 'ALL_TIME_WORKOUTS'
    title TEXT NOT NULL CHECK (char_length(title) <= 100),
    description TEXT CHECK (char_length(description) <= 500),
    metric_type TEXT NOT NULL CHECK (metric_type IN (
        'TOTAL_XP',       -- Sum of XP earned
        'TOTAL_VOLUME',   -- Sum of weight × reps
        'WORKOUT_COUNT',  -- Number of workouts
        'PR_COUNT'        -- Number of PRs hit
    )),
    time_period TEXT NOT NULL CHECK (time_period IN (
        'WEEKLY',     -- Resets every Monday
        'MONTHLY',    -- Resets on 1st of month
        'ALL_TIME'    -- Never resets
    )),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER DEFAULT 0, -- For UI ordering
    icon_name TEXT DEFAULT 'trophy', -- Icon identifier for UI
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE leaderboards IS 'Leaderboard configurations (read-only, seeded data)';
COMMENT ON COLUMN leaderboards.code IS 'Unique code for referencing leaderboard';
COMMENT ON COLUMN leaderboards.metric_type IS 'What metric is being tracked';
COMMENT ON COLUMN leaderboards.time_period IS 'How often the leaderboard resets';

-- ============================================================================
-- LEADERBOARD ENTRIES TABLE (Cached Rankings)
-- ============================================================================

CREATE TABLE leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leaderboard_id UUID NOT NULL REFERENCES leaderboards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL CHECK (rank >= 1),
    score NUMERIC NOT NULL CHECK (score >= 0),
    period_start TIMESTAMPTZ NOT NULL, -- Start of the period (for weekly/monthly)
    period_end TIMESTAMPTZ NOT NULL,   -- End of the period
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One entry per user per leaderboard per period
    CONSTRAINT unique_leaderboard_user_period UNIQUE (leaderboard_id, user_id, period_start)
);

COMMENT ON TABLE leaderboard_entries IS 'Cached leaderboard rankings computed by scheduled job';
COMMENT ON COLUMN leaderboard_entries.rank IS 'Position on leaderboard (1 = first place)';
COMMENT ON COLUMN leaderboard_entries.score IS 'Value of the metric for this period';
COMMENT ON COLUMN leaderboard_entries.period_start IS 'Start of the scoring period';
COMMENT ON COLUMN leaderboard_entries.computed_at IS 'When the ranking was last calculated';

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Leaderboards indexes
CREATE INDEX idx_leaderboards_active
    ON leaderboards(is_active)
    WHERE is_active = TRUE;

CREATE INDEX idx_leaderboards_code
    ON leaderboards(code);

-- Leaderboard entries indexes
CREATE INDEX idx_leaderboard_entries_leaderboard_rank
    ON leaderboard_entries(leaderboard_id, rank)
    WHERE rank <= 100; -- Only index top 100

CREATE INDEX idx_leaderboard_entries_user
    ON leaderboard_entries(user_id);

CREATE INDEX idx_leaderboard_entries_period
    ON leaderboard_entries(leaderboard_id, period_start, period_end);

CREATE INDEX idx_leaderboard_entries_updated_at
    ON leaderboard_entries(updated_at);

-- Composite index for fetching current period entries
CREATE INDEX idx_leaderboard_entries_current
    ON leaderboard_entries(leaderboard_id, period_start DESC, rank ASC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;

-- LEADERBOARDS RLS (Read-only for all authenticated users)

CREATE POLICY "Anyone can view active leaderboards"
    ON leaderboards
    FOR SELECT
    TO authenticated
    USING (is_active = TRUE);

-- No INSERT/UPDATE/DELETE for authenticated users (admin only via service role)

-- LEADERBOARD ENTRIES RLS

-- Users can view leaderboard entries (excludes blocked users)
CREATE POLICY "Users can view leaderboard entries"
    ON leaderboard_entries
    FOR SELECT
    TO authenticated
    USING (
        -- Don't show entries from blocked users
        NOT EXISTS (
            SELECT 1 FROM user_blocks ub
            WHERE (ub.blocker_id = auth.uid() AND ub.blocked_id = leaderboard_entries.user_id)
               OR (ub.blocker_id = leaderboard_entries.user_id AND ub.blocked_id = auth.uid())
        )
    );

-- No INSERT/UPDATE/DELETE for authenticated users (computed by scheduled job via service role)

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER set_leaderboards_updated_at
    BEFORE UPDATE ON leaderboards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_leaderboard_entries_updated_at
    BEFORE UPDATE ON leaderboard_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DEFAULT LEADERBOARDS
-- ============================================================================

INSERT INTO leaderboards (code, title, description, metric_type, time_period, display_order, icon_name) VALUES
    ('WEEKLY_VOLUME', 'Weekly Volume', 'Most weight lifted this week', 'TOTAL_VOLUME', 'WEEKLY', 1, 'barbell'),
    ('WEEKLY_WORKOUTS', 'Weekly Workouts', 'Most workouts completed this week', 'WORKOUT_COUNT', 'WEEKLY', 2, 'calendar'),
    ('MONTHLY_XP', 'Monthly XP', 'Most XP earned this month', 'TOTAL_XP', 'MONTHLY', 3, 'star'),
    ('MONTHLY_PRS', 'Monthly PRs', 'Most personal records this month', 'PR_COUNT', 'MONTHLY', 4, 'trophy'),
    ('ALL_TIME_XP', 'All-Time XP', 'Total XP earned (lifetime)', 'TOTAL_XP', 'ALL_TIME', 5, 'crown'),
    ('ALL_TIME_WORKOUTS', 'All-Time Workouts', 'Total workouts completed (lifetime)', 'WORKOUT_COUNT', 'ALL_TIME', 6, 'fire');

-- ============================================================================
-- HELPER FUNCTIONS FOR LEADERBOARD COMPUTATION
-- ============================================================================

-- Function to get the start of the current week (Monday)
CREATE OR REPLACE FUNCTION get_week_start(ts TIMESTAMPTZ DEFAULT NOW())
RETURNS TIMESTAMPTZ AS $$
BEGIN
    -- ISO week starts on Monday
    RETURN date_trunc('week', ts);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get the end of the current week (Sunday 23:59:59)
CREATE OR REPLACE FUNCTION get_week_end(ts TIMESTAMPTZ DEFAULT NOW())
RETURNS TIMESTAMPTZ AS $$
BEGIN
    RETURN date_trunc('week', ts) + INTERVAL '7 days' - INTERVAL '1 second';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get the start of the current month
CREATE OR REPLACE FUNCTION get_month_start(ts TIMESTAMPTZ DEFAULT NOW())
RETURNS TIMESTAMPTZ AS $$
BEGIN
    RETURN date_trunc('month', ts);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get the end of the current month
CREATE OR REPLACE FUNCTION get_month_end(ts TIMESTAMPTZ DEFAULT NOW())
RETURNS TIMESTAMPTZ AS $$
BEGIN
    RETURN (date_trunc('month', ts) + INTERVAL '1 month' - INTERVAL '1 second');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- FUNCTION: Compute Weekly Volume Leaderboard
-- ============================================================================

CREATE OR REPLACE FUNCTION compute_weekly_volume_leaderboard()
RETURNS void AS $$
DECLARE
    v_leaderboard_id UUID;
    v_period_start TIMESTAMPTZ;
    v_period_end TIMESTAMPTZ;
BEGIN
    -- Get leaderboard ID
    SELECT id INTO v_leaderboard_id FROM leaderboards WHERE code = 'WEEKLY_VOLUME';
    IF v_leaderboard_id IS NULL THEN RETURN; END IF;

    v_period_start := get_week_start();
    v_period_end := get_week_end();

    -- Delete old entries for this period
    DELETE FROM leaderboard_entries
    WHERE leaderboard_id = v_leaderboard_id
    AND period_start = v_period_start;

    -- Insert new rankings
    INSERT INTO leaderboard_entries (leaderboard_id, user_id, rank, score, period_start, period_end)
    SELECT
        v_leaderboard_id,
        ws.user_id,
        ROW_NUMBER() OVER (ORDER BY SUM(ws.weight_kg * ws.reps) DESC),
        SUM(ws.weight_kg * ws.reps),
        v_period_start,
        v_period_end
    FROM workout_sets ws
    JOIN workouts w ON w.id = ws.workout_id
    WHERE w.started_at >= v_period_start
    AND w.started_at <= v_period_end
    AND w.deleted_at IS NULL
    AND ws.deleted_at IS NULL
    GROUP BY ws.user_id
    HAVING SUM(ws.weight_kg * ws.reps) > 0
    ORDER BY SUM(ws.weight_kg * ws.reps) DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Compute Weekly Workouts Leaderboard
-- ============================================================================

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

-- ============================================================================
-- FUNCTION: Compute Monthly XP Leaderboard
-- ============================================================================

CREATE OR REPLACE FUNCTION compute_monthly_xp_leaderboard()
RETURNS void AS $$
DECLARE
    v_leaderboard_id UUID;
    v_period_start TIMESTAMPTZ;
    v_period_end TIMESTAMPTZ;
BEGIN
    SELECT id INTO v_leaderboard_id FROM leaderboards WHERE code = 'MONTHLY_XP';
    IF v_leaderboard_id IS NULL THEN RETURN; END IF;

    v_period_start := get_month_start();
    v_period_end := get_month_end();

    DELETE FROM leaderboard_entries
    WHERE leaderboard_id = v_leaderboard_id
    AND period_start = v_period_start;

    INSERT INTO leaderboard_entries (leaderboard_id, user_id, rank, score, period_start, period_end)
    SELECT
        v_leaderboard_id,
        user_id,
        ROW_NUMBER() OVER (ORDER BY SUM(xp_amount) DESC),
        SUM(xp_amount),
        v_period_start,
        v_period_end
    FROM user_xp_logs
    WHERE created_at >= v_period_start
    AND created_at <= v_period_end
    GROUP BY user_id
    HAVING SUM(xp_amount) > 0
    ORDER BY SUM(xp_amount) DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Compute Monthly PRs Leaderboard
-- ============================================================================

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
        w.user_id,
        ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC),
        COUNT(*),
        v_period_start,
        v_period_end
    FROM workout_sets ws
    JOIN workouts w ON w.id = ws.workout_id
    WHERE ws.is_pr = TRUE
    AND ws.created_at >= v_period_start
    AND ws.created_at <= v_period_end
    AND w.deleted_at IS NULL
    AND ws.deleted_at IS NULL
    GROUP BY w.user_id
    HAVING COUNT(*) > 0
    ORDER BY COUNT(*) DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Compute All-Time XP Leaderboard
-- ============================================================================

CREATE OR REPLACE FUNCTION compute_all_time_xp_leaderboard()
RETURNS void AS $$
DECLARE
    v_leaderboard_id UUID;
    v_period_start TIMESTAMPTZ := '1970-01-01'::TIMESTAMPTZ;
    v_period_end TIMESTAMPTZ := '2099-12-31'::TIMESTAMPTZ;
BEGIN
    SELECT id INTO v_leaderboard_id FROM leaderboards WHERE code = 'ALL_TIME_XP';
    IF v_leaderboard_id IS NULL THEN RETURN; END IF;

    DELETE FROM leaderboard_entries
    WHERE leaderboard_id = v_leaderboard_id;

    INSERT INTO leaderboard_entries (leaderboard_id, user_id, rank, score, period_start, period_end)
    SELECT
        v_leaderboard_id,
        user_id,
        ROW_NUMBER() OVER (ORDER BY total_xp DESC),
        total_xp,
        v_period_start,
        v_period_end
    FROM user_levels
    WHERE total_xp > 0
    ORDER BY total_xp DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Compute All-Time Workouts Leaderboard
-- ============================================================================

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

-- ============================================================================
-- FUNCTION: Compute All Leaderboards (Called by scheduled job)
-- ============================================================================

CREATE OR REPLACE FUNCTION compute_all_leaderboards()
RETURNS void AS $$
BEGIN
    PERFORM compute_weekly_volume_leaderboard();
    PERFORM compute_weekly_workouts_leaderboard();
    PERFORM compute_monthly_xp_leaderboard();
    PERFORM compute_monthly_prs_leaderboard();
    PERFORM compute_all_time_xp_leaderboard();
    PERFORM compute_all_time_workouts_leaderboard();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION compute_all_leaderboards IS 'Computes all leaderboard rankings. Called daily by scheduled job.';
