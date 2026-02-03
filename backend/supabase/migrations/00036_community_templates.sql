-- Migration: 00036_community_templates
-- Description: Add usage_count to routines and seed curated templates for C7 (Community Templates)
-- Author: Engineering Team
-- Date: 2026-02-03

-- ============================================================================
-- ADD USAGE_COUNT TO ROUTINES
-- ============================================================================

ALTER TABLE routines
    ADD COLUMN IF NOT EXISTS usage_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN routines.usage_count IS 'C7: Number of times this routine has been copied by other users';

CREATE INDEX IF NOT EXISTS idx_routines_public_usage ON routines(is_public, usage_count DESC)
WHERE deleted_at IS NULL AND is_public = TRUE;

-- ============================================================================
-- SEED CURATED TEMPLATES
-- ============================================================================

-- Insert curated templates (these will be owned by a system user or marked as public)
-- Note: In production, these should be owned by a system/admin user account
-- For now, we'll insert them with a placeholder user_id (will need to be updated)

-- Full Body Push/Pull/Legs Split
INSERT INTO routines (id, user_id, name, notes, is_public, usage_count, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000'::uuid, -- Placeholder system user
    'Push/Pull/Legs Split',
    'Classic 3-day split: Push (chest, shoulders, triceps), Pull (back, biceps), Legs (quads, hamstrings, glutes)',
    TRUE,
    0,
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;

-- Upper/Lower Split
INSERT INTO routines (id, user_id, name, notes, is_public, usage_count, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Upper/Lower Split',
    '4-day split: Upper body (chest, back, shoulders, arms) and Lower body (legs, glutes)',
    TRUE,
    0,
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;

-- 5/3/1 Beginner
INSERT INTO routines (id, user_id, name, notes, is_public, usage_count, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    '5/3/1 Beginner',
    'Jim Wendler''s 5/3/1 program for beginners - focuses on the big 4 lifts',
    TRUE,
    0,
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;

-- Bro Split
INSERT INTO routines (id, user_id, name, notes, is_public, usage_count, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Bro Split',
    '5-day split: Chest, Back, Shoulders, Arms, Legs - one muscle group per day',
    TRUE,
    0,
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;

-- Full Body 3x/Week
INSERT INTO routines (id, user_id, name, notes, is_public, usage_count, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Full Body 3x/Week',
    'Full body workout 3 times per week - great for beginners and intermediate lifters',
    TRUE,
    0,
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- CREATE FUNCTION TO INCREMENT USAGE COUNT
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_routine_usage(routine_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE routines
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = routine_id_param
    AND is_public = TRUE
    AND deleted_at IS NULL;
END;
$$;

COMMENT ON FUNCTION increment_routine_usage IS 'C7: Atomically increment usage_count for public routines (templates)';

-- ============================================================================
-- UPDATE RLS POLICIES FOR PUBLIC ROUTINES
-- ============================================================================

-- RLS policy already allows reading public routines (see 00009_rls_policies.sql)
-- No changes needed - existing policy: (routines.user_id = auth.uid() OR routines.is_public = TRUE)
