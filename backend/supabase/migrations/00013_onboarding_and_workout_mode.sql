-- ============================================================================
-- Migration: 00013_onboarding_and_workout_mode.sql
-- Description: Add onboarding completion tracking and workout mode preference
-- Created: 2026-01-13
-- Priority: MEDIUM - V2 Feature (Phase 2A)
-- ============================================================================

-- ============================================================================
-- ADD ONBOARDING AND WORKOUT MODE TO USER_SETTINGS
-- ============================================================================

-- Add onboarding completion flag
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add onboarding persona selection (NEWBIE, CASUAL, REGULAR, DEDICATED)
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS onboarding_persona TEXT;

-- Add workout mode preference (SIMPLE, FULL)
-- SIMPLE: Weight + Reps only, big buttons, minimal UI
-- FULL: All fields (RPE, RIR, notes, percentage calculator)
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS workout_mode TEXT DEFAULT 'SIMPLE';

-- Add check constraint for workout_mode
ALTER TABLE user_settings
  ADD CONSTRAINT check_workout_mode 
  CHECK (workout_mode IS NULL OR workout_mode IN ('SIMPLE', 'FULL'));

-- Add check constraint for onboarding_persona
ALTER TABLE user_settings
  ADD CONSTRAINT check_onboarding_persona
  CHECK (onboarding_persona IS NULL OR onboarding_persona IN ('NEWBIE', 'CASUAL', 'REGULAR', 'DEDICATED'));

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN user_settings.onboarding_completed IS 'Whether user has completed the 3-screen onboarding flow';
COMMENT ON COLUMN user_settings.onboarding_persona IS 'User persona selected during onboarding (NEWBIE, CASUAL, REGULAR, DEDICATED)';
COMMENT ON COLUMN user_settings.workout_mode IS 'Workout UI mode: SIMPLE (weight+reps only) or FULL (all fields)';
