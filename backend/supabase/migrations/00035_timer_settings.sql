-- Migration: 00035_timer_settings
-- Description: Add timer_enabled and timer_auto_start to user_settings for C4 (Rest Timer Controls)
-- Author: Engineering Team
-- Date: 2026-02-03

-- ============================================================================
-- ADD TIMER SETTINGS TO USER_SETTINGS
-- ============================================================================

ALTER TABLE user_settings
    ADD COLUMN IF NOT EXISTS timer_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE user_settings
    ADD COLUMN IF NOT EXISTS timer_auto_start BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN user_settings.timer_enabled IS 'C4: Enable/disable rest timer (On/Off)';
COMMENT ON COLUMN user_settings.timer_auto_start IS 'C4: Auto-start timer after completing set (On/Off)';
