-- Migration: 00034_debug_logging_enabled
-- Description: Add debug_logging_enabled flag to user_settings for B8 (Structured Logging)
-- Author: Engineering Team
-- Date: 2026-02-03

-- ============================================================================
-- ADD DEBUG LOGGING FLAG TO USER_SETTINGS
-- ============================================================================

ALTER TABLE user_settings
    ADD COLUMN IF NOT EXISTS debug_logging_enabled BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN user_settings.debug_logging_enabled IS 'B8: Enable debug-level logging for this user (for remote debugging in production)';
