-- ============================================
-- Migration 00020: Advanced programs (5/3/1, etc.) – Phase 2E
-- ============================================
-- %-based programs for Elite. Prescribed weights = TM * (percent_tm / 100).

-- ============================================
-- Advanced programs (definitions)
-- ============================================
CREATE TABLE IF NOT EXISTS public.advanced_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    duration_weeks INTEGER NOT NULL,
    workouts_per_week INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TRIGGER update_advanced_programs_updated_at
    BEFORE UPDATE ON public.advanced_programs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_advanced_programs_code ON public.advanced_programs(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_advanced_programs_active ON public.advanced_programs(is_active) WHERE deleted_at IS NULL;

-- ============================================
-- Advanced program days (%-based prescription)
-- ============================================
-- exercises JSONB: [{ "exercise_id": "uuid", "sets": [{ "percent_tm": 65, "reps": 5 }, ...] }]
CREATE TABLE IF NOT EXISTS public.advanced_program_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES public.advanced_programs(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    day_number INTEGER NOT NULL,
    day_title TEXT NOT NULL,
    exercises JSONB NOT NULL DEFAULT '[]',
    order_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(program_id, week_number, day_number)
);

CREATE TRIGGER update_advanced_program_days_updated_at
    BEFORE UPDATE ON public.advanced_program_days
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_advanced_program_days_program ON public.advanced_program_days(program_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_advanced_program_days_order ON public.advanced_program_days(program_id, order_index) WHERE deleted_at IS NULL;

-- ============================================
-- User advanced program enrollments
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_advanced_program_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES public.advanced_programs(id) ON DELETE CASCADE,
    current_week INTEGER NOT NULL DEFAULT 1,
    current_day INTEGER NOT NULL DEFAULT 1,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(user_id, program_id)
);

CREATE TRIGGER update_user_advanced_enrollments_updated_at
    BEFORE UPDATE ON public.user_advanced_program_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_user_adv_enrollments_user ON public.user_advanced_program_enrollments(user_id) WHERE deleted_at IS NULL;

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.advanced_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advanced_program_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_advanced_program_enrollments ENABLE ROW LEVEL SECURITY;

-- Programs and days: read-only for all authenticated users
CREATE POLICY "Authenticated can read advanced_programs"
    ON public.advanced_programs FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY "Authenticated can read advanced_program_days"
    ON public.advanced_program_days FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

-- Enrollments: users manage own rows
CREATE POLICY "Users can view own advanced enrollments"
    ON public.user_advanced_program_enrollments FOR SELECT
    USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can insert own advanced enrollments"
    ON public.user_advanced_program_enrollments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own advanced enrollments"
    ON public.user_advanced_program_enrollments FOR UPDATE
    USING (auth.uid() = user_id);
