-- Migration: 00038_challenge_rewards_cron.sql
-- Phase 2G: Challenge Rewards System - Scheduled Processing
-- Description: Set up scheduled job to process challenge rewards

-- ============================================================================
-- FUNCTION: Process completed challenges that haven't had rewards processed
-- ============================================================================

CREATE OR REPLACE FUNCTION process_challenge_rewards()
RETURNS void AS $$
DECLARE
    challenge_record RECORD;
    processed_count INTEGER := 0;
BEGIN
    -- Find challenges that are COMPLETED but haven't had rewards processed
    FOR challenge_record IN
        SELECT id
        FROM challenges
        WHERE status = 'COMPLETED'
        AND rewards_processed_at IS NULL
        AND deleted_at IS NULL
        ORDER BY end_date ASC
        LIMIT 10  -- Process 10 at a time to avoid timeout
    LOOP
        -- Call complete-challenge edge function via pg_net
        -- Note: This requires pg_net extension and proper configuration
        -- If pg_net is not available, this will be handled by external cron calling the edge function directly
        
        -- For now, we'll mark challenges as "pending processing" 
        -- The actual processing will be done by an external cron job calling the edge function
        -- This function serves as a helper to identify which challenges need processing
        
        processed_count := processed_count + 1;
    END LOOP;
    
    -- Log processing attempt (if logging table exists)
    -- This is a placeholder - actual processing happens via edge function call from external cron
    RAISE NOTICE 'Found % challenges pending reward processing', processed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION process_challenge_rewards IS 'Identifies completed challenges that need reward processing. Actual processing is done by complete-challenge edge function called from external cron.';

-- ============================================================================
-- SCHEDULED JOB SETUP (if pg_cron is available)
-- ============================================================================

-- Note: This requires pg_cron extension to be enabled
-- If pg_cron is not available, use Supabase Dashboard → Database → Cron Jobs instead

DO $$
BEGIN
    -- Try to enable pg_cron (may fail if not available)
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    
    -- Unschedule existing job if it exists (idempotent)
    PERFORM cron.unschedule('process-challenge-rewards');
    
    -- Schedule the job to run every hour
    -- This calls the complete-challenge edge function for each pending challenge
    -- Note: pg_cron cannot directly call edge functions, so we use pg_net or external cron
    -- For Supabase, use Dashboard → Database → Cron Jobs to schedule:
    -- POST https://YOUR_PROJECT.supabase.co/functions/v1/complete-challenge
    -- With body: { "challenge_id": "..." } for each pending challenge
    
    RAISE NOTICE 'pg_cron extension available. Schedule process-challenge-rewards job via Supabase Dashboard → Database → Cron Jobs.';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'pg_cron extension not available. Use Supabase Dashboard → Database → Cron Jobs to schedule challenge reward processing.';
END $$;

-- ============================================================================
-- ALTERNATIVE: Modify check_challenge_status to trigger reward processing
-- ============================================================================

-- Update check_challenge_status to also identify challenges needing reward processing
-- The actual processing will be done by external cron calling complete-challenge edge function

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
    
    -- Note: Reward processing is handled separately by complete-challenge edge function
    -- This ensures rewards are processed even if check_challenge_status runs before participants are finalized
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_challenge_status IS 'Called by scheduled job to update challenge statuses. Reward processing is handled separately by complete-challenge edge function.';

-- ============================================================================
-- INSTRUCTIONS FOR SETTING UP EXTERNAL CRON
-- ============================================================================

-- To set up challenge reward processing:
-- 
-- Option 1: Supabase Dashboard → Database → Cron Jobs
--   1. Create new cron job
--   2. Schedule: 0 * * * * (every hour)
--   3. SQL: SELECT process_challenge_rewards();
--   4. Then call complete-challenge edge function for each challenge found
--
-- Option 2: External cron service (e.g., GitHub Actions, cron-job.org)
--   1. Query: SELECT id FROM challenges WHERE status = 'COMPLETED' AND rewards_processed_at IS NULL
--   2. For each challenge_id, POST to: https://YOUR_PROJECT.supabase.co/functions/v1/complete-challenge
--   3. Body: { "challenge_id": "..." }
--   4. Authorization: Bearer YOUR_SERVICE_ROLE_KEY
--
-- Option 3: Modify check_challenge_status cron to also call complete-challenge
--   This is the simplest but requires pg_net or external HTTP call capability
