-- Migration: 00037_challenge_rewards.sql
-- Phase 2G: Challenge Rewards System
-- Description: Add XP source types and achievements for challenge rewards

-- ============================================================================
-- ALTER XP SOURCE TYPE ENUM
-- ============================================================================

-- Add new XP source types for challenge rewards
-- Note: PostgreSQL doesn't support ALTER TYPE ADD VALUE in a transaction,
-- so we need to use a workaround or handle this carefully
-- For Supabase, we'll use ALTER TYPE ... ADD VALUE IF NOT EXISTS pattern

DO $$ 
BEGIN
    -- Add CHALLENGE_WIN if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'CHALLENGE_WIN' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'xp_source_type')
    ) THEN
        ALTER TYPE xp_source_type ADD VALUE 'CHALLENGE_WIN';
    END IF;

    -- Add CHALLENGE_PODIUM if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'CHALLENGE_PODIUM' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'xp_source_type')
    ) THEN
        ALTER TYPE xp_source_type ADD VALUE 'CHALLENGE_PODIUM';
    END IF;

    -- Add CHALLENGE_PARTICIPATION if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'CHALLENGE_PARTICIPATION' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'xp_source_type')
    ) THEN
        ALTER TYPE xp_source_type ADD VALUE 'CHALLENGE_PARTICIPATION';
    END IF;
END $$;

-- ============================================================================
-- ADD REWARDS PROCESSED TRACKING TO CHALLENGES
-- ============================================================================

-- Add column to track if rewards have been processed
ALTER TABLE challenges
ADD COLUMN IF NOT EXISTS rewards_processed_at TIMESTAMPTZ;

COMMENT ON COLUMN challenges.rewards_processed_at IS 'Timestamp when challenge rewards (XP, badges, notifications) were processed. NULL means not yet processed.';

-- ============================================================================
-- SEED CHALLENGE ACHIEVEMENTS
-- ============================================================================

INSERT INTO achievements (code, title, description, icon_url, threshold_value, relevant_muscle_group)
VALUES
    ('CHALLENGE_FIRST_WIN', 'Champion', 'Win your first challenge', NULL, 1, NULL),
    ('CHALLENGE_5_WINS', 'Serial Winner', 'Win 5 challenges', NULL, 5, NULL),
    ('CHALLENGE_10_PARTICIPATIONS', 'Competitor', 'Complete 10 challenges', NULL, 10, NULL),
    ('CHALLENGE_CREATOR', 'Community Builder', 'Create a challenge with 10+ participants who finished', NULL, 10, NULL)
ON CONFLICT (code) DO NOTHING;

COMMENT ON TABLE achievements IS 'Achievement definitions including challenge-related achievements';
