-- ============================================
-- Migration 00001: Extensions and Helper Functions
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Helper function: Auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Helper function: Create user profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, username, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::text, 8)),
        NOW(),
        NOW()
    );

    INSERT INTO public.user_settings (user_id, created_at, updated_at)
    VALUES (NEW.id, NOW(), NOW());

    INSERT INTO public.user_levels (user_id, total_xp, level, xp_to_next_level, updated_at)
    VALUES (NEW.id, 0, 1, 100, NOW());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
