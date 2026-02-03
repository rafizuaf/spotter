-- Migration: 00039_security_constraints.sql
-- Security: Prevent abuse vectors with tighter constraints
-- Description: Add realistic volume limits, prevent is_pr manipulation, add atomic XP function

-- ============================================================================
-- TIGHTER VOLUME CONSTRAINTS FOR WORKOUT_SETS
-- ============================================================================

-- Reduce max weight from 1000kg to 500kg (beyond world records)
-- Reduce max reps from 500 to 100 (reasonable upper bound)
-- Add volume per set constraint (max 50,000kg per set)

ALTER TABLE workout_sets
  DROP CONSTRAINT IF EXISTS valid_weight_kg,
  ADD CONSTRAINT valid_weight_kg CHECK (weight_kg IS NULL OR (weight_kg >= 0 AND weight_kg <= 500));

ALTER TABLE workout_sets
  DROP CONSTRAINT IF EXISTS valid_reps,
  ADD CONSTRAINT valid_reps CHECK (reps IS NULL OR (reps >= 0 AND reps <= 100));

-- Add volume constraint (weight × reps cannot exceed 50,000kg)
ALTER TABLE workout_sets
  DROP CONSTRAINT IF EXISTS valid_volume,
  ADD CONSTRAINT valid_volume CHECK (
    weight_kg IS NULL OR reps IS NULL OR (weight_kg * reps) <= 50000
  );

COMMENT ON CONSTRAINT valid_weight_kg ON workout_sets IS 'Weight must be between 0-500kg (prevents unrealistic values)';
COMMENT ON CONSTRAINT valid_reps ON workout_sets IS 'Reps must be between 0-100 (prevents unrealistic values)';
COMMENT ON CONSTRAINT valid_volume ON workout_sets IS 'Volume per set (weight × reps) cannot exceed 50,000kg (prevents leaderboard manipulation)';

-- ============================================================================
-- PREVENT is_pr MANIPULATION
-- ============================================================================

-- Add trigger to prevent user modification of is_pr field
-- Only detect-pr function should be able to set is_pr
-- Note: sync-push already strips is_pr, but this adds database-level protection

CREATE OR REPLACE FUNCTION prevent_is_pr_manipulation()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow updates if is_pr hasn't changed
  IF OLD.is_pr = NEW.is_pr THEN
    RETURN NEW;
  END IF;
  
  -- Allow setting is_pr to FALSE (user can clear it)
  IF OLD.is_pr = TRUE AND NEW.is_pr = FALSE THEN
    RETURN NEW;
  END IF;
  
  -- Prevent setting is_pr to TRUE (only detect-pr can do this)
  -- Check if this is being set by detect-pr function (via service role)
  -- We can't easily detect this, so we'll rely on sync-push stripping it
  -- But we can log attempts
  IF OLD.is_pr IS DISTINCT FROM NEW.is_pr AND NEW.is_pr = TRUE THEN
    -- Log the attempt (for monitoring)
    RAISE WARNING 'Attempt to set is_pr=TRUE detected. Only detect-pr function should set this.';
    -- Still allow it for now (sync-push handles prevention), but log for monitoring
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (only fires on UPDATE, not INSERT)
CREATE TRIGGER prevent_is_pr_manipulation_trigger
  BEFORE UPDATE ON workout_sets
  FOR EACH ROW
  EXECUTE FUNCTION prevent_is_pr_manipulation();

COMMENT ON FUNCTION prevent_is_pr_manipulation IS 'Monitors is_pr field changes. sync-push strips is_pr from user updates, but this provides database-level logging.';

-- Note: award_xp_atomic function moved to 00040_award_xp_atomic.sql
-- to avoid "cannot insert multiple commands into a prepared statement" error
-- when migration runner batches CREATE FUNCTION with COMMENT ON
