-- Migration: 00033_feature_flags
-- Description: B10 - Feature flags system with rollout percentages and server-side control
-- Author: Engineering Team
-- Date: 2026-02-03

-- ============================================================================
-- CREATE GLOBAL_FEATURE_FLAGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS global_feature_flags (
  flag_key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  rollout_percent INTEGER NOT NULL DEFAULT 0 CHECK (rollout_percent >= 0 AND rollout_percent <= 100),
  target_tiers TEXT[] DEFAULT '{}'::TEXT[],
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE global_feature_flags IS 'B10: Global feature flags with rollout percentages and tier targeting';
COMMENT ON COLUMN global_feature_flags.flag_key IS 'Unique identifier for the feature flag (e.g., viral_share, challenges)';
COMMENT ON COLUMN global_feature_flags.enabled IS 'Whether the flag is enabled globally';
COMMENT ON COLUMN global_feature_flags.rollout_percent IS 'Percentage of users who should see this feature (0-100). Used for gradual rollouts.';
COMMENT ON COLUMN global_feature_flags.target_tiers IS 'Array of tiers that can access this feature (empty = all tiers). Values: FREE, PRO, ELITE.';
COMMENT ON COLUMN global_feature_flags.description IS 'Human-readable description of what this flag controls';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON global_feature_flags(enabled) WHERE enabled = TRUE;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at
CREATE TRIGGER set_feature_flags_updated_at
  BEFORE UPDATE ON global_feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE global_feature_flags ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read feature flags
CREATE POLICY "feature_flags_read" ON global_feature_flags
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can write (via edge functions or admin tools)
-- Users cannot modify flags directly

-- ============================================================================
-- SEED INITIAL FLAGS
-- ============================================================================

INSERT INTO global_feature_flags (flag_key, enabled, rollout_percent, description) VALUES
  ('viral_share', true, 100, 'Enable viral sharing cards (Nutrition Label, Receipt, Archetype, etc.)'),
  ('challenges', true, 100, 'Enable challenges feature (create, join, compete)'),
  ('workout_partners', true, 50, 'Enable workout partners (50% gradual rollout)')
ON CONFLICT (flag_key) DO NOTHING;
