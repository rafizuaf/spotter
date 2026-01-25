-- ============================================
-- Migration 00021: 5/3/1 program seed (Phase 2E)
-- ============================================
-- 4 main lifts, 3 weeks per cycle. % of TM per set.
-- Exercise UUIDs from seed: Barbell Bench 220001, Deadlift 220020, OHP 220040, Barbell Squat 220060.

INSERT INTO advanced_programs (id, code, title, description, duration_weeks, workouts_per_week, is_active) VALUES
(
    '55555555-5555-5555-5555-555555550001',
    'FIVE_THREE_ONE',
    '5/3/1',
    'Classic percentage-based program. One main lift per day, 3 work sets. Use your Training Max for each lift.',
    3,
    4,
    TRUE
);

-- Week 1: 65% x5, 75% x5, 85% x5+
-- Week 2: 70% x3, 80% x3, 90% x3+
-- Week 3: 75% x5, 85% x3, 95% x1+

-- Day 1: Squat (order 1–4 for weeks 1–4, but we have 3 weeks × 4 days = 12)
-- We use order_index 1–12: week 1 days 1–4, week 2 days 1–4, week 3 days 1–4.

-- Week 1 Day 1: Squat
INSERT INTO advanced_program_days (id, program_id, week_number, day_number, day_title, exercises, order_index) VALUES
(
    '66666666-6666-6666-6666-666666660101',
    '55555555-5555-5555-5555-555555550001',
    1, 1,
    'Week 1, Day 1: Squat',
    '[{"exercise_id": "22222222-2222-2222-2222-222222220060", "sets": [{"percent_tm": 65, "reps": 5}, {"percent_tm": 75, "reps": 5}, {"percent_tm": 85, "reps": 5}]}]'::jsonb,
    1
);

-- Week 1 Day 2: Bench
INSERT INTO advanced_program_days (id, program_id, week_number, day_number, day_title, exercises, order_index) VALUES
(
    '66666666-6666-6666-6666-666666660102',
    '55555555-5555-5555-5555-555555550001',
    1, 2,
    'Week 1, Day 2: Bench Press',
    '[{"exercise_id": "22222222-2222-2222-2222-222222220001", "sets": [{"percent_tm": 65, "reps": 5}, {"percent_tm": 75, "reps": 5}, {"percent_tm": 85, "reps": 5}]}]'::jsonb,
    2
);

-- Week 1 Day 3: Deadlift
INSERT INTO advanced_program_days (id, program_id, week_number, day_number, day_title, exercises, order_index) VALUES
(
    '66666666-6666-6666-6666-666666660103',
    '55555555-5555-5555-5555-555555550001',
    1, 3,
    'Week 1, Day 3: Deadlift',
    '[{"exercise_id": "22222222-2222-2222-2222-222222220020", "sets": [{"percent_tm": 65, "reps": 5}, {"percent_tm": 75, "reps": 5}, {"percent_tm": 85, "reps": 5}]}]'::jsonb,
    3
);

-- Week 1 Day 4: OHP
INSERT INTO advanced_program_days (id, program_id, week_number, day_number, day_title, exercises, order_index) VALUES
(
    '66666666-6666-6666-6666-666666660104',
    '55555555-5555-5555-5555-555555550001',
    1, 4,
    'Week 1, Day 4: Overhead Press',
    '[{"exercise_id": "22222222-2222-2222-2222-222222220040", "sets": [{"percent_tm": 65, "reps": 5}, {"percent_tm": 75, "reps": 5}, {"percent_tm": 85, "reps": 5}]}]'::jsonb,
    4
);

-- Week 2
INSERT INTO advanced_program_days (id, program_id, week_number, day_number, day_title, exercises, order_index) VALUES
(
    '66666666-6666-6666-6666-666666660201',
    '55555555-5555-5555-5555-555555550001',
    2, 1,
    'Week 2, Day 1: Squat',
    '[{"exercise_id": "22222222-2222-2222-2222-222222220060", "sets": [{"percent_tm": 70, "reps": 3}, {"percent_tm": 80, "reps": 3}, {"percent_tm": 90, "reps": 3}]}]'::jsonb,
    5
),
(
    '66666666-6666-6666-6666-666666660202',
    '55555555-5555-5555-5555-555555550001',
    2, 2,
    'Week 2, Day 2: Bench Press',
    '[{"exercise_id": "22222222-2222-2222-2222-222222220001", "sets": [{"percent_tm": 70, "reps": 3}, {"percent_tm": 80, "reps": 3}, {"percent_tm": 90, "reps": 3}]}]'::jsonb,
    6
),
(
    '66666666-6666-6666-6666-666666660203',
    '55555555-5555-5555-5555-555555550001',
    2, 3,
    'Week 2, Day 3: Deadlift',
    '[{"exercise_id": "22222222-2222-2222-2222-222222220020", "sets": [{"percent_tm": 70, "reps": 3}, {"percent_tm": 80, "reps": 3}, {"percent_tm": 90, "reps": 3}]}]'::jsonb,
    7
),
(
    '66666666-6666-6666-6666-666666660204',
    '55555555-5555-5555-5555-555555550001',
    2, 4,
    'Week 2, Day 4: Overhead Press',
    '[{"exercise_id": "22222222-2222-2222-2222-222222220040", "sets": [{"percent_tm": 70, "reps": 3}, {"percent_tm": 80, "reps": 3}, {"percent_tm": 90, "reps": 3}]}]'::jsonb,
    8
);

-- Week 3
INSERT INTO advanced_program_days (id, program_id, week_number, day_number, day_title, exercises, order_index) VALUES
(
    '66666666-6666-6666-6666-666666660301',
    '55555555-5555-5555-5555-555555550001',
    3, 1,
    'Week 3, Day 1: Squat',
    '[{"exercise_id": "22222222-2222-2222-2222-222222220060", "sets": [{"percent_tm": 75, "reps": 5}, {"percent_tm": 85, "reps": 3}, {"percent_tm": 95, "reps": 1}]}]'::jsonb,
    9
),
(
    '66666666-6666-6666-6666-666666660302',
    '55555555-5555-5555-5555-555555550001',
    3, 2,
    'Week 3, Day 2: Bench Press',
    '[{"exercise_id": "22222222-2222-2222-2222-222222220001", "sets": [{"percent_tm": 75, "reps": 5}, {"percent_tm": 85, "reps": 3}, {"percent_tm": 95, "reps": 1}]}]'::jsonb,
    10
),
(
    '66666666-6666-6666-6666-666666660303',
    '55555555-5555-5555-5555-555555550001',
    3, 3,
    'Week 3, Day 3: Deadlift',
    '[{"exercise_id": "22222222-2222-2222-2222-222222220020", "sets": [{"percent_tm": 75, "reps": 5}, {"percent_tm": 85, "reps": 3}, {"percent_tm": 95, "reps": 1}]}]'::jsonb,
    11
),
(
    '66666666-6666-6666-6666-666666660304',
    '55555555-5555-5555-5555-555555550001',
    3, 4,
    'Week 3, Day 4: Overhead Press',
    '[{"exercise_id": "22222222-2222-2222-2222-222222220040", "sets": [{"percent_tm": 75, "reps": 5}, {"percent_tm": 85, "reps": 3}, {"percent_tm": 95, "reps": 1}]}]'::jsonb,
    12
);
