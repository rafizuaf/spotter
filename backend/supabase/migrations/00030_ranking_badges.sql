-- Migration: 00030_ranking_badges.sql
-- Ranking Badges & Profile Rankings
-- Description: Add ranking badge achievements, update compute functions to store all ranked
--   users (not just top 100), modify RLS for sync safety, add profile ranking settings.

-- ============================================================================
-- 1. INSERT RANKING BADGE ACHIEVEMENTS (24 total: 4 thresholds x 6 leaderboards)
-- ============================================================================

INSERT INTO achievements (code, title, description, threshold_value, relevant_muscle_group) VALUES
    -- Weekly Volume
    ('TOP_1_WEEKLY_VOLUME',  'Volume Titan',        'Ranked in the top 1% for weekly volume',   1, NULL),
    ('TOP_5_WEEKLY_VOLUME',  'Volume Warrior',       'Ranked in the top 5% for weekly volume',   5, NULL),
    ('TOP_10_WEEKLY_VOLUME', 'Volume Crusher',       'Ranked in the top 10% for weekly volume', 10, NULL),
    ('TOP_25_WEEKLY_VOLUME', 'Volume Contender',     'Ranked in the top 25% for weekly volume', 25, NULL),

    -- Weekly Workouts
    ('TOP_1_WEEKLY_WORKOUTS',  'Iron Addict',          'Ranked in the top 1% for weekly workouts',   1, NULL),
    ('TOP_5_WEEKLY_WORKOUTS',  'Gym Rat',              'Ranked in the top 5% for weekly workouts',   5, NULL),
    ('TOP_10_WEEKLY_WORKOUTS', 'Workout Machine',      'Ranked in the top 10% for weekly workouts', 10, NULL),
    ('TOP_25_WEEKLY_WORKOUTS', 'Consistent Crusher',   'Ranked in the top 25% for weekly workouts', 25, NULL),

    -- Monthly XP
    ('TOP_1_MONTHLY_XP',  'XP Legend',          'Ranked in the top 1% for monthly XP',   1, NULL),
    ('TOP_5_MONTHLY_XP',  'XP Master',          'Ranked in the top 5% for monthly XP',   5, NULL),
    ('TOP_10_MONTHLY_XP', 'XP Grinder',         'Ranked in the top 10% for monthly XP', 10, NULL),
    ('TOP_25_MONTHLY_XP', 'XP Earner',          'Ranked in the top 25% for monthly XP', 25, NULL),

    -- Monthly PRs
    ('TOP_1_MONTHLY_PRS',  'PR Phenomenon',      'Ranked in the top 1% for monthly PRs',   1, NULL),
    ('TOP_5_MONTHLY_PRS',  'PR Hunter Elite',    'Ranked in the top 5% for monthly PRs',   5, NULL),
    ('TOP_10_MONTHLY_PRS', 'PR Machine',         'Ranked in the top 10% for monthly PRs', 10, NULL),
    ('TOP_25_MONTHLY_PRS', 'PR Seeker',          'Ranked in the top 25% for monthly PRs', 25, NULL),

    -- All-Time XP
    ('TOP_1_ALL_TIME_XP',  'XP Overlord',        'Ranked in the top 1% for all-time XP',   1, NULL),
    ('TOP_5_ALL_TIME_XP',  'XP Veteran',         'Ranked in the top 5% for all-time XP',   5, NULL),
    ('TOP_10_ALL_TIME_XP', 'XP Elite',           'Ranked in the top 10% for all-time XP', 10, NULL),
    ('TOP_25_ALL_TIME_XP', 'XP Competitor',      'Ranked in the top 25% for all-time XP', 25, NULL),

    -- All-Time Workouts
    ('TOP_1_ALL_TIME_WORKOUTS',  'Lifetime Legend',     'Ranked in the top 1% for all-time workouts',   1, NULL),
    ('TOP_5_ALL_TIME_WORKOUTS',  'Lifetime Grinder',    'Ranked in the top 5% for all-time workouts',   5, NULL),
    ('TOP_10_ALL_TIME_WORKOUTS', 'Lifetime Warrior',    'Ranked in the top 10% for all-time workouts', 10, NULL),
    ('TOP_25_ALL_TIME_WORKOUTS', 'Lifetime Contender',  'Ranked in the top 25% for all-time workouts', 25, NULL)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 2. ADD last_total_participants TO LEADERBOARDS TABLE
-- ============================================================================

ALTER TABLE leaderboards
    ADD COLUMN IF NOT EXISTS last_total_participants INTEGER DEFAULT 0;

COMMENT ON COLUMN leaderboards.last_total_participants IS 'Total ranked participants from last computation (used for percentile display)';

-- ============================================================================
-- 3. ADD RANKING SETTINGS TO USER_SETTINGS TABLE
-- ============================================================================

ALTER TABLE user_settings
    ADD COLUMN IF NOT EXISTS show_profile_rankings BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS prominent_rank_leaderboard_code TEXT;

COMMENT ON COLUMN user_settings.show_profile_rankings IS 'Whether to display rankings on profile';
COMMENT ON COLUMN user_settings.prominent_rank_leaderboard_code IS 'Leaderboard code to feature prominently on profile (null = auto-select best rank)';

-- ============================================================================
-- 4. RECREATE COMPUTE FUNCTIONS (Remove LIMIT 100, track participant count)
-- ============================================================================

-- 4a. Weekly Volume
CREATE OR REPLACE FUNCTION compute_weekly_volume_leaderboard()
RETURNS void AS $$
DECLARE
    v_leaderboard_id UUID;
    v_period_start TIMESTAMPTZ;
    v_period_end TIMESTAMPTZ;
    v_count INTEGER;
BEGIN
    SELECT id INTO v_leaderboard_id FROM leaderboards WHERE code = 'WEEKLY_VOLUME';
    IF v_leaderboard_id IS NULL THEN RETURN; END IF;

    v_period_start := get_week_start();
    v_period_end := get_week_end();

    DELETE FROM leaderboard_entries
    WHERE leaderboard_id = v_leaderboard_id
    AND period_start = v_period_start;

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
    ORDER BY SUM(ws.weight_kg * ws.reps) DESC;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    UPDATE leaderboards SET last_total_participants = v_count, updated_at = NOW() WHERE id = v_leaderboard_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4b. Weekly Workouts
CREATE OR REPLACE FUNCTION compute_weekly_workouts_leaderboard()
RETURNS void AS $$
DECLARE
    v_leaderboard_id UUID;
    v_period_start TIMESTAMPTZ;
    v_period_end TIMESTAMPTZ;
    v_count INTEGER;
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
    AND deleted_at IS NULL
    GROUP BY user_id
    HAVING COUNT(*) > 0
    ORDER BY COUNT(*) DESC;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    UPDATE leaderboards SET last_total_participants = v_count, updated_at = NOW() WHERE id = v_leaderboard_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4c. Monthly XP
CREATE OR REPLACE FUNCTION compute_monthly_xp_leaderboard()
RETURNS void AS $$
DECLARE
    v_leaderboard_id UUID;
    v_period_start TIMESTAMPTZ;
    v_period_end TIMESTAMPTZ;
    v_count INTEGER;
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
    ORDER BY SUM(xp_amount) DESC;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    UPDATE leaderboards SET last_total_participants = v_count, updated_at = NOW() WHERE id = v_leaderboard_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4d. Monthly PRs
CREATE OR REPLACE FUNCTION compute_monthly_prs_leaderboard()
RETURNS void AS $$
DECLARE
    v_leaderboard_id UUID;
    v_period_start TIMESTAMPTZ;
    v_period_end TIMESTAMPTZ;
    v_count INTEGER;
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
    ORDER BY COUNT(*) DESC;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    UPDATE leaderboards SET last_total_participants = v_count, updated_at = NOW() WHERE id = v_leaderboard_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4e. All-Time XP
CREATE OR REPLACE FUNCTION compute_all_time_xp_leaderboard()
RETURNS void AS $$
DECLARE
    v_leaderboard_id UUID;
    v_period_start TIMESTAMPTZ := '1970-01-01'::TIMESTAMPTZ;
    v_period_end TIMESTAMPTZ := '2099-12-31'::TIMESTAMPTZ;
    v_count INTEGER;
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
    ORDER BY total_xp DESC;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    UPDATE leaderboards SET last_total_participants = v_count, updated_at = NOW() WHERE id = v_leaderboard_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4f. All-Time Workouts
CREATE OR REPLACE FUNCTION compute_all_time_workouts_leaderboard()
RETURNS void AS $$
DECLARE
    v_leaderboard_id UUID;
    v_period_start TIMESTAMPTZ := '1970-01-01'::TIMESTAMPTZ;
    v_period_end TIMESTAMPTZ := '2099-12-31'::TIMESTAMPTZ;
    v_count INTEGER;
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
    AND deleted_at IS NULL
    GROUP BY user_id
    HAVING COUNT(*) > 0
    ORDER BY COUNT(*) DESC;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    UPDATE leaderboards SET last_total_participants = v_count, updated_at = NOW() WHERE id = v_leaderboard_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- compute_all_leaderboards() does not need changes (it just calls the 6 functions above)

-- ============================================================================
-- 5. UPDATE RLS: Clients see top 100 + own entry (service role sees all)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view leaderboard entries" ON leaderboard_entries;

CREATE POLICY "Users can view leaderboard entries (top 100 + own)"
    ON leaderboard_entries
    FOR SELECT
    TO authenticated
    USING (
        (rank <= 100 OR user_id = auth.uid())
        AND NOT EXISTS (
            SELECT 1 FROM user_blocks ub
            WHERE (ub.blocker_id = auth.uid() AND ub.blocked_id = leaderboard_entries.user_id)
               OR (ub.blocker_id = leaderboard_entries.user_id AND ub.blocked_id = auth.uid())
        )
    );

-- ============================================================================
-- 6. UPDATE INDEX FOR NEW RLS PATTERN
-- ============================================================================

-- Drop old partial index that only covered rank <= 100
DROP INDEX IF EXISTS idx_leaderboard_entries_leaderboard_rank;

-- New index: covers both rank<=100 filter and user_id lookups in RLS
CREATE INDEX idx_leaderboard_entries_rank_user
    ON leaderboard_entries(leaderboard_id, rank, user_id);
