-- ============================================================================
-- Migration: 00018_rest_timer_settings.sql
-- Description: Add default rest time setting to user_settings
-- Created: 2026-01-16
-- Priority: MEDIUM - V2 Feature (Phase 2C - Rest Timer Improvements)
-- ============================================================================

-- ============================================================================
-- ADD DEFAULT REST TIME TO USER_SETTINGS
-- ============================================================================

-- Add default rest time in seconds
-- Default is 90 seconds (1.5 minutes), common rest time for compound exercises
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS default_rest_time_seconds INTEGER DEFAULT 90;

-- Add check constraint to ensure reasonable rest time (0 to 600 seconds / 10 minutes)
ALTER TABLE user_settings
  ADD CONSTRAINT check_default_rest_time_range
  CHECK (default_rest_time_seconds IS NULL OR (default_rest_time_seconds >= 0 AND default_rest_time_seconds <= 600));

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN user_settings.default_rest_time_seconds IS 'Default rest timer duration in seconds (0-600). Used when auto-starting rest timer after set completion.';
