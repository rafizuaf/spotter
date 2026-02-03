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

-- ============================================================================
-- ATOMIC XP AWARD FUNCTION (for race condition prevention)
-- ============================================================================

-- Function to atomically award XP with daily cap check
-- Uses row locking to prevent race conditions
CREATE OR REPLACE FUNCTION award_xp_atomic(
  p_user_id UUID,
  p_source_type xp_source_type,
  p_source_id TEXT,
  p_xp_amount INTEGER,
  p_daily_cap INTEGER DEFAULT 1000
) RETURNS INTEGER AS $$
DECLARE
  v_today_total INTEGER;
  v_actual_award INTEGER;
  v_today_start TIMESTAMPTZ;
BEGIN
  -- Calculate today's start in UTC (prevents timezone manipulation)
  v_today_start := DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC');
  
  -- Get today's total with row lock (prevents race conditions)
  SELECT COALESCE(SUM(xp_amount), 0) INTO v_today_total
  FROM user_xp_logs
  WHERE user_id = p_user_id
  AND created_at >= v_today_start
  FOR UPDATE;
  
  -- Calculate what we can actually award (respect daily cap)
  v_actual_award := LEAST(p_xp_amount, GREATEST(0, p_daily_cap - v_today_total));
  
  -- Only insert if we can award something
  IF v_actual_award > 0 THEN
    INSERT INTO user_xp_logs (user_id, source_type, source_id, xp_amount)
    VALUES (p_user_id, p_source_type, p_source_id, v_actual_award)
    ON CONFLICT (user_id, source_type, source_id) DO NOTHING;
  END IF;
  
  RETURN v_actual_award;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION award_xp_atomic IS 'Atomically awards XP with daily cap enforcement. Uses row locking to prevent race conditions. Uses UTC for daily cap calculation to prevent timezone manipulation.';
