-- ============================================
-- Migration 00019: user_training_maxes (Phase 2E)
-- ============================================
-- Training max (TM) and optional 1RM per user per exercise.
-- Used for percentage-based training (5/3/1, etc.) and % calculator in workout UI.

CREATE TABLE IF NOT EXISTS public.user_training_maxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    training_max_kg NUMERIC(7, 2) NOT NULL,
    one_rep_max_kg NUMERIC(7, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(user_id, exercise_id)
);

CREATE TRIGGER update_user_training_maxes_updated_at
    BEFORE UPDATE ON public.user_training_maxes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_user_training_maxes_user_id
    ON public.user_training_maxes(user_id)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_user_training_maxes_user_exercise
    ON public.user_training_maxes(user_id, exercise_id)
    WHERE deleted_at IS NULL;

ALTER TABLE public.user_training_maxes
    ADD CONSTRAINT check_training_max_positive
    CHECK (training_max_kg > 0 AND training_max_kg <= 1000);

ALTER TABLE public.user_training_maxes
    ADD CONSTRAINT check_one_rep_max_positive
    CHECK (one_rep_max_kg IS NULL OR (one_rep_max_kg > 0 AND one_rep_max_kg <= 1000));

ALTER TABLE public.user_training_maxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own training maxes"
    ON public.user_training_maxes FOR SELECT
    USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can insert own training maxes"
    ON public.user_training_maxes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own training maxes"
    ON public.user_training_maxes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own training maxes"
    ON public.user_training_maxes FOR DELETE
    USING (auth.uid() = user_id);
