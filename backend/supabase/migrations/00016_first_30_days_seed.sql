-- ============================================
-- Migration 00016: First 30 Days Program Seed Data
-- ============================================
-- 4 weeks, 3 workouts per week (12 total sessions)
-- Each session has an educational lesson + exercises

-- ============================================
-- First 30 Days Program Definition
-- ============================================
INSERT INTO beginner_programs (id, code, title, description, duration_weeks, workouts_per_week, target_persona, icon_name) VALUES
(
    '33333333-3333-3333-3333-333333330001',
    'FIRST_30_DAYS',
    'First 30 Days',
    'A complete introduction to strength training. Learn proper form, build foundational strength, and develop healthy workout habits.',
    4,
    3,
    'NEWBIE',
    'fitness-outline'
);

-- ============================================
-- Week 1: Foundation Week
-- ============================================

-- Day 1: Your First Push Day
INSERT INTO beginner_program_days (id, program_id, week_number, day_number, day_title, lesson_title, lesson_content, exercises, order_index) VALUES
(
    '44444444-4444-4444-4444-444444440101',
    '33333333-3333-3333-3333-333333330001',
    1, 1,
    'Day 1: Your First Push Day',
    'What is Resistance Training?',
    '## What is Resistance Training?

**Resistance training** (also called strength training or weight training) is exercise that causes your muscles to contract against an external resistance. This resistance can be dumbbells, barbells, machines, or even your own body weight.

### Why Should You Do It?

1. **Build Muscle** - Resistance training is the most effective way to build lean muscle mass
2. **Get Stronger** - Regular training improves your everyday strength
3. **Burn More Calories** - Muscle burns more calories than fat, even at rest
4. **Better Health** - Improves bone density, joint health, and reduces injury risk

### Today''s Workout: Push Day

"Push" exercises work muscles that extend your arms away from your body:
- **Chest** (pectorals)
- **Shoulders** (deltoids)
- **Triceps** (back of arms)

### Tips for Your First Day

- **Start Light** - Focus on learning the movement, not lifting heavy
- **Control the Weight** - Slow and controlled beats fast and sloppy
- **Breathe** - Exhale when pushing, inhale when lowering
- **Rest Between Sets** - 60-90 seconds is perfect for beginners

You''ve got this! Let''s build some strength.',
    '[
        {"exercise_id": "22222222-2222-2222-2222-222222220008", "sets": 3, "reps": "8-12", "notes": "Start from knees if needed"},
        {"exercise_id": "22222222-2222-2222-2222-222222220004", "sets": 3, "reps": "10-12", "notes": "Start with light dumbbells"},
        {"exercise_id": "22222222-2222-2222-2222-222222220093", "sets": 3, "reps": "12-15", "notes": "Keep elbows tucked"}
    ]'::jsonb,
    1
);

-- Day 2: Your First Pull Day
INSERT INTO beginner_program_days (id, program_id, week_number, day_number, day_title, lesson_title, lesson_content, exercises, order_index) VALUES
(
    '44444444-4444-4444-4444-444444440102',
    '33333333-3333-3333-3333-333333330001',
    1, 2,
    'Day 2: Your First Pull Day',
    'Understanding Muscle Groups',
    '## Understanding Muscle Groups

Your body has many muscles, but for training we group them by function. Understanding these groups helps you train effectively.

### Major Muscle Groups

**Upper Body Push:**
- Chest, Shoulders, Triceps
- Activated when pushing away from your body

**Upper Body Pull:**
- Back, Biceps, Rear Delts
- Activated when pulling toward your body

**Lower Body:**
- Quadriceps (front of thighs)
- Hamstrings (back of thighs)
- Glutes (butt muscles)
- Calves

### Today''s Workout: Pull Day

"Pull" exercises work muscles that bring your arms toward your body:
- **Back** (lats, rhomboids, traps)
- **Biceps** (front of arms)
- **Rear Deltoids** (back of shoulders)

### The Mind-Muscle Connection

Try to "feel" the muscle you''re working. When doing a row:
1. Think about squeezing your shoulder blades together
2. Feel your back muscles contract
3. Don''t just move the weight - control it

This awareness makes every rep more effective!',
    '[
        {"exercise_id": "22222222-2222-2222-2222-222222220027", "sets": 3, "reps": "10-12", "notes": "Pull to upper chest, squeeze lats"},
        {"exercise_id": "22222222-2222-2222-2222-222222220024", "sets": 3, "reps": "10-12", "notes": "Keep back flat, pull to hip"},
        {"exercise_id": "22222222-2222-2222-2222-222222220082", "sets": 3, "reps": "12-15", "notes": "Control the lowering phase"}
    ]'::jsonb,
    2
);

-- Day 3: Lower Body Foundations
INSERT INTO beginner_program_days (id, program_id, week_number, day_number, day_title, lesson_title, lesson_content, exercises, order_index) VALUES
(
    '44444444-4444-4444-4444-444444440103',
    '33333333-3333-3333-3333-333333330001',
    1, 3,
    'Day 3: Lower Body Foundations',
    'Why Leg Day Matters',
    '## Why Leg Day Matters

Many beginners skip leg day - don''t be one of them! Here''s why training legs is crucial:

### Benefits of Leg Training

1. **Biggest Muscles = Biggest Results**
   - Your legs contain the largest muscles in your body
   - Training them burns more calories than any other workout
   - More muscle mass = higher metabolism

2. **Functional Strength**
   - Strong legs make everyday activities easier
   - Better balance and stability
   - Reduced risk of injury

3. **Hormonal Benefits**
   - Leg training releases more growth hormone
   - This helps build muscle everywhere, not just your legs!

4. **Athletic Performance**
   - Nearly every sport requires leg strength
   - Jumping, running, cutting - all leg-driven

### Today''s Key Movement: The Squat

The squat is called the "king of exercises" because it:
- Works multiple muscle groups at once
- Builds functional strength
- Improves mobility and flexibility

### Squat Tips for Beginners

- Keep your chest up and core tight
- Push your knees out, tracking over your toes
- Go as deep as your mobility allows
- Drive through your whole foot, not just toes

Don''t skip leg day!',
    '[
        {"exercise_id": "22222222-2222-2222-2222-222222220070", "sets": 3, "reps": "10-12", "notes": "Hold dumbbell at chest, keep chest up"},
        {"exercise_id": "22222222-2222-2222-2222-222222220069", "sets": 3, "reps": "10 each leg", "notes": "Keep torso upright"},
        {"exercise_id": "22222222-2222-2222-2222-222222220062", "sets": 3, "reps": "12-15", "notes": "Control the weight down"}
    ]'::jsonb,
    3
);

-- ============================================
-- Week 2: Building Habits
-- ============================================

-- Day 4: Push Day Progression
INSERT INTO beginner_program_days (id, program_id, week_number, day_number, day_title, lesson_title, lesson_content, exercises, order_index) VALUES
(
    '44444444-4444-4444-4444-444444440201',
    '33333333-3333-3333-3333-333333330001',
    2, 1,
    'Day 4: Push Day Progression',
    'What is Progressive Overload?',
    '## What is Progressive Overload?

**Progressive overload** is the most important principle in strength training. It means gradually increasing the demands on your muscles over time.

### Why It Works

Your muscles adapt to stress. If you always lift the same weight for the same reps, your body has no reason to get stronger. Progressive overload gives your muscles a reason to grow.

### Ways to Progress

1. **Add Weight**
   - The most obvious method
   - Even 1-2 kg increase matters

2. **Add Reps**
   - Did 3x10? Try 3x12 next time
   - Once you hit 12+ reps, increase weight

3. **Add Sets**
   - More total volume = more growth stimulus
   - 3 sets → 4 sets

4. **Improve Form**
   - Better technique = more muscle activation
   - Full range of motion beats partial reps

### The 2-for-2 Rule

A simple progression method:
- If you can do 2 extra reps on your last 2 sets, increase the weight next workout

### Example

Week 1: Bench Press 20kg x 10, 10, 10
Week 2: Bench Press 20kg x 12, 11, 10
Week 3: Bench Press 22.5kg x 10, 9, 8
Week 4: Bench Press 22.5kg x 11, 10, 10

Progress isn''t always linear, but consistency wins!',
    '[
        {"exercise_id": "22222222-2222-2222-2222-222222220004", "sets": 3, "reps": "8-12", "notes": "Try to add 1-2 reps from Week 1"},
        {"exercise_id": "22222222-2222-2222-2222-222222220005", "sets": 3, "reps": "10-12", "notes": "Set bench to 30-45 degree angle"},
        {"exercise_id": "22222222-2222-2222-2222-222222220044", "sets": 3, "reps": "12-15", "notes": "Slight bend in elbows, raise to shoulder height"}
    ]'::jsonb,
    4
);

-- Day 5: Pull Day Progression
INSERT INTO beginner_program_days (id, program_id, week_number, day_number, day_title, lesson_title, lesson_content, exercises, order_index) VALUES
(
    '44444444-4444-4444-4444-444444440202',
    '33333333-3333-3333-3333-333333330001',
    2, 2,
    'Day 5: Pull Day Progression',
    'The Mind-Muscle Connection',
    '## The Mind-Muscle Connection

Have you ever done an exercise and felt it more in one muscle than another? That''s the mind-muscle connection at work.

### What Is It?

The mind-muscle connection is your ability to consciously focus on and activate a specific muscle during exercise. Research shows that focusing on the target muscle can increase muscle activation by up to 20%!

### How to Develop It

1. **Slow Down**
   - Faster isn''t better
   - Take 2-3 seconds on both lifting and lowering

2. **Visualize**
   - Before each set, think about the muscle you''re targeting
   - Picture it contracting and stretching

3. **Touch the Muscle**
   - Place your hand on the muscle (or have someone else)
   - Feel it contract during the movement

4. **Use Lighter Weights**
   - Ego lifting kills the connection
   - Perfect form with light weight beats sloppy heavy lifting

### Practical Tips for Pull Exercises

**Lat Pulldown:**
- Think "elbows to hips" not "hands to chest"
- Squeeze shoulder blades together at the bottom

**Rows:**
- Initiate by retracting shoulder blades
- Pull through your elbows, not your hands

**Curls:**
- Keep upper arms stationary
- Feel the bicep squeeze at the top

Today, focus on feeling every rep!',
    '[
        {"exercise_id": "22222222-2222-2222-2222-222222220025", "sets": 3, "reps": "As many as possible", "notes": "Use assisted machine if needed"},
        {"exercise_id": "22222222-2222-2222-2222-222222220028", "sets": 3, "reps": "10-12", "notes": "Squeeze shoulder blades, hold for 1 second"},
        {"exercise_id": "22222222-2222-2222-2222-222222220029", "sets": 3, "reps": "15-20", "notes": "Pull rope to face, separate hands at end"}
    ]'::jsonb,
    5
);

-- Day 6: Leg Day Progression
INSERT INTO beginner_program_days (id, program_id, week_number, day_number, day_title, lesson_title, lesson_content, exercises, order_index) VALUES
(
    '44444444-4444-4444-4444-444444440203',
    '33333333-3333-3333-3333-333333330001',
    2, 3,
    'Day 6: Leg Day Progression',
    'Rest and Recovery',
    '## Rest and Recovery

You don''t get stronger while lifting - you get stronger while recovering. Understanding recovery is crucial for progress.

### What Happens During Recovery?

When you lift weights, you create tiny tears in muscle fibers. During rest:
1. Your body repairs these tears
2. Muscles rebuild slightly stronger
3. You adapt to handle more stress next time

This is why rest days aren''t lazy - they''re essential!

### How Much Rest Do You Need?

**Between Sets:** 60-90 seconds for hypertrophy, 2-3 minutes for strength

**Between Workouts (same muscle):** 48-72 hours minimum

**Sleep:** 7-9 hours per night (this is when most recovery happens!)

### Signs You Need More Recovery

- Persistent soreness (DOMS lasting more than 3 days)
- Decreased performance
- Lack of motivation
- Poor sleep
- Getting sick frequently

### Recovery Tips

1. **Prioritize Sleep**
   - This is #1 by far
   - Growth hormone peaks during deep sleep

2. **Eat Enough Protein**
   - 1.6-2.2g per kg of bodyweight
   - Spread across meals

3. **Stay Hydrated**
   - Muscles are 75% water
   - Aim for 2-3 liters daily

4. **Light Movement**
   - Walking on rest days promotes blood flow
   - Helps clear metabolic waste

Remember: More isn''t always better. Train hard, recover harder.',
    '[
        {"exercise_id": "22222222-2222-2222-2222-222222220060", "sets": 3, "reps": "8-10", "notes": "Use just the bar or light weight to learn form"},
        {"exercise_id": "22222222-2222-2222-2222-222222220064", "sets": 3, "reps": "10-12", "notes": "Hinge at hips, feel hamstring stretch"},
        {"exercise_id": "22222222-2222-2222-2222-222222220066", "sets": 3, "reps": "12-15", "notes": "Control the weight, squeeze at top"}
    ]'::jsonb,
    6
);

-- ============================================
-- Week 3: Developing Strength
-- ============================================

-- Day 7: Push Day - Compound Focus
INSERT INTO beginner_program_days (id, program_id, week_number, day_number, day_title, lesson_title, lesson_content, exercises, order_index) VALUES
(
    '44444444-4444-4444-4444-444444440301',
    '33333333-3333-3333-3333-333333330001',
    3, 1,
    'Day 7: Push Day - Compound Focus',
    'Compound vs Isolation Exercises',
    '## Compound vs Isolation Exercises

Not all exercises are created equal. Understanding the difference between compound and isolation movements will help you train smarter.

### Compound Exercises

**Definition:** Movements that use multiple joints and muscle groups simultaneously.

**Examples:**
- Bench Press (shoulder + elbow joints)
- Squat (hip + knee + ankle joints)
- Deadlift (hip + knee joints)
- Overhead Press (shoulder + elbow joints)

**Benefits:**
- Build more muscle in less time
- Burn more calories
- Improve functional strength
- Release more growth hormone

### Isolation Exercises

**Definition:** Movements that target one muscle group and use one joint.

**Examples:**
- Bicep Curl (elbow joint only)
- Leg Extension (knee joint only)
- Lateral Raise (shoulder joint only)
- Tricep Pushdown (elbow joint only)

**Benefits:**
- Target specific weak points
- Less fatiguing
- Good for muscle "pump"
- Useful for injury prevention

### The 80/20 Rule

For beginners, aim for:
- **80% Compound movements** - Build your foundation
- **20% Isolation work** - Address weak points

As you advance, you may adjust this ratio based on your goals.

### Today''s Focus

We''re hitting the major compound movements for push day. Focus on form and gradually increasing weight!',
    '[
        {"exercise_id": "22222222-2222-2222-2222-222222220001", "sets": 4, "reps": "6-8", "notes": "First time with barbell - focus on form"},
        {"exercise_id": "22222222-2222-2222-2222-222222220040", "sets": 3, "reps": "8-10", "notes": "Press straight overhead, core tight"},
        {"exercise_id": "22222222-2222-2222-2222-222222220007", "sets": 3, "reps": "12-15", "notes": "Slight forward lean, squeeze chest"}
    ]'::jsonb,
    7
);

-- Day 8: Pull Day - Back Strength
INSERT INTO beginner_program_days (id, program_id, week_number, day_number, day_title, lesson_title, lesson_content, exercises, order_index) VALUES
(
    '44444444-4444-4444-4444-444444440302',
    '33333333-3333-3333-3333-333333330001',
    3, 2,
    'Day 8: Pull Day - Back Strength',
    'Sets, Reps, and Training Volume',
    '## Sets, Reps, and Training Volume

Understanding how sets and reps work together will help you design effective workouts.

### What''s a Rep?

One complete movement from start to finish. One bicep curl = 1 rep.

### What''s a Set?

A group of consecutive reps. "3 sets of 10 reps" means doing 10 reps, resting, then repeating twice more.

### Rep Ranges and Their Effects

**1-5 reps:** Strength focus
- Heavier weight
- Longer rest (2-3 minutes)
- Best for building maximal strength

**6-12 reps:** Hypertrophy (muscle growth)
- Moderate weight
- Moderate rest (60-90 seconds)
- Best balance of strength and size

**12-20+ reps:** Endurance focus
- Lighter weight
- Shorter rest (30-60 seconds)
- Good for conditioning and muscle endurance

### Training Volume

Volume = Sets x Reps x Weight

**Example:**
3 sets x 10 reps x 50kg = 1,500kg total volume

Higher volume generally = more muscle growth (to a point)

### Recommended Weekly Volume Per Muscle Group

- **Beginners:** 10-12 sets per muscle group
- **Intermediate:** 12-18 sets per muscle group
- **Advanced:** 18-24+ sets per muscle group

### Your Current Program

You''re doing roughly 9-12 sets per muscle group per week - perfect for a beginner! As you progress, we can add volume.',
    '[
        {"exercise_id": "22222222-2222-2222-2222-222222220021", "sets": 4, "reps": "6-8", "notes": "First barbell row - keep back flat"},
        {"exercise_id": "22222222-2222-2222-2222-222222220025", "sets": 3, "reps": "As many as possible", "notes": "Try to beat last week"},
        {"exercise_id": "22222222-2222-2222-2222-222222220083", "sets": 3, "reps": "10-12", "notes": "Palms face each other, squeeze at top"}
    ]'::jsonb,
    8
);

-- Day 9: Leg Day - Building Power
INSERT INTO beginner_program_days (id, program_id, week_number, day_number, day_title, lesson_title, lesson_content, exercises, order_index) VALUES
(
    '44444444-4444-4444-4444-444444440303',
    '33333333-3333-3333-3333-333333330001',
    3, 3,
    'Day 9: Leg Day - Building Power',
    'The Importance of Warm-Up',
    '## The Importance of Warm-Up

Skipping your warm-up is one of the biggest mistakes beginners make. A proper warm-up can improve performance and prevent injury.

### What Does a Warm-Up Do?

1. **Increases Body Temperature**
   - Warmer muscles contract more efficiently
   - Reduced risk of strains and tears

2. **Improves Blood Flow**
   - More oxygen to working muscles
   - Better nutrient delivery

3. **Enhances Range of Motion**
   - Joints move more freely
   - Better exercise technique

4. **Prepares the Nervous System**
   - Better mind-muscle connection
   - More force production

### A Good Warm-Up Routine

**Step 1: General Cardio (5 minutes)**
- Light jogging, cycling, or rowing
- Get your heart rate up slightly

**Step 2: Dynamic Stretches (5 minutes)**
- Leg swings
- Arm circles
- Hip circles
- Walking lunges

**Step 3: Specific Warm-Up Sets**
- Do 2-3 sets with lighter weight before working sets
- Example: If squatting 50kg, do: empty bar x 10, 30kg x 8, 40kg x 5

### Warm-Up DON''Ts

- Don''t do static stretching before lifting (save for after)
- Don''t warm up so long you''re tired
- Don''t skip it because you''re "short on time"

### Today''s Session

Start with 5 minutes of cardio and some leg swings before hitting these exercises!',
    '[
        {"exercise_id": "22222222-2222-2222-2222-222222220060", "sets": 4, "reps": "6-8", "notes": "Add a little weight from last week if form is solid"},
        {"exercise_id": "22222222-2222-2222-2222-222222220062", "sets": 3, "reps": "10-12", "notes": "Feet shoulder-width on platform"},
        {"exercise_id": "22222222-2222-2222-2222-222222220069", "sets": 3, "reps": "10 each leg", "notes": "Hold dumbbells for added challenge"}
    ]'::jsonb,
    9
);

-- ============================================
-- Week 4: Graduation Week
-- ============================================

-- Day 10: Full Push Workout
INSERT INTO beginner_program_days (id, program_id, week_number, day_number, day_title, lesson_title, lesson_content, exercises, order_index) VALUES
(
    '44444444-4444-4444-4444-444444440401',
    '33333333-3333-3333-3333-333333330001',
    4, 1,
    'Day 10: Full Push Workout',
    'Tracking Your Progress',
    '## Tracking Your Progress

What gets measured gets managed. Tracking your workouts is essential for continued progress.

### Why Track?

1. **See Progress Over Time**
   - Hard to remember what you lifted 3 weeks ago
   - Data shows your improvement

2. **Ensure Progressive Overload**
   - Know exactly what to beat
   - No guessing

3. **Identify Patterns**
   - Which exercises are improving?
   - Where are you stalled?

4. **Stay Motivated**
   - Looking back at progress is incredibly motivating
   - Especially on tough days

### What to Track

**Essential:**
- Exercise name
- Weight used
- Reps performed
- Sets completed

**Optional but Helpful:**
- RPE (Rate of Perceived Exertion)
- Rest times
- How you felt
- Bodyweight

### Tips for Tracking

1. **Log During Rest Periods**
   - Don''t trust your memory
   - Record immediately

2. **Be Honest**
   - Partial reps don''t count
   - Log what you actually did

3. **Review Weekly**
   - Look for trends
   - Plan next week''s progression

### The Spotter Advantage

This app tracks everything for you! Every set you log becomes data that shows your journey. Keep logging - your future self will thank you.

### Today''s Challenge

Try to set a personal record on bench press today! Even one more rep than last time counts.',
    '[
        {"exercise_id": "22222222-2222-2222-2222-222222220001", "sets": 4, "reps": "5-6", "notes": "PR attempt! Try to add weight from last week"},
        {"exercise_id": "22222222-2222-2222-2222-222222220005", "sets": 3, "reps": "8-10", "notes": "Control the weight down"},
        {"exercise_id": "22222222-2222-2222-2222-222222220044", "sets": 3, "reps": "12-15", "notes": "Feel the shoulders working"},
        {"exercise_id": "22222222-2222-2222-2222-222222220093", "sets": 3, "reps": "12-15", "notes": "Squeeze triceps at bottom"}
    ]'::jsonb,
    10
);

-- Day 11: Full Pull Workout
INSERT INTO beginner_program_days (id, program_id, week_number, day_number, day_title, lesson_title, lesson_content, exercises, order_index) VALUES
(
    '44444444-4444-4444-4444-444444440402',
    '33333333-3333-3333-3333-333333330001',
    4, 2,
    'Day 11: Full Pull Workout',
    'What''s Next After First 30 Days',
    '## What''s Next After First 30 Days

Congratulations! You''re almost done with your first structured program. Let''s talk about what comes next.

### What You''ve Accomplished

Over the past 4 weeks, you have:
- Learned fundamental movement patterns
- Built a base of strength
- Developed workout habits
- Understood key training principles

This foundation will serve you for years to come!

### Where to Go From Here

**Option 1: Continue Push/Pull/Legs**
- Keep the same structure
- Increase weights and volume
- Add more exercises gradually

**Option 2: Try a New Split**
- Upper/Lower (4 days/week)
- Full Body (3 days/week)
- Bro Split (5 days/week)

**Option 3: Follow a Program**
- Starting Strength
- StrongLifts 5x5
- GZCLP
- nSuns

### Key Principles Moving Forward

1. **Keep Showing Up**
   - Consistency beats perfection
   - Even "bad" workouts count

2. **Progressive Overload**
   - Always try to do more than before
   - Small improvements compound

3. **Listen to Your Body**
   - Rest when needed
   - Don''t train through pain

4. **Enjoy the Process**
   - This is a lifelong journey
   - Celebrate small wins

### Your Pull Day PR

Today, try to set a record on barbell rows! Show that back what you''ve learned.',
    '[
        {"exercise_id": "22222222-2222-2222-2222-222222220021", "sets": 4, "reps": "5-6", "notes": "PR attempt! Add weight if possible"},
        {"exercise_id": "22222222-2222-2222-2222-222222220027", "sets": 3, "reps": "8-10", "notes": "Full range of motion"},
        {"exercise_id": "22222222-2222-2222-2222-222222220029", "sets": 3, "reps": "15-20", "notes": "Light weight, feel the rear delts"},
        {"exercise_id": "22222222-2222-2222-2222-222222220082", "sets": 3, "reps": "10-12", "notes": "Control the negative"}
    ]'::jsonb,
    11
);

-- Day 12: Graduation Day
INSERT INTO beginner_program_days (id, program_id, week_number, day_number, day_title, lesson_title, lesson_content, exercises, order_index) VALUES
(
    '44444444-4444-4444-4444-444444440403',
    '33333333-3333-3333-3333-333333330001',
    4, 3,
    'Day 12: Graduation Day',
    'Congratulations, Graduate!',
    '## Congratulations, Graduate!

You did it! You''ve completed the First 30 Days program. Take a moment to appreciate what you''ve accomplished.

### Your Journey So Far

**Week 1:** You learned the basics
- What resistance training is
- Push/Pull/Legs structure
- Why every workout matters

**Week 2:** You built habits
- Progressive overload
- Mind-muscle connection
- Recovery importance

**Week 3:** You developed strength
- Compound vs isolation
- Training volume
- Proper warm-up

**Week 4:** You proved yourself
- Tracked your progress
- Set personal records
- Graduated!

### By the Numbers

In this program, you''ve done approximately:
- **12 workouts**
- **108+ total sets**
- **1,000+ total reps**

That''s an incredible foundation!

### The Badge You''ve Earned

After completing this workout, you''ll unlock the **"First 30 Days Graduate"** badge. Wear it proudly - you earned it!

### Final Challenge

Today''s squat workout is your graduation test. Give it everything you''ve got. Set a PR, push your limits, and show yourself how far you''ve come.

### Remember

This isn''t the end - it''s just the beginning. You now have the knowledge and habits to train effectively for life. Keep pushing, keep growing, and keep getting stronger.

The iron never lies. And neither does your progress.

**Welcome to the lifter''s club.** ',
    '[
        {"exercise_id": "22222222-2222-2222-2222-222222220060", "sets": 4, "reps": "5-6", "notes": "GRADUATION PR! Give it everything!"},
        {"exercise_id": "22222222-2222-2222-2222-222222220064", "sets": 3, "reps": "8-10", "notes": "Feel that hamstring stretch"},
        {"exercise_id": "22222222-2222-2222-2222-222222220062", "sets": 3, "reps": "10-12", "notes": "Push through!"},
        {"exercise_id": "22222222-2222-2222-2222-222222220067", "sets": 3, "reps": "12-15", "notes": "Finish strong!"}
    ]'::jsonb,
    12
);
