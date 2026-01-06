-- ============================================
-- Migration 00007: Notifications
-- ============================================
-- ============================================
-- Push Devices
-- ============================================
CREATE TABLE push_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expo_push_token TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ,
    UNIQUE(user_id, expo_push_token)
);

CREATE TRIGGER update_push_devices_updated_at BEFORE
UPDATE
    ON push_devices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_push_devices_user_id ON push_devices(user_id)
WHERE
    deleted_at IS NULL;

-- ============================================
-- Notifications
-- ============================================
CREATE TYPE notification_type AS ENUM (
    'FOLLOW',
    'LIKE',
    'COMMENT',
    'ACHIEVEMENT',
    'PR',
    'STREAK',
    'SYSTEM'
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id),
    type notification_type NOT NULL,
    metadata JSONB DEFAULT '{}' :: jsonb,
    title TEXT NOT NULL,
    body TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE TRIGGER update_notifications_updated_at BEFORE
UPDATE
    ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_notifications_unread ON notifications(recipient_id)
WHERE
    read_at IS NULL
    AND deleted_at IS NULL;

CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC)
WHERE
    deleted_at IS NULL;