-- Migration: 00042_advanced_programs_tier.sql
-- Security: Add required_tier column to advanced_programs and enforce Elite-only access
-- Description: Advanced programs (5/3/1, etc.) require Elite tier subscription

-- ============================================================================
-- ADD REQUIRED_TIER COLUMN
-- ============================================================================
ALTER TABLE public.advanced_programs
  ADD COLUMN IF NOT EXISTS required_tier TEXT DEFAULT 'ELITE'
  CHECK (required_tier IN ('FREE', 'PRO', 'ELITE'));

COMMENT ON COLUMN public.advanced_programs.required_tier IS 
'SECURITY: Subscription tier required to enroll in this program. Advanced programs default to ELITE.';

-- Update existing programs to require Elite tier
UPDATE public.advanced_programs
SET required_tier = 'ELITE'
WHERE required_tier IS NULL OR required_tier = 'FREE';

-- Set default for future inserts
ALTER TABLE public.advanced_programs
  ALTER COLUMN required_tier SET DEFAULT 'ELITE';

-- ============================================================================
-- CREATE INDEX FOR TIER LOOKUPS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_advanced_programs_tier 
  ON public.advanced_programs(required_tier) 
  WHERE deleted_at IS NULL AND is_active = TRUE;
