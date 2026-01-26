-- Migration: 00026_leaderboard_cron.sql
-- Phase 2G: Social & Competition - Leaderboards
-- Description: Setup scheduled job for daily leaderboard computation
--
-- NOTE: This migration requires pg_cron extension to be enabled in Supabase
-- If pg_cron is not available, use Supabase Dashboard → Database → Cron Jobs instead

-- ============================================================================
-- ENABLE PG_CRON EXTENSION (if not already enabled)
-- ============================================================================

-- Note: This may fail if pg_cron is not available in your Supabase instance
-- In that case, use Supabase Dashboard → Database → Cron Jobs to schedule manually
DO $$
BEGIN
  -- Try to enable pg_cron (may fail if not available)
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION
  WHEN OTHERS THEN
    -- Extension not available - user must use Supabase Dashboard
    RAISE NOTICE 'pg_cron extension not available. Please schedule leaderboard computation via Supabase Dashboard → Database → Cron Jobs';
END $$;

-- ============================================================================
-- SCHEDULE DAILY LEADERBOARD COMPUTATION
-- ============================================================================

-- Schedule daily computation at 1 AM UTC
-- This calls the compute-leaderboards edge function
-- Note: If job already exists, unschedule it first, then schedule again
DO $$
BEGIN
  -- Unschedule existing job if it exists (idempotent)
  PERFORM cron.unschedule('compute-leaderboards-daily');
EXCEPTION
  WHEN OTHERS THEN
    -- Job doesn't exist yet, that's fine
    NULL;
END $$;

-- Schedule the job
SELECT cron.schedule(
  'compute-leaderboards-daily',
  '0 1 * * *', -- 1 AM UTC daily (cron format: minute hour day month day-of-week)
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/compute-leaderboards',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) AS response;
  $$
);

-- Add comment
COMMENT ON EXTENSION pg_cron IS 'Scheduled job extension for leaderboard computation';

-- ============================================================================
-- ALTERNATIVE: Manual Setup Instructions
-- ============================================================================

-- If pg_cron is not available, use Supabase Dashboard:
-- 1. Go to Database → Cron Jobs
-- 2. Create new cron job:
--    - Name: compute-leaderboards-daily
--    - Schedule: 0 1 * * * (1 AM UTC daily)
--    - SQL: SELECT net.http_post(...) as above
--    - OR use Edge Function URL directly:
--      https://YOUR_PROJECT.supabase.co/functions/v1/compute-leaderboards
--      Method: POST
--      Headers: Authorization: Bearer SERVICE_ROLE_KEY
