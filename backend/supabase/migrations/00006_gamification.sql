-- ============================================
-- Migration 00006: Gamification (XP, Levels, Badges)
-- ============================================
-- ============================================
-- XP Source Types
-- ============================================
CREATE TYPE xp_source_type AS ENUM ('SET', 'WORKOUT', 'BONUS');

-- ============================================
-- User XP Logs (append-only, NEVER update or delete)
-- ============================================
CREATE TABLE user_xp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_type xp_source_type NOT NULL,
    source_id UUID NOT NULL,
    -- References workout_sets.id or workouts.id
    xp_amount INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    -- Unique constraint ensures idempotency
    UNIQUE(user_id, source_type, source_id)
);

CREATE INDEX idx_user_xp_logs_user_id ON user_xp_logs(user_id);

CREATE INDEX idx_user_xp_logs_created_at ON user_xp_logs(created_at DESC);

-- ============================================
-- User Levels (cached, can be regenerated)
-- ============================================
CREATE TABLE user_levels (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_xp INTEGER DEFAULT 0 NOT NULL,
    level INTEGER DEFAULT 1 NOT NULL,
    xp_to_next_level INTEGER DEFAULT 100 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- Achievements (seed data, definitions)
-- ============================================
CREATE TABLE achievements (
    code TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    threshold_value INTEGER,
    relevant_muscle_group TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- User Badges (earned achievements)
-- ============================================
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_code TEXT NOT NULL REFERENCES achievements(code),
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_rusty BOOLEAN DEFAULT FALSE,
    last_maintained_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ,
    UNIQUE(user_id, achievement_code)
);

CREATE TRIGGER update_user_badges_updated_at BEFORE
UPDATE
    ON user_badges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_user_badges_user_id ON user_badges(user_id)
WHERE
    deleted_at IS NULL;