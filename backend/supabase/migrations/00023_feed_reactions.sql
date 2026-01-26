-- Migration: 00023_feed_reactions.sql
-- Phase 2G: Social & Competition - Feed Reactions
-- Description: Add post reactions system (likes, fire, muscle, clap)

-- ============================================================================
-- POST REACTIONS TABLE
-- ============================================================================

CREATE TABLE post_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    social_post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('LIKE', 'FIRE', 'MUSCLE', 'CLAP')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Ensure one reaction type per user per post
    CONSTRAINT unique_user_post_reaction UNIQUE (social_post_id, user_id, reaction_type)
);

-- Add comment for documentation
COMMENT ON TABLE post_reactions IS 'Stores user reactions (likes, fire, muscle, clap) on social posts';
COMMENT ON COLUMN post_reactions.reaction_type IS 'Type of reaction: LIKE, FIRE, MUSCLE, or CLAP';

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for fetching reactions by post (most common query)
CREATE INDEX idx_post_reactions_post_id
    ON post_reactions(social_post_id)
    WHERE deleted_at IS NULL;

-- Index for fetching reactions by user (for user's reaction history)
CREATE INDEX idx_post_reactions_user_id
    ON post_reactions(user_id)
    WHERE deleted_at IS NULL;

-- Composite index for checking if user already reacted
CREATE INDEX idx_post_reactions_post_user
    ON post_reactions(social_post_id, user_id)
    WHERE deleted_at IS NULL;

-- Index for sync queries
CREATE INDEX idx_post_reactions_updated_at
    ON post_reactions(updated_at);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;

-- Users can view all non-deleted reactions on visible posts
CREATE POLICY "Users can view reactions on visible posts"
    ON post_reactions
    FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL
        AND EXISTS (
            SELECT 1 FROM social_posts sp
            WHERE sp.id = post_reactions.social_post_id
            AND sp.deleted_at IS NULL
            AND (
                sp.visibility = 'PUBLIC'
                OR sp.user_id = auth.uid()
                OR (
                    sp.visibility = 'FOLLOWERS'
                    AND EXISTS (
                        SELECT 1 FROM follows f
                        WHERE f.following_id = sp.user_id
                        AND f.follower_id = auth.uid()
                        AND f.deleted_at IS NULL
                    )
                )
            )
        )
        -- Exclude reactions from blocked users
        AND NOT EXISTS (
            SELECT 1 FROM user_blocks ub
            WHERE (ub.blocker_id = auth.uid() AND ub.blocked_id = post_reactions.user_id)
               OR (ub.blocker_id = post_reactions.user_id AND ub.blocked_id = auth.uid())
        )
    );

-- Users can create reactions on visible posts
CREATE POLICY "Users can create reactions"
    ON post_reactions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM social_posts sp
            WHERE sp.id = social_post_id
            AND sp.deleted_at IS NULL
            AND (
                sp.visibility = 'PUBLIC'
                OR sp.user_id = auth.uid()
                OR (
                    sp.visibility = 'FOLLOWERS'
                    AND EXISTS (
                        SELECT 1 FROM follows f
                        WHERE f.following_id = sp.user_id
                        AND f.follower_id = auth.uid()
                        AND f.deleted_at IS NULL
                    )
                )
            )
        )
        -- Cannot react to posts from blocked users
        AND NOT EXISTS (
            SELECT 1 FROM user_blocks ub
            JOIN social_posts sp ON sp.id = social_post_id
            WHERE (ub.blocker_id = auth.uid() AND ub.blocked_id = sp.user_id)
               OR (ub.blocker_id = sp.user_id AND ub.blocked_id = auth.uid())
        )
    );

-- Users can update (soft delete) their own reactions
CREATE POLICY "Users can update own reactions"
    ON post_reactions
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own reactions (for hard delete if needed)
CREATE POLICY "Users can delete own reactions"
    ON post_reactions
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER set_post_reactions_updated_at
    BEFORE UPDATE ON post_reactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ADD REACTION COUNT CACHE TO SOCIAL_POSTS (Optional optimization)
-- ============================================================================

-- Add cached reaction counts to social_posts for fast display
ALTER TABLE social_posts
    ADD COLUMN IF NOT EXISTS reaction_count_like INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reaction_count_fire INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reaction_count_muscle INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reaction_count_clap INTEGER NOT NULL DEFAULT 0;

-- Function to update reaction counts
CREATE OR REPLACE FUNCTION update_post_reaction_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE social_posts
        SET
            reaction_count_like = reaction_count_like + CASE WHEN NEW.reaction_type = 'LIKE' THEN 1 ELSE 0 END,
            reaction_count_fire = reaction_count_fire + CASE WHEN NEW.reaction_type = 'FIRE' THEN 1 ELSE 0 END,
            reaction_count_muscle = reaction_count_muscle + CASE WHEN NEW.reaction_type = 'MUSCLE' THEN 1 ELSE 0 END,
            reaction_count_clap = reaction_count_clap + CASE WHEN NEW.reaction_type = 'CLAP' THEN 1 ELSE 0 END,
            updated_at = NOW()
        WHERE id = NEW.social_post_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle soft delete (deleted_at changed from NULL to a value)
        IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
            UPDATE social_posts
            SET
                reaction_count_like = reaction_count_like - CASE WHEN NEW.reaction_type = 'LIKE' THEN 1 ELSE 0 END,
                reaction_count_fire = reaction_count_fire - CASE WHEN NEW.reaction_type = 'FIRE' THEN 1 ELSE 0 END,
                reaction_count_muscle = reaction_count_muscle - CASE WHEN NEW.reaction_type = 'MUSCLE' THEN 1 ELSE 0 END,
                reaction_count_clap = reaction_count_clap - CASE WHEN NEW.reaction_type = 'CLAP' THEN 1 ELSE 0 END,
                updated_at = NOW()
            WHERE id = NEW.social_post_id;
        -- Handle un-delete (deleted_at changed from a value to NULL)
        ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
            UPDATE social_posts
            SET
                reaction_count_like = reaction_count_like + CASE WHEN NEW.reaction_type = 'LIKE' THEN 1 ELSE 0 END,
                reaction_count_fire = reaction_count_fire + CASE WHEN NEW.reaction_type = 'FIRE' THEN 1 ELSE 0 END,
                reaction_count_muscle = reaction_count_muscle + CASE WHEN NEW.reaction_type = 'MUSCLE' THEN 1 ELSE 0 END,
                reaction_count_clap = reaction_count_clap + CASE WHEN NEW.reaction_type = 'CLAP' THEN 1 ELSE 0 END,
                updated_at = NOW()
            WHERE id = NEW.social_post_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.deleted_at IS NULL THEN
            UPDATE social_posts
            SET
                reaction_count_like = reaction_count_like - CASE WHEN OLD.reaction_type = 'LIKE' THEN 1 ELSE 0 END,
                reaction_count_fire = reaction_count_fire - CASE WHEN OLD.reaction_type = 'FIRE' THEN 1 ELSE 0 END,
                reaction_count_muscle = reaction_count_muscle - CASE WHEN OLD.reaction_type = 'MUSCLE' THEN 1 ELSE 0 END,
                reaction_count_clap = reaction_count_clap - CASE WHEN OLD.reaction_type = 'CLAP' THEN 1 ELSE 0 END,
                updated_at = NOW()
            WHERE id = OLD.social_post_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to keep counts in sync
CREATE TRIGGER trigger_update_post_reaction_counts
    AFTER INSERT OR UPDATE OR DELETE ON post_reactions
    FOR EACH ROW
    EXECUTE FUNCTION update_post_reaction_counts();
