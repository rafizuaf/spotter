-- ============================================
-- Migration 00004: Body Tracking
-- ============================================
CREATE TABLE user_body_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    weight_kg NUMERIC(5, 2),
    body_fat_pct NUMERIC(4, 1),
    muscle_mass_kg NUMERIC(5, 2),
    neck_cm NUMERIC(5, 2),
    shoulders_cm NUMERIC(5, 2),
    chest_cm NUMERIC(5, 2),
    waist_cm NUMERIC(5, 2),
    hips_cm NUMERIC(5, 2),
    bicep_left_cm NUMERIC(5, 2),
    bicep_right_cm NUMERIC(5, 2),
    thigh_left_cm NUMERIC(5, 2),
    thigh_right_cm NUMERIC(5, 2),
    calf_left_cm NUMERIC(5, 2),
    calf_right_cm NUMERIC(5, 2),
    photo_front_url TEXT,
    photo_back_url TEXT,
    photo_side_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE TRIGGER update_user_body_logs_updated_at BEFORE
UPDATE
    ON user_body_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_user_body_logs_user_id ON user_body_logs(user_id)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_user_body_logs_logged_at ON user_body_logs(logged_at DESC)
WHERE
    deleted_at IS NULL;