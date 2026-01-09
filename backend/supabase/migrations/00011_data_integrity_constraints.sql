-- ============================================================================
-- Migration: 00011_data_integrity_constraints.sql
-- Description: Add CHECK constraints for data integrity
-- Created: 2026-01-09
-- Priority: HIGH - Prevents invalid data from being stored
-- ============================================================================

-- ============================================================================
-- WORKOUT_SETS CONSTRAINTS
-- ============================================================================

-- Ensure reps is within reasonable bounds (0-500)
-- 500 is generous - covers high-rep endurance sets
ALTER TABLE workout_sets
  ADD CONSTRAINT valid_reps
  CHECK (reps IS NULL OR (reps >= 0 AND reps <= 500));

-- Ensure weight is within reasonable bounds (0-1000kg)
-- 1000kg covers all powerlifting world records with margin
ALTER TABLE workout_sets
  ADD CONSTRAINT valid_weight_kg
  CHECK (weight_kg IS NULL OR (weight_kg >= 0 AND weight_kg <= 1000));

-- Ensure RPE is within standard 1-10 scale
ALTER TABLE workout_sets
  ADD CONSTRAINT valid_rpe
  CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10));

-- Ensure RIR is within reasonable bounds (0-10)
ALTER TABLE workout_sets
  ADD CONSTRAINT valid_rir
  CHECK (rir IS NULL OR (rir >= 0 AND rir <= 10));

-- Ensure rest time is reasonable (0-3600 seconds = 0-60 minutes)
ALTER TABLE workout_sets
  ADD CONSTRAINT valid_rest_time
  CHECK (rest_time_seconds IS NULL OR (rest_time_seconds >= 0 AND rest_time_seconds <= 3600));

-- Ensure set duration is reasonable (0-3600 seconds = 0-60 minutes per set)
ALTER TABLE workout_sets
  ADD CONSTRAINT valid_duration
  CHECK (duration_seconds IS NULL OR (duration_seconds >= 0 AND duration_seconds <= 3600));

-- Ensure distance is reasonable (0-50000 meters = 0-50km per set)
ALTER TABLE workout_sets
  ADD CONSTRAINT valid_distance
  CHECK (distance_meters IS NULL OR (distance_meters >= 0 AND distance_meters <= 50000));

-- ============================================================================
-- USER_XP_LOGS CONSTRAINTS
-- ============================================================================

-- Add new enum values to xp_source_type (for streak and achievement XP)
-- Note: ALTER TYPE ADD VALUE cannot run inside a transaction in PostgreSQL
-- These will be added if they don't exist
ALTER TYPE xp_source_type ADD VALUE IF NOT EXISTS 'ACHIEVEMENT';
ALTER TYPE xp_source_type ADD VALUE IF NOT EXISTS 'STREAK';

-- Ensure XP amount is always positive (XP is never revoked)
ALTER TABLE user_xp_logs
  ADD CONSTRAINT positive_xp
  CHECK (xp_amount > 0);

-- ============================================================================
-- USER_LEVELS CONSTRAINTS
-- ============================================================================

-- Ensure user_id is unique (only one level record per user)
-- This prevents duplicate level entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_level'
  ) THEN
    ALTER TABLE user_levels
      ADD CONSTRAINT unique_user_level UNIQUE (user_id);
  END IF;
END $$;

-- Ensure level is at least 1
ALTER TABLE user_levels
  ADD CONSTRAINT valid_level
  CHECK (level >= 1);

-- Ensure total_xp is non-negative
ALTER TABLE user_levels
  ADD CONSTRAINT non_negative_total_xp
  CHECK (total_xp >= 0);

-- ============================================================================
-- USER_BODY_LOGS CONSTRAINTS
-- ============================================================================

-- Ensure body weight is reasonable (20-500kg covers all humans)
ALTER TABLE user_body_logs
  ADD CONSTRAINT valid_body_weight
  CHECK (weight_kg IS NULL OR (weight_kg >= 20 AND weight_kg <= 500));

-- Ensure body fat percentage is valid (0-100%)
ALTER TABLE user_body_logs
  ADD CONSTRAINT valid_body_fat
  CHECK (body_fat_pct IS NULL OR (body_fat_pct >= 0 AND body_fat_pct <= 100));

-- Ensure measurements are reasonable (0-300cm covers all humans)
ALTER TABLE user_body_logs
  ADD CONSTRAINT valid_measurements
  CHECK (
    (neck_cm IS NULL OR (neck_cm >= 0 AND neck_cm <= 100)) AND
    (shoulders_cm IS NULL OR (shoulders_cm >= 0 AND shoulders_cm <= 300)) AND
    (chest_cm IS NULL OR (chest_cm >= 0 AND chest_cm <= 300)) AND
    (waist_cm IS NULL OR (waist_cm >= 0 AND waist_cm <= 300)) AND
    (hips_cm IS NULL OR (hips_cm >= 0 AND hips_cm <= 300)) AND
    (bicep_left_cm IS NULL OR (bicep_left_cm >= 0 AND bicep_left_cm <= 100)) AND
    (bicep_right_cm IS NULL OR (bicep_right_cm >= 0 AND bicep_right_cm <= 100)) AND
    (thigh_left_cm IS NULL OR (thigh_left_cm >= 0 AND thigh_left_cm <= 150)) AND
    (thigh_right_cm IS NULL OR (thigh_right_cm >= 0 AND thigh_right_cm <= 150)) AND
    (calf_left_cm IS NULL OR (calf_left_cm >= 0 AND calf_left_cm <= 100)) AND
    (calf_right_cm IS NULL OR (calf_right_cm >= 0 AND calf_right_cm <= 100))
  );

-- ============================================================================
-- ROUTINE_EXERCISES CONSTRAINTS
-- ============================================================================

-- Ensure target sets/reps are reasonable
ALTER TABLE routine_exercises
  ADD CONSTRAINT valid_target_sets
  CHECK (target_sets IS NULL OR (target_sets >= 1 AND target_sets <= 20));

ALTER TABLE routine_exercises
  ADD CONSTRAINT valid_target_reps
  CHECK (target_reps IS NULL OR (target_reps >= 1 AND target_reps <= 100));

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON CONSTRAINT valid_reps ON workout_sets IS 'Reps must be between 0-500';
COMMENT ON CONSTRAINT valid_weight_kg ON workout_sets IS 'Weight must be between 0-1000kg';
COMMENT ON CONSTRAINT positive_xp ON user_xp_logs IS 'XP amounts must be positive (XP is never revoked)';
COMMENT ON CONSTRAINT valid_level ON user_levels IS 'Level must be at least 1';
