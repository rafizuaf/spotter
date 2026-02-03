-- Migration: Idempotency Keys Table
-- Purpose: Store idempotency keys for deduplicating duplicate requests (e.g. workout completion retries)
-- Created: 2026-02-03

-- Idempotency keys table
-- Stores cached responses for duplicate requests within TTL window
CREATE TABLE IF NOT EXISTS idempotency_keys (
  idempotency_key TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_user ON idempotency_keys(user_id);

-- Function to clean up expired entries
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM idempotency_keys
  WHERE expires_at < NOW();
END;
$$;

-- RLS: No user access (service role only)
-- Edge functions use supabaseAdmin to access this table
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Deny all access (service role bypasses RLS)
CREATE POLICY "idempotency_keys_service_role_only"
  ON idempotency_keys
  FOR ALL
  USING (false);

-- Comment
COMMENT ON TABLE idempotency_keys IS 'Stores idempotency keys for deduplicating duplicate requests. Service role only.';
COMMENT ON FUNCTION cleanup_expired_idempotency_keys() IS 'Removes expired idempotency keys. Call periodically or on each check.';
