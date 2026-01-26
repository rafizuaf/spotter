-- Migration: 00024_challenges.sql
-- Phase 2G: Social & Competition - Challenge System
-- Description: Add challenges, participants, and score tracking tables

-- ============================================================================
-- CHALLENGES TABLE
-- ============================================================================

CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) <= 100),
    description TEXT CHECK (char_length(description) <= 500),
    challenge_type TEXT NOT NULL CHECK (challenge_type IN (
        'MOST_VOLUME',      -- Most total weight lifted
        'MOST_WORKOUTS',    -- Most workout sessions
        'MOST_SETS',        -- Most sets completed
        'FIRST_TO_TARGET'   -- First to reach target_value
    )),
    target_value INTEGER, -- For FIRST_TO_TARGET type (e.g., 10000kg volume)
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING',    -- Not yet started
        'ACTIVE',     -- Currently running
        'COMPLETED',  -- Ended naturally
        'CANCELLED'   -- Cancelled by creator
    )),
    visibility TEXT NOT NULL DEFAULT 'FOLLOWERS' CHECK (visibility IN (
        'PUBLIC',       -- Anyone can see and join
        'FOLLOWERS',    -- Only followers can see and join
        'INVITE_ONLY'   -- Only invited users can join
    )),
    max_participants INTEGER DEFAULT 50 CHECK (max_participants >= 2 AND max_participants <= 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Validation: end_date must be after start_date
    CONSTRAINT check_dates CHECK (end_date > start_date),
    -- Validation: target_value required for FIRST_TO_TARGET
    CONSTRAINT check_target_value CHECK (
        (challenge_type = 'FIRST_TO_TARGET' AND target_value IS NOT NULL AND target_value > 0)
        OR (challenge_type != 'FIRST_TO_TARGET')
    )
);

-- Add comments for documentation
COMMENT ON TABLE challenges IS 'User-created fitness challenges for competition';
COMMENT ON COLUMN challenges.challenge_type IS 'Type of competition metric';
COMMENT ON COLUMN challenges.target_value IS 'Target value for FIRST_TO_TARGET challenges';
COMMENT ON COLUMN challenges.status IS 'Current state of the challenge';

-- ============================================================================
-- CHALLENGE PARTICIPANTS TABLE
-- ============================================================================

CREATE TABLE challenge_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN (
        'ACTIVE',      -- Currently participating
        'COMPLETED',   -- Finished the challenge
        'ABANDONED'    -- Left the challenge early
    )),
    current_score NUMERIC NOT NULL DEFAULT 0 CHECK (current_score >= 0),
    rank INTEGER, -- Calculated ranking (1 = first place)
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- One entry per user per challenge
    CONSTRAINT unique_challenge_participant UNIQUE (challenge_id, user_id)
);

COMMENT ON TABLE challenge_participants IS 'Users participating in challenges with their scores';
COMMENT ON COLUMN challenge_participants.current_score IS 'Running total score based on challenge type';
COMMENT ON COLUMN challenge_participants.rank IS 'Current rank among participants (1 = leader)';

-- ============================================================================
-- CHALLENGE SCORE LOGS TABLE (Audit Trail)
-- ============================================================================

CREATE TABLE challenge_score_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES challenge_participants(id) ON DELETE CASCADE,
    workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
    points_earned NUMERIC NOT NULL CHECK (points_earned > 0),
    running_total NUMERIC NOT NULL CHECK (running_total >= 0),
    description TEXT, -- e.g., "Chest Day - 5000kg volume"
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE challenge_score_logs IS 'Audit log of score updates for challenge participants';

-- ============================================================================
-- CHALLENGE INVITATIONS TABLE (For INVITE_ONLY challenges)
-- ============================================================================

CREATE TABLE challenge_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    invited_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING',   -- Waiting for response
        'ACCEPTED',  -- User joined
        'DECLINED',  -- User declined
        'EXPIRED'    -- Invitation expired
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One invitation per user per challenge
    CONSTRAINT unique_challenge_invitation UNIQUE (challenge_id, invited_user_id)
);

COMMENT ON TABLE challenge_invitations IS 'Invitations for INVITE_ONLY challenges';

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Challenges indexes
CREATE INDEX idx_challenges_status
    ON challenges(status)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_challenges_created_by
    ON challenges(created_by_id)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_challenges_dates
    ON challenges(start_date, end_date)
    WHERE deleted_at IS NULL AND status IN ('PENDING', 'ACTIVE');

CREATE INDEX idx_challenges_visibility
    ON challenges(visibility)
    WHERE deleted_at IS NULL AND status = 'ACTIVE';

CREATE INDEX idx_challenges_updated_at
    ON challenges(updated_at);

-- Participants indexes
CREATE INDEX idx_challenge_participants_challenge
    ON challenge_participants(challenge_id)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_challenge_participants_user
    ON challenge_participants(user_id)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_challenge_participants_rank
    ON challenge_participants(challenge_id, rank)
    WHERE deleted_at IS NULL AND status = 'ACTIVE';

CREATE INDEX idx_challenge_participants_updated_at
    ON challenge_participants(updated_at);

-- Score logs indexes
CREATE INDEX idx_challenge_score_logs_participant
    ON challenge_score_logs(participant_id);

CREATE INDEX idx_challenge_score_logs_workout
    ON challenge_score_logs(workout_id)
    WHERE workout_id IS NOT NULL;

-- Invitations indexes
CREATE INDEX idx_challenge_invitations_challenge
    ON challenge_invitations(challenge_id)
    WHERE status = 'PENDING';

CREATE INDEX idx_challenge_invitations_user
    ON challenge_invitations(invited_user_id)
    WHERE status = 'PENDING';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_score_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_invitations ENABLE ROW LEVEL SECURITY;

-- CHALLENGES RLS

-- View public challenges, own challenges, or follower challenges if following
CREATE POLICY "Users can view visible challenges"
    ON challenges
    FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            -- Own challenge
            created_by_id = auth.uid()
            -- Public challenge
            OR visibility = 'PUBLIC'
            -- Follower challenge (if following creator)
            OR (
                visibility = 'FOLLOWERS'
                AND EXISTS (
                    SELECT 1 FROM follows f
                    WHERE f.following_id = challenges.created_by_id
                    AND f.follower_id = auth.uid()
                    AND f.deleted_at IS NULL
                )
            )
            -- Invite-only challenge (if invited or participating)
            OR (
                visibility = 'INVITE_ONLY'
                AND (
                    EXISTS (
                        SELECT 1 FROM challenge_invitations ci
                        WHERE ci.challenge_id = challenges.id
                        AND ci.invited_user_id = auth.uid()
                    )
                    OR EXISTS (
                        SELECT 1 FROM challenge_participants cp
                        WHERE cp.challenge_id = challenges.id
                        AND cp.user_id = auth.uid()
                        AND cp.deleted_at IS NULL
                    )
                )
            )
        )
        -- Exclude challenges from blocked users
        AND NOT EXISTS (
            SELECT 1 FROM user_blocks ub
            WHERE (ub.blocker_id = auth.uid() AND ub.blocked_id = challenges.created_by_id)
               OR (ub.blocker_id = challenges.created_by_id AND ub.blocked_id = auth.uid())
        )
    );

-- Users can create challenges
CREATE POLICY "Users can create challenges"
    ON challenges
    FOR INSERT
    TO authenticated
    WITH CHECK (created_by_id = auth.uid());

-- Users can update own challenges (e.g., cancel)
CREATE POLICY "Users can update own challenges"
    ON challenges
    FOR UPDATE
    TO authenticated
    USING (created_by_id = auth.uid())
    WITH CHECK (created_by_id = auth.uid());

-- CHALLENGE PARTICIPANTS RLS

-- View participants of visible challenges
CREATE POLICY "Users can view participants of visible challenges"
    ON challenge_participants
    FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL
        AND EXISTS (
            SELECT 1 FROM challenges c
            WHERE c.id = challenge_participants.challenge_id
            AND c.deleted_at IS NULL
        )
    );

-- Users can join challenges (insert participant)
CREATE POLICY "Users can join challenges"
    ON challenge_participants
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update own participation (e.g., abandon)
CREATE POLICY "Users can update own participation"
    ON challenge_participants
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- CHALLENGE SCORE LOGS RLS

-- View score logs for visible challenge participants
CREATE POLICY "Users can view score logs"
    ON challenge_score_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM challenge_participants cp
            WHERE cp.id = challenge_score_logs.participant_id
            AND cp.deleted_at IS NULL
        )
    );

-- Only service role can insert score logs (via edge function)
-- No INSERT policy for authenticated users

-- CHALLENGE INVITATIONS RLS

-- Users can view invitations sent to them or sent by them
CREATE POLICY "Users can view own invitations"
    ON challenge_invitations
    FOR SELECT
    TO authenticated
    USING (
        invited_user_id = auth.uid()
        OR invited_by_id = auth.uid()
    );

-- Challenge creator can send invitations
CREATE POLICY "Challenge creators can send invitations"
    ON challenge_invitations
    FOR INSERT
    TO authenticated
    WITH CHECK (
        invited_by_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM challenges c
            WHERE c.id = challenge_id
            AND c.created_by_id = auth.uid()
            AND c.visibility = 'INVITE_ONLY'
            AND c.deleted_at IS NULL
        )
    );

-- Invited users can update invitation status (accept/decline)
CREATE POLICY "Invited users can respond to invitations"
    ON challenge_invitations
    FOR UPDATE
    TO authenticated
    USING (invited_user_id = auth.uid())
    WITH CHECK (invited_user_id = auth.uid());

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamps
CREATE TRIGGER set_challenges_updated_at
    BEFORE UPDATE ON challenges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_challenge_participants_updated_at
    BEFORE UPDATE ON challenge_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_challenge_invitations_updated_at
    BEFORE UPDATE ON challenge_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION: Auto-start challenges when start_date is reached
-- ============================================================================

CREATE OR REPLACE FUNCTION check_challenge_status()
RETURNS void AS $$
BEGIN
    -- Activate pending challenges that have started
    UPDATE challenges
    SET status = 'ACTIVE', updated_at = NOW()
    WHERE status = 'PENDING'
    AND start_date <= NOW()
    AND deleted_at IS NULL;

    -- Complete active challenges that have ended
    UPDATE challenges
    SET status = 'COMPLETED', updated_at = NOW()
    WHERE status = 'ACTIVE'
    AND end_date <= NOW()
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_challenge_status IS 'Called by scheduled job to update challenge statuses';

-- ============================================================================
-- FUNCTION: Update participant ranks after score change
-- ============================================================================

CREATE OR REPLACE FUNCTION update_challenge_ranks(p_challenge_id UUID)
RETURNS void AS $$
BEGIN
    WITH ranked AS (
        SELECT
            id,
            ROW_NUMBER() OVER (ORDER BY current_score DESC, joined_at ASC) as new_rank
        FROM challenge_participants
        WHERE challenge_id = p_challenge_id
        AND deleted_at IS NULL
        AND status = 'ACTIVE'
    )
    UPDATE challenge_participants cp
    SET rank = ranked.new_rank, updated_at = NOW()
    FROM ranked
    WHERE cp.id = ranked.id
    AND (cp.rank IS NULL OR cp.rank != ranked.new_rank);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_challenge_ranks IS 'Recalculates participant rankings for a challenge';
