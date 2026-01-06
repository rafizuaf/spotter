-- ============================================
-- Migration 00005: Social Tables
-- ============================================
-- ============================================
-- Follows
-- ============================================
CREATE TABLE follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ,
    UNIQUE(follower_id, following_id)
);

CREATE TRIGGER update_follows_updated_at BEFORE
UPDATE
    ON follows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_follows_follower ON follows(follower_id)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_follows_following ON follows(following_id)
WHERE
    deleted_at IS NULL;

-- ============================================
-- User Blocks
-- ============================================
CREATE TABLE user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX idx_user_blocks_blocker ON user_blocks(blocker_id);

CREATE INDEX idx_user_blocks_blocked ON user_blocks(blocked_id);

-- ============================================
-- Social Posts
-- ============================================
CREATE TABLE social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
    achievement_code TEXT,
    generated_headline TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE TRIGGER update_social_posts_updated_at BEFORE
UPDATE
    ON social_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_social_posts_user_id ON social_posts(user_id)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_social_posts_created_at ON social_posts(created_at DESC)
WHERE
    deleted_at IS NULL;

-- ============================================
-- Content Reports
-- ============================================
CREATE TYPE report_status AS ENUM ('PENDING', 'REVIEWED', 'ACTIONED', 'DISMISSED');

CREATE TABLE content_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id),
    reported_post_id UUID NOT NULL REFERENCES social_posts(id),
    reason TEXT NOT NULL,
    status report_status DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_content_reports_status ON content_reports(status)
WHERE
    status = 'PENDING';