-- Migration: 00040_award_xp_atomic.sql
-- Security: Atomic XP award function for race condition prevention
-- Split from 00039 to avoid "cannot insert multiple commands into a prepared statement"
-- when migration runner batches CREATE FUNCTION with COMMENT ON

-- Function to atomically award XP with daily cap check
-- Uses row locking to prevent race conditions
CREATE OR REPLACE FUNCTION award_xp_atomic(
  p_user_id UUID,
  p_source_type xp_source_type,
  p_source_id TEXT,
  p_xp_amount INTEGER,
  p_daily_cap INTEGER DEFAULT 1000
) RETURNS INTEGER AS $func$
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
$func$ LANGUAGE plpgsql SECURITY DEFINER;
