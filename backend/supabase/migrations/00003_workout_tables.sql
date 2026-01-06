-- ============================================
-- Migration 00003: Workout Tables
-- ============================================
-- ============================================
-- Routines
-- ============================================
CREATE TABLE routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    notes TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE TRIGGER update_routines_updated_at BEFORE
UPDATE
    ON routines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_routines_user_id ON routines(user_id)
WHERE
    deleted_at IS NULL;

-- ============================================
-- Routine Exercises
-- ============================================
CREATE TABLE routine_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id),
    order_index TEXT NOT NULL,
    -- LexoRank for ordering
    target_sets INTEGER,
    target_reps INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE TRIGGER update_routine_exercises_updated_at BEFORE
UPDATE
    ON routine_exercises FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_routine_exercises_routine_id ON routine_exercises(routine_id)
WHERE
    deleted_at IS NULL;

-- ============================================
-- Workouts
-- ============================================
CREATE TABLE workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    routine_origin_id UUID REFERENCES routines(id),
    name TEXT,
    note TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    local_timezone TEXT,
    visibility visibility_type DEFAULT 'PUBLIC',
    wilks_score NUMERIC(6, 2),
    -- cached
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE TRIGGER update_workouts_updated_at BEFORE
UPDATE
    ON workouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_workouts_user_id ON workouts(user_id)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_workouts_started_at ON workouts(started_at DESC)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_workouts_sync ON workouts(updated_at)
WHERE
    deleted_at IS NULL;

-- ============================================
-- Workout Sets
-- ============================================
CREATE TABLE workout_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id),
    weight_kg NUMERIC(7, 2),
    -- TOTAL weight in KG (canonical unit)
    weight_plate_amount NUMERIC(7, 2),
    weight_base_amount NUMERIC(7, 2),
    original_input_unit weight_unit,
    original_input_value NUMERIC(7, 2),
    reps INTEGER,
    rpe NUMERIC(3, 1),
    -- 1-10 scale with 0.5 increments
    rir INTEGER,
    -- Reps in Reserve
    is_failure BOOLEAN DEFAULT FALSE,
    note TEXT,
    rest_time_seconds INTEGER,
    duration_seconds INTEGER,
    distance_meters NUMERIC(10, 2),
    is_pr BOOLEAN DEFAULT FALSE,
    set_order_index INTEGER NOT NULL,
    superset_group_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE TRIGGER update_workout_sets_updated_at BEFORE
UPDATE
    ON workout_sets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_workout_sets_workout_id ON workout_sets(workout_id)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_workout_sets_exercise_id ON workout_sets(exercise_id)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_workout_sets_is_pr ON workout_sets(exercise_id, is_pr)
WHERE
    is_pr = TRUE
    AND deleted_at IS NULL;

CREATE INDEX idx_workout_sets_sync ON workout_sets(updated_at)
WHERE
    deleted_at IS NULL;