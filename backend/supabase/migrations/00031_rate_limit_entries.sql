-- Migration: Rate Limit Entries Table
-- Purpose: Store rate limit state in PostgreSQL for global enforcement across serverless instances
-- Created: 2026-02-03

-- Rate limit entries table
-- Stores per-user, per-endpoint rate limit counters
CREATE TABLE IF NOT EXISTS rate_limit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  count INT NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(identifier, endpoint)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup ON rate_limit_entries(identifier, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limit_reset ON rate_limit_entries(reset_at);

-- Function to clean up expired entries
-- Can be called periodically or on each rate limit check
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM rate_limit_entries
  WHERE reset_at < NOW();
END;
$$;

-- RLS: No user access (service role only)
-- Edge functions use supabaseAdmin to access this table
ALTER TABLE rate_limit_entries ENABLE ROW LEVEL SECURITY;

-- Deny all access (service role bypasses RLS)
CREATE POLICY "rate_limit_entries_service_role_only"
  ON rate_limit_entries
  FOR ALL
  USING (false);

-- Comment
COMMENT ON TABLE rate_limit_entries IS 'Stores rate limit counters per user/endpoint. Service role only.';
COMMENT ON FUNCTION cleanup_expired_rate_limits() IS 'Removes expired rate limit entries. Call periodically or on each check.';
