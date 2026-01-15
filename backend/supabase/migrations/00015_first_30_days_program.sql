-- ============================================
-- Migration 00015: First 30 Days Program Tables
-- ============================================
-- A database-driven beginner program for NEWBIE users
-- 4 weeks, 3 workouts per week (12 total sessions)
-- Each session has an educational lesson + exercises

-- ============================================
-- Beginner Programs (definitions)
-- ============================================
CREATE TABLE beginner_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    duration_weeks INTEGER NOT NULL,
    workouts_per_week INTEGER NOT NULL,
    target_persona TEXT, -- NEWBIE, CASUAL, etc.
    icon_name TEXT, -- Ionicons name for display
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE TRIGGER update_beginner_programs_updated_at BEFORE
UPDATE ON beginner_programs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_beginner_programs_code ON beginner_programs(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_beginner_programs_active ON beginner_programs(is_active) WHERE deleted_at IS NULL;

-- ============================================
-- Beginner Program Days (12 days of content)
-- ============================================
CREATE TABLE beginner_program_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES beginner_programs(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL, -- 1-4
    day_number INTEGER NOT NULL, -- 1-3 within week
    day_title TEXT NOT NULL, -- "Day 1: Your First Push Day"
    lesson_title TEXT NOT NULL, -- "What is Resistance Training?"
    lesson_content TEXT NOT NULL, -- Markdown content
    exercises JSONB NOT NULL DEFAULT '[]', -- [{exercise_id, sets, reps, notes}]
    order_index INTEGER NOT NULL, -- Global order (1-12)
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ,
    -- Each day must be unique within a program
    UNIQUE(program_id, week_number, day_number),
    -- Ensure valid week/day ranges
    CHECK (week_number >= 1 AND week_number <= 4),
    CHECK (day_number >= 1 AND day_number <= 3)
);

CREATE TRIGGER update_beginner_program_days_updated_at BEFORE
UPDATE ON beginner_program_days FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_beginner_program_days_program_id ON beginner_program_days(program_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_beginner_program_days_order ON beginner_program_days(program_id, order_index) WHERE deleted_at IS NULL;

-- ============================================
-- User Program Enrollments (user progress)
-- ============================================
CREATE TABLE user_program_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES beginner_programs(id) ON DELETE CASCADE,
    current_day_index INTEGER DEFAULT 1 NOT NULL, -- 1-12, which day they're on
    days_completed INTEGER DEFAULT 0 NOT NULL, -- Total days completed
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ, -- NULL until finished
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ,
    -- One active enrollment per user per program
    UNIQUE(user_id, program_id),
    -- Ensure valid day index
    CHECK (current_day_index >= 1 AND current_day_index <= 12),
    CHECK (days_completed >= 0 AND days_completed <= 12)
);

CREATE TRIGGER update_user_program_enrollments_updated_at BEFORE
UPDATE ON user_program_enrollments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_user_program_enrollments_user_id ON user_program_enrollments(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_program_enrollments_active ON user_program_enrollments(user_id) WHERE completed_at IS NULL AND deleted_at IS NULL;

-- ============================================
-- User Program Day Progress (daily completion)
-- ============================================
CREATE TABLE user_program_day_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES user_program_enrollments(id) ON DELETE CASCADE,
    program_day_id UUID NOT NULL REFERENCES beginner_program_days(id) ON DELETE CASCADE,
    workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL, -- Links to logged workout
    lesson_read_at TIMESTAMPTZ, -- When they read the lesson
    workout_completed_at TIMESTAMPTZ, -- When they completed the workout
    skipped BOOLEAN DEFAULT FALSE,
    skip_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ,
    -- One progress record per enrollment per day
    UNIQUE(enrollment_id, program_day_id)
);

CREATE TRIGGER update_user_program_day_progress_updated_at BEFORE
UPDATE ON user_program_day_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_user_program_day_progress_enrollment ON user_program_day_progress(enrollment_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_program_day_progress_workout ON user_program_day_progress(workout_id) WHERE workout_id IS NOT NULL AND deleted_at IS NULL;

-- ============================================
-- RLS Policies
-- ============================================

-- Programs are publicly readable (seed data)
ALTER TABLE beginner_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Programs are publicly readable"
    ON beginner_programs FOR SELECT
    USING (deleted_at IS NULL);

-- Program days are publicly readable (seed data)
ALTER TABLE beginner_program_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Program days are publicly readable"
    ON beginner_program_days FOR SELECT
    USING (deleted_at IS NULL);

-- Enrollments are scoped to owner
ALTER TABLE user_program_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own enrollments"
    ON user_program_enrollments FOR SELECT
    USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can insert own enrollments"
    ON user_program_enrollments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own enrollments"
    ON user_program_enrollments FOR UPDATE
    USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can soft delete own enrollments"
    ON user_program_enrollments FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (deleted_at IS NOT NULL);

-- Day progress is scoped to owner (via enrollment)
ALTER TABLE user_program_day_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own day progress"
    ON user_program_day_progress FOR SELECT
    USING (
        deleted_at IS NULL AND
        EXISTS (
            SELECT 1 FROM user_program_enrollments e
            WHERE e.id = enrollment_id
            AND e.user_id = auth.uid()
            AND e.deleted_at IS NULL
        )
    );

CREATE POLICY "Users can insert own day progress"
    ON user_program_day_progress FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_program_enrollments e
            WHERE e.id = enrollment_id
            AND e.user_id = auth.uid()
            AND e.deleted_at IS NULL
        )
    );

CREATE POLICY "Users can update own day progress"
    ON user_program_day_progress FOR UPDATE
    USING (
        deleted_at IS NULL AND
        EXISTS (
            SELECT 1 FROM user_program_enrollments e
            WHERE e.id = enrollment_id
            AND e.user_id = auth.uid()
            AND e.deleted_at IS NULL
        )
    );

-- ============================================
-- Achievement for program completion
-- ============================================
INSERT INTO achievements (code, title, description, icon_url, threshold_value)
VALUES (
    'FIRST_30_DAYS_COMPLETE',
    'First 30 Days Graduate',
    'Completed the First 30 Days beginner program',
    'school-outline',
    1
);
