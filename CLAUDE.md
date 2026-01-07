# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# 📘 Spotter — Development Guide & System Specification

**Status:** ARCHITECTURE LOCKED
**Audience:** Claude Code, Engineering, AI Codegen
**Change Policy:** Core architecture immutable, derived systems forward-only

---

## Quick Reference: Common Commands

### Frontend Development
```bash
cd frontend

# Start development server
npm start

# Run on specific platform
npm run ios
npm run android
npm run web

# Type checking
npx tsc --noEmit

# Run tests
npm test
npm run test:watch

# Check for forbidden 'any' types
grep -r ": any" src/ app/ --include="*.ts" --include="*.tsx"
grep -r "as any" src/ app/ --include="*.ts" --include="*.tsx"
```

### Backend Development
```bash
cd backend

# Link to Supabase project
npx supabase link --project-ref your-project-ref

# Run migrations
npx supabase db push

# Reset database (development only)
npx supabase db reset

# Run seed data
npx supabase db seed

# Deploy edge function
npx supabase functions deploy <function-name>

# Deploy all functions
npx supabase functions deploy sync-pull
npx supabase functions deploy sync-push
npx supabase functions deploy award-xp
npx supabase functions deploy calculate-level
npx supabase functions deploy detect-pr
npx supabase functions deploy unlock-badge

# Test edge function locally
npx supabase functions serve <function-name>
```

### Testing Workflow
```bash
cd frontend

# Run all tests
npm test

# Run specific test file
npm test -- path/to/test.test.ts

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Pre-Commit Checks
```bash
cd frontend

# 1. TypeScript compilation (MUST pass)
npx tsc --noEmit

# 2. Run tests
npm test

# 3. Check for 'any' types (should return nothing)
grep -r ": any" src/ app/ --include="*.ts" --include="*.tsx"

# 4. Check git status
git status
```

---

## Project Roadmap & Current Status

**Current Phase:** Phase 3 - Social Features (In Progress)
**Overall Completion:** 34% (14/41 tasks)
**Last Updated:** 2026-01-07

### Progress Overview
```
Phase 1: Core Workout Flow       [✓]  6/6 tasks complete
Phase 2: Gamification System     [✓]  8/8 tasks complete
Phase 3: Social Features         [→]  0/10 tasks - CURRENT PHASE
Phase 4: Notifications           [ ]  0/7 tasks
Phase 5: Polish & Testing        [ ]  0/10 tasks
```

### What's Been Completed
✅ **Phase 1 - Core Workout Flow**
- Workout store with WatermelonDB persistence
- Exercise picker with muscle group filtering
- History screen with reactive queries
- Routines management and workflow
- Comprehensive workout flow tests

✅ **Phase 2 - Gamification System**
- XP awarding system (server-side, idempotent)
- Level calculation with caching
- Personal Record (PR) detection
- Badge unlock system
- UI integration (level progress, badge cards)
- Gamification function integration in workout flow
- Full test coverage

### Current Phase: Social Features

**Next Tasks (Phase 3):**
1. Create social database models (Follow, UserBlock, SocialPost)
2. Add social tables to sync system
3. Implement follow/unfollow backend functions
4. Implement social post generation
5. Implement user blocking
6. Build social feed UI
7. Build user profile screens
8. Build follower/following lists
9. Add social feature tests

**Upcoming Phases:**
- **Phase 4:** Push notifications and notification center
- **Phase 5:** Body tracking, settings, error handling, comprehensive testing

**Full Roadmap:** See `.claude/todo.md` for detailed task breakdown, implementation patterns, and timeline estimates.

**Note for Claude Code:** When resuming work, always check `.claude/todo.md` for the next unchecked task and follow the implementation patterns provided.

---

## System Architecture Overview

### Technology Stack
- **Frontend:** React Native (Expo) with TypeScript
- **Local Database:** WatermelonDB (SQLite)
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **Edge Functions:** Deno runtime
- **State Management:** Zustand
- **Navigation:** Expo Router (file-based)
- **Monetization:** Stripe / RevenueCat
- **Notifications:** Expo Push Notifications

### Project Structure
```
spotter/
├── frontend/
│   ├── app/                          # Expo Router screens (file-based routing)
│   │   ├── (auth)/                   # Auth flow screens
│   │   │   ├── login.tsx
│   │   │   └── signup.tsx
│   │   ├── (tabs)/                   # Main app tabs
│   │   │   ├── index.tsx             # Workout tab
│   │   │   ├── history.tsx
│   │   │   ├── progress.tsx
│   │   │   └── profile.tsx
│   │   ├── routines/                 # Dynamic routes
│   │   │   └── [id].tsx              # Routine detail
│   │   ├── _layout.tsx               # Root layout
│   │   └── index.tsx                 # App entry
│   ├── src/
│   │   ├── components/               # Reusable UI components
│   │   ├── db/
│   │   │   ├── models/              # WatermelonDB model classes
│   │   │   ├── schema.ts            # Database schema definition
│   │   │   ├── sync.ts              # Sync logic with Supabase
│   │   │   └── index.ts             # Database initialization
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── services/                 # API services (Supabase client)
│   │   ├── stores/                   # Zustand global stores
│   │   │   ├── authStore.ts         # Authentication state
│   │   │   └── workoutStore.ts      # Active workout state
│   │   ├── types/                    # TypeScript type definitions
│   │   └── utils/                    # Utility functions
│   ├── __tests__/                    # Test files
│   ├── package.json
│   └── tsconfig.json
│
├── backend/
│   └── supabase/
│       ├── migrations/               # SQL migration files (ordered)
│       │   ├── 00001_extensions_and_functions.sql
│       │   ├── 00002_core_tables.sql
│       │   ├── 00003_workout_tables.sql
│       │   └── ...
│       ├── functions/                # Edge functions (Deno)
│       │   ├── award-xp/
│       │   │   └── index.ts
│       │   ├── sync-pull/
│       │   │   └── index.ts
│       │   ├── sync-push/
│       │   │   └── index.ts
│       │   ├── calculate-level/
│       │   ├── detect-pr/
│       │   ├── unlock-badge/
│       │   └── deno.json             # Deno configuration
│       ├── config.toml               # Supabase configuration
│       └── seed.sql                  # Initial seed data
│
├── CLAUDE.md                         # This file
├── DEVELOPMENT_RULES.md              # Coding standards
├── QUICKSTART.md                     # Setup guide
└── SECURITY.md                       # Security guidelines
```

---

## Core System Principles (CRITICAL)

Spotter is built on three **non-negotiable** architectural principles:

1. **Server authority over truth**
   - Backend is the source of truth
   - Client caches data locally for offline use
   - Server-side validation always wins in conflicts

2. **Offline-first with deterministic reconciliation**
   - App must work fully offline
   - WatermelonDB stores all data locally
   - Sync happens automatically when online
   - Conflicts resolved deterministically (server timestamp wins)

3. **Derived systems never rewrite history**
   - XP, Levels, PRs, Badges are **append-only**
   - Once written, never recalculated or deleted
   - Forward-only versioning (new code, not data migration)

> **CRITICAL:** If any code or request conflicts with these principles, the principles win.

---

## Data Layer Architecture (Mental Model)

### Layer 1: Core Authoritative Data (Immutable Semantics)
**Tables:** `users`, `user_settings`, `workouts`, `workout_sets`, `routines`, `routine_exercises`, `exercises`, `equipment_bases`

**Characteristics:**
- Ground truth of the system
- Client may create/update (with server validation)
- **Soft delete only** (via `deleted_at`, never hard delete)
- Never auto-recomputed
- Server validates ownership via RLS

**WatermelonDB Models:** Located in `frontend/src/db/models/`

### Layer 2: Derived Systems (Forward-Only, Append-Only)
**Systems:** XP, Levels, Personal Records (PRs), Wilks scores, Badges, Rust decay

**Characteristics:**
- Read from Layer 1, never write to it
- **Append-only logs** (e.g., `user_xp_logs`)
- Idempotent calculations
- Versioned by code changes, not data
- **No historical recalculation**

**Implementation:** Backend edge functions only

### Layer 3: Cached Artifacts (Replaceable)
**Tables:** `user_levels`, `wilks_score` (cached field), `notifications`, `social_posts`

**Characteristics:**
- Exist for performance/UX
- Can be regenerated from Layer 1 + Layer 2
- Can be invalidated and recalculated
- Never the source of truth

### Layer 4: Presentation / UX
**Location:** React Native components, Zustand stores

**Characteristics:**
- Pure client concerns
- Unit conversion (KG ↔ LBS)
- Formatting, animations, progress bars
- No business logic

---

## Critical Development Rules

### TypeScript Rules (STRICTLY ENFORCED)
❌ **NEVER use `any` type** - Always define proper interfaces/types
❌ **NEVER use `as any` casting** - Use proper type guards
❌ **NEVER use `@ts-ignore`** without extreme justification
✅ **Prefer `unknown`** over `any` when type is uncertain
✅ **Use type guards** for runtime type checking
✅ **Use discriminated unions** for state management

### Database Rules (CRITICAL)
❌ **NEVER hard delete** - Always soft delete via `deleted_at`
❌ **NEVER bypass transactions** - Use `database.write()`
❌ **NEVER calculate XP client-side** - Server-only
✅ **Always use UTC timestamps**
✅ **Store weights in KG** (canonical unit)
✅ **Use WatermelonDB transactions** for multi-record operations

### Backend Edge Function Rules
✅ **Must be idempotent** - Same input = same output, always
✅ **Must authenticate** - Check `auth.uid()` first
✅ **Use admin client** for RLS bypass (when authorized)
✅ **Return CORS headers** - Include in all responses
✅ **Handle OPTIONS requests** - Required for CORS

### Sync & Conflict Resolution Rules
1. Server timestamp wins
2. Soft delete always wins
3. JSON arrays merged by union
4. Client never overwrites `updated_at`
5. Use `updated_at > last_pulled_at` for incremental sync

---

## Database Schema Summary

### Identity & Settings
- `users` - Public profile (username, avatar, bio, subscription_tier)
- `user_settings` - Private settings (units, preferences, notifications)
- `user_body_logs` - Body measurements over time

### Equipment & Exercises
- `equipment_bases` - Standard equipment (barbell, dumbbell, etc.)
- `exercises` - Exercise library (includes custom exercises)
- `exercise_swaps` - Alternative exercises for injuries

### Routines & Workouts
- `routines` - Saved workout templates
- `routine_exercises` - Exercises within routines (with LexoRank ordering)
- `workouts` - Actual workout sessions
- `workout_sets` - Individual sets within workouts

### Gamification (Layer 2 - Derived)
- `user_xp_logs` - **Append-only** XP history
- `user_levels` - Cached level calculations
- `achievements` - Badge definitions
- `user_badges` - Unlocked badges (with rust status)

### Social
- `follows` - User follow relationships
- `user_blocks` - Blocked users
- `social_posts` - Derived from workouts
- `content_reports` - User reports

### Monetization
- `subscription_products` - Available plans
- `payment_customers` - Stripe/RevenueCat mapping
- `subscription_history` - Purchase history
- `payment_webhooks` - Webhook events

**Full schema details:** See sections 5.1-5.10 below

---

## WatermelonDB Integration

### Database Initialization
File: `frontend/src/db/index.ts`

```typescript
import { database, workoutsCollection, workoutSetsCollection } from '@/db';

// Querying
const workouts = await workoutsCollection
  .query(
    Q.where('user_id', userId),
    Q.where('deleted_at', null),
    Q.sortBy('started_at', Q.desc)
  )
  .fetch();

// Creating records (always in transaction)
await database.write(async () => {
  const workout = await workoutsCollection.create(w => {
    w.serverId = uuid();
    w.userId = currentUser.id;
    w.name = 'Morning Workout';
    w.startedAt = new Date();
  });

  await workoutSetsCollection.create(s => {
    s.serverId = uuid();
    s.workoutId = workout.id;
    s.exerciseId = exercise.id;
    s.weightKg = '100';
    s.reps = '10';
  });
});

// Soft delete (NEVER use .destroyPermanently())
await database.write(async () => {
  await workout.update(w => {
    w.deletedAt = new Date();
  });
});
```

### Sync Architecture
File: `frontend/src/db/sync.ts`

- **Pull:** Fetch records with `updated_at > last_pulled_at`
- **Push:** Send locally modified records to server
- **Conflict resolution:** Server timestamp wins
- **Incremental:** Only sync changed records

---

## Edge Functions Architecture

### Standard Pattern (MUST FOLLOW)
```typescript
// backend/supabase/functions/<function-name>/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Authenticate user
    const authHeader = req.headers.get("Authorization")!;
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Parse request
    const body = await req.json();

    // 3. Business logic (use admin client to bypass RLS when needed)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Your logic here (MUST be idempotent)

    // 4. Return response
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
```

### Available Edge Functions
1. **sync-pull** - Pull updated records from server
2. **sync-push** - Push local changes to server
3. **award-xp** - Calculate and award XP (idempotent)
4. **calculate-level** - Update user level cache
5. **detect-pr** - Detect new personal records
6. **unlock-badge** - Check and unlock achievements

---

## XP & Gamification System (LOCKED v1)

### XP Rules (CRITICAL - DO NOT VIOLATE)
1. **Server-side only** - Never calculate XP on client
2. **Append-only** - `user_xp_logs` is never updated or deleted
3. **Idempotent** - Awarding XP twice for same set does nothing
4. **No revocation** - Deleting a set does NOT remove XP
5. **No recalculation** - Historical XP never changes

### XP Awarding Pattern
```typescript
// In award-xp edge function
await supabaseAdmin
  .from('user_xp_logs')
  .insert({
    user_id: userId,
    source_type: 'SET',
    source_id: setId,
    xp_amount: calculateXP(set),
    created_at: new Date().toISOString(),
  })
  // CRITICAL: Makes it idempotent
  .onConflict('user_id, source_type, source_id')
  .ignoreDuplicates();
```

### Level Calculation
- Levels are **monotonic** (never decrease)
- Cached in `user_levels` table
- Formula may change (forward-only, doesn't recalculate history)
- Quadratic-lite curve

---

## Git Workflow (REQUIRED)

### When to Commit
✅ After EVERY completed task:
- Feature implementation
- Bug fix
- Test addition
- Refactoring
- Documentation update

❌ DO NOT batch unrelated changes

### Commit Message Format (REQUIRED)
```
<type>: <short summary>

<detailed description>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Types:** `feat`, `fix`, `refactor`, `test`, `docs`, `style`, `perf`, `chore`

### Pre-Commit Checklist (RUN BEFORE EVERY COMMIT)
```bash
# 1. TypeScript must compile
cd frontend && npx tsc --noEmit

# 2. No 'any' types (should return nothing)
grep -r ": any" src/ app/ --include="*.ts" --include="*.tsx"
grep -r "as any" src/ app/ --include="*.ts" --include="*.tsx"

# 3. Tests pass
npm test

# 4. Check staged files
git status
```

---

## Design System

### Colors (USE THESE CONSISTENTLY)
- Background: `#0f172a` (dark blue)
- Card background: `#1e293b`
- Text: `#fff` (white)
- Subtext: `#94a3b8` (gray)
- Primary: `#6366f1` (indigo)
- Success: `#22c55e` (green)
- Error: `#ef4444` (red)

### Component Patterns
- **Use functional components** (no class components)
- **Use hooks** (useState, useEffect, custom hooks)
- **Use StyleSheet.create** for styles
- **Use Zustand** for global state
- **Use WatermelonDB** for data persistence

---

## RLS (Row Level Security) Guidelines

### Allowed in RLS Policies
✅ `auth.uid()` checks
✅ Ownership checks (`user_id = auth.uid()`)
✅ `EXISTS` queries (follows, blocks)
✅ `deleted_at IS NULL` filters

### Forbidden in RLS Policies
❌ Aggregations (COUNT, SUM, etc.)
❌ Multi-hop joins
❌ Business logic
❌ XP/badge calculations

> **Complex logic belongs in edge functions, not RLS.**

---

## Testing Standards

### Test File Location
- Place tests in `frontend/__tests__/`
- Name files: `<feature>.test.ts`

### Test Structure
```typescript
describe('Feature Name', () => {
  beforeEach(async () => {
    // Setup test database, mocks, etc.
  });

  it('should do something specific', async () => {
    // Arrange
    const input = createTestData();

    // Act
    const result = await performAction(input);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ ... });
  });
});
```

### Coverage Goals
- Critical paths: 90%+
- Edge functions: 80%+
- UI components: 60%+

---

## Common Patterns

### Loading States
```typescript
const [loading, setLoading] = useState(false);

const handleAction = async () => {
  setLoading(true);
  try {
    await performAction();
  } finally {
    setLoading(false); // Always in finally block
  }
};
```

### Error Handling
```typescript
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  console.error('Operation failed:', error);
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error'
  };
}
```

### Form Validation
```typescript
if (!name.trim()) {
  Alert.alert('Error', 'Please enter a name');
  return;
}
```

---

## Developer Non-Negotiables

1. ❌ No `any` types
2. ❌ No hard deletes
3. ❌ No client-side XP calculations
4. ❌ No recomputation of derived history
5. ❌ No RLS bypass (except in edge functions with service role key)
6. ❌ No schema mutations without migrations
7. ✅ Commit after each task
8. ✅ Soft delete only
9. ✅ Server is source of truth
10. ✅ Edge functions must be idempotent

---

## Additional Documentation

- **DEVELOPMENT_RULES.md** - Detailed coding standards and patterns
- **QUICKSTART.md** - Initial setup and environment configuration
- **SECURITY.md** - Security guidelines and secret management

---

# Complete Database Schema Reference

## 5.1 Identity & Settings

### `users` (public profile)
- `id` (UUID, PK → auth.users)
- `username` (unique)
- `avatar_url`
- `bio`
- `website_link`
- `account_status` (ACTIVE, BANNED, DELETED_PENDING_PURGE)
- `subscription_tier` (FREE, PRO)
- `is_trial_period`
- `subscription_expires_at`
- `terms_accepted_at`
- `created_at`
- `updated_at`
- `deleted_at`

### `user_settings` (private)
- `user_id` (PK → users.id)
- `date_of_birth`
- `gender` (MALE, FEMALE, OTHER)
- `height_cm`
- `weight_unit_preference`
- `distance_unit_preference`
- `theme_preference`
- `keep_screen_awake`
- `timer_auto_start`
- `timer_vibration_enabled`
- `timer_sound_enabled`
- `input_mode_plate_math`
- `preferred_rpe_system`
- `sync_to_health_kit`
- `auto_play_music_service`
- `active_injuries` (JSONB)
- `default_workout_visibility`
- `notification_preferences` (JSONB)
- `equipment_overrides` (JSONB)
- `created_at`
- `updated_at`
- `deleted_at`

## 5.2 Body Tracking

### `user_body_logs`
- `id` (UUID)
- `user_id`
- `logged_at`
- `weight_kg`
- `body_fat_pct`
- `muscle_mass_kg`
- `neck_cm`
- `shoulders_cm`
- `chest_cm`
- `waist_cm`
- `hips_cm`
- `bicep_left_cm`
- `bicep_right_cm`
- `thigh_left_cm`
- `thigh_right_cm`
- `calf_left_cm`
- `calf_right_cm`
- `photo_front_url`
- `photo_back_url`
- `photo_side_url`
- `created_at`
- `updated_at`
- `deleted_at`

## 5.3 Equipment & Exercises

### `equipment_bases` (read-only seed)
- `id`
- `name`
- `standard_weight_kg`
- `standard_unit`
- `created_at`

### `exercises`
- `id`
- `name`
- `muscle_group`
- `equipment_base_id`
- `video_url`
- `instructions`
- `is_custom`
- `created_by_user_id`
- `created_at`
- `updated_at`
- `deleted_at`

### `exercise_swaps`
- `id`
- `original_exercise_id`
- `target_exercise_id`
- `trigger_condition` (JSONB)
- `efficiency_score`
- `created_at`
- `updated_at`
- `deleted_at`

## 5.4 Routines

### `routines`
- `id`
- `user_id`
- `name`
- `notes`
- `is_public`
- `created_at`
- `updated_at`
- `deleted_at`

### `routine_exercises`
- `id`
- `routine_id`
- `exercise_id`
- `order_index` (LexoRank for reordering)
- `target_sets`
- `target_reps`
- `created_at`
- `updated_at`
- `deleted_at`

## 5.5 Workouts & Sets

### `workouts`
- `id`
- `user_id`
- `routine_origin_id`
- `name`
- `note`
- `started_at`
- `ended_at`
- `local_timezone`
- `visibility` (PUBLIC, FOLLOWERS, PRIVATE)
- `wilks_score` (cached)
- `created_at`
- `updated_at`
- `deleted_at`

### `workout_sets`
- `id`
- `workout_id`
- `exercise_id`
- `weight_kg` (TOTAL weight - canonical storage)
- `weight_plate_amount`
- `weight_base_amount`
- `original_input_unit`
- `original_input_value`
- `reps`
- `rpe`
- `rir`
- `is_failure`
- `note`
- `rest_time_seconds`
- `duration_seconds`
- `distance_meters`
- `is_pr` (cached flag)
- `set_order_index`
- `superset_group_id`
- `created_at`
- `updated_at`
- `deleted_at`

## 5.6 Social & Safety

### `follows`
- `id`
- `follower_id`
- `following_id`
- `created_at`
- `updated_at`
- `deleted_at`

### `user_blocks`
- `id`
- `blocker_id`
- `blocked_id`
- `created_at`

### `social_posts` (derived from workouts)
- `id`
- `user_id`
- `workout_id`
- `achievement_code`
- `generated_headline`
- `created_at`
- `updated_at`
- `deleted_at`

### `content_reports`
- `id`
- `reporter_id`
- `reported_post_id`
- `reason`
- `status`
- `created_at`

## 5.7 Notifications

### `push_devices`
- `id`
- `user_id`
- `expo_push_token`
- `created_at`
- `updated_at`
- `deleted_at`

### `notifications`
- `id`
- `recipient_id`
- `actor_id`
- `type`
- `metadata` (JSONB)
- `title`
- `body`
- `read_at`
- `created_at`
- `updated_at`
- `deleted_at`

## 5.8 Gamification

### `achievements` (badge definitions)
- `code` (PK)
- `title`
- `description`
- `icon_url`
- `threshold_value`
- `relevant_muscle_group`
- `created_at`

### `user_badges`
- `id`
- `user_id`
- `achievement_code`
- `earned_at`
- `is_rusty` (badge rust status)
- `last_maintained_at`
- `created_at`
- `updated_at`
- `deleted_at`

## 5.9 XP & Levels (LOCKED V1)

### `user_xp_logs` (**APPEND-ONLY**)
- `id`
- `user_id`
- `source_type` (SET, WORKOUT, BONUS)
- `source_id`
- `xp_amount`
- `created_at`

**CRITICAL RULES:**
1. Never updated
2. Never deleted
3. Unique constraint on (`user_id`, `source_type`, `source_id`) for idempotency

### `user_levels` (cached)
- `user_id` (PK)
- `total_xp`
- `level`
- `xp_to_next_level`
- `updated_at`

## 5.10 Monetization

### `subscription_products`
- `id`
- `platform_product_id_ios`
- `platform_product_id_android`
- `display_price`
- `duration_interval`
- `is_active`
- `created_at`

### `payment_customers`
- `user_id` (PK)
- `stripe_customer_id`
- `revenuecat_rc_id`
- `created_at`
- `updated_at`
- `deleted_at`

### `subscription_history`
- `id`
- `user_id`
- `product_id`
- `provider`
- `original_transaction_id`
- `status`
- `purchase_date`
- `expiry_date`
- `created_at`
- `updated_at`
- `deleted_at`

### `payment_webhooks`
- `id`
- `provider`
- `event_type`
- `payload` (JSONB)
- `processing_status`
- `error_message`
- `received_at`

---

## System Status

- ✅ **Architecture:** FINAL (LOCKED)
- ✅ **XP v1:** FINAL (LOCKED)
- ✅ **Sync model:** FINAL (LOCKED)
- ✅ **RLS model:** FINAL (LOCKED)
- ✅ **Ready for implementation**

---

**When in doubt:**
1. Check this file (CLAUDE.md) for architecture
2. Check DEVELOPMENT_RULES.md for coding patterns
3. Follow existing code patterns
4. Ask for clarification

**Remember:** Consistency and adherence to core principles > clever solutions.
