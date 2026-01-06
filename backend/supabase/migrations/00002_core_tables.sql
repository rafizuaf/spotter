-- ============================================
-- Migration 00002: Core Tables
-- ============================================

-- ============================================
-- ENUM Types
-- ============================================
CREATE TYPE account_status AS ENUM ('ACTIVE', 'BANNED', 'DELETED_PENDING_PURGE');
CREATE TYPE subscription_tier AS ENUM ('FREE', 'PRO');
CREATE TYPE gender_type AS ENUM ('MALE', 'FEMALE', 'OTHER');
CREATE TYPE visibility_type AS ENUM ('PUBLIC', 'FOLLOWERS', 'PRIVATE');
CREATE TYPE rpe_system AS ENUM ('RPE', 'RIR');
CREATE TYPE weight_unit AS ENUM ('KG', 'LB');
CREATE TYPE distance_unit AS ENUM ('KM', 'MI');

-- ============================================
-- Users (public profile)
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    website_link TEXT,
    account_status account_status DEFAULT 'ACTIVE' NOT NULL,
    subscription_tier subscription_tier DEFAULT 'FREE' NOT NULL,
    is_trial_period BOOLEAN DEFAULT FALSE,
    subscription_expires_at TIMESTAMPTZ,
    terms_accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- User Settings (private)
-- ============================================
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    date_of_birth DATE,
    gender gender_type,
    height_cm NUMERIC(5,2),
    weight_unit_preference weight_unit DEFAULT 'KG',
    distance_unit_preference distance_unit DEFAULT 'KM',
    theme_preference TEXT DEFAULT 'system',
    keep_screen_awake BOOLEAN DEFAULT TRUE,
    timer_auto_start BOOLEAN DEFAULT TRUE,
    timer_vibration_enabled BOOLEAN DEFAULT TRUE,
    timer_sound_enabled BOOLEAN DEFAULT TRUE,
    input_mode_plate_math BOOLEAN DEFAULT FALSE,
    preferred_rpe_system rpe_system DEFAULT 'RPE',
    sync_to_health_kit BOOLEAN DEFAULT FALSE,
    auto_play_music_service TEXT,
    active_injuries JSONB DEFAULT '[]'::jsonb,
    default_workout_visibility visibility_type DEFAULT 'PUBLIC',
    notification_preferences JSONB DEFAULT '{}'::jsonb,
    equipment_overrides JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Equipment Bases (read-only seed data)
-- ============================================
CREATE TABLE equipment_bases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    standard_weight_kg NUMERIC(6,2),
    standard_unit TEXT DEFAULT 'kg',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- Exercises
-- ============================================
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    muscle_group TEXT,
    equipment_base_id UUID REFERENCES equipment_bases(id),
    video_url TEXT,
    instructions TEXT,
    is_custom BOOLEAN DEFAULT FALSE,
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE TRIGGER update_exercises_updated_at
    BEFORE UPDATE ON exercises
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_exercises_muscle_group ON exercises(muscle_group) WHERE deleted_at IS NULL;
CREATE INDEX idx_exercises_created_by ON exercises(created_by_user_id) WHERE deleted_at IS NULL;

-- ============================================
-- Exercise Swaps
-- ============================================
CREATE TABLE exercise_swaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_exercise_id UUID NOT NULL REFERENCES exercises(id),
    target_exercise_id UUID NOT NULL REFERENCES exercises(id),
    trigger_condition JSONB,
    efficiency_score NUMERIC(3,2),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE TRIGGER update_exercise_swaps_updated_at
    BEFORE UPDATE ON exercise_swaps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
