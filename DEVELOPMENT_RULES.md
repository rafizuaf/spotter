# Spotter Development Rules

## Core Principles (from CLAUDE.md)

**CRITICAL: Read `CLAUDE.md` before making any architectural decisions.**

1. **Server authority over truth** - Backend is source of truth, client caches locally
2. **Offline-first with deterministic reconciliation** - App works offline, syncs when online
3. **Derived systems never rewrite history** - XP, levels, PRs are append-only, never recalculated

## TypeScript Strict Typing Rules

### Absolutely Forbidden

❌ **NEVER use `any` type**
```typescript
// ❌ BAD
const data: any = fetchData();
function process(item: any) { }

// ✅ GOOD
const data: UserData = fetchData();
function process(item: WorkoutSet) { }
```

❌ **NEVER use `as any` casting**
```typescript
// ❌ BAD
const result = (data as any).someProperty;

// ✅ GOOD
interface ApiResponse {
  someProperty: string;
}
const result = (data as ApiResponse).someProperty;
```

❌ **NEVER use `@ts-ignore` or `@ts-expect-error` without extremely good reason**
- If you must use it, add a detailed comment explaining why
- File a TODO to fix it properly

### Required Practices

✅ **Always define proper types/interfaces**
```typescript
// ✅ Define interfaces for all data structures
interface WorkoutSet {
  id: string;
  exerciseId: string;
  weightKg: string;
  reps: string;
  rpe?: string;
  completed: boolean;
}

// ✅ Use proper function signatures
async function createWorkout(
  userId: string,
  name: string
): Promise<{ success: boolean; workoutId?: string; error?: string }> {
  // implementation
}
```

✅ **Use type guards for runtime checks**
```typescript
function isWorkout(value: unknown): value is Workout {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'userId' in value
  );
}
```

✅ **Use discriminated unions for state**
```typescript
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };
```

✅ **Prefer `unknown` over `any` when type is uncertain**
```typescript
// ✅ Force explicit type checking
function handleError(error: unknown) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
}
```

## Git Commit Workflow

### When to Commit

✅ **Commit after EVERY completed task**, including:
- Each feature implementation
- Each bug fix
- Each test suite addition
- Each refactoring
- Documentation updates

❌ **DO NOT batch multiple unrelated changes into one commit**

### Commit Message Format

```
<type>: <short summary>

<detailed description>

<breaking changes if any>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `perf`: Performance improvements
- `chore`: Build process, dependencies, etc.

**Examples:**
```
feat: Add visibility picker to workout screen

Added a horizontal button group allowing users to select workout
visibility (PUBLIC/FOLLOWERS/PRIVATE). The selection is saved to
the database when the workout is finished.

- Integrated with workoutStore.visibility state
- Added styled UI components matching app design
- Properly persists to WatermelonDB

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Commit Checklist

Before committing, ensure:
- [ ] TypeScript compiles with no errors (`npx tsc --noEmit`)
- [ ] No `any` types introduced
- [ ] Code follows existing patterns
- [ ] Tests added/updated (if applicable)
- [ ] No console.logs left in production code
- [ ] Follows CLAUDE.md architecture principles

## Architecture Guidelines (from CLAUDE.md)

### Database Schema

**Layer 1: Core Authoritative Data (Immutable Semantics)**
- users, user_settings, workouts, workout_sets, routines, routine_exercises, exercises
- Client may create/update, server validates ownership
- **Soft delete only** - use `deleted_at`, never hard delete
- Never auto-recomputed

**Layer 2: Derived Systems (Forward-Only)**
- XP, Levels, PRs, Badges - **append-only, idempotent, versioned**
- NEVER recalculate historical data

**Layer 3: Cached Artifacts (Replaceable)**
- user_levels, wilks_score, notifications, social_posts
- Can be regenerated, never source of truth

### Data Integrity Rules

✅ **Always use soft deletes**
```typescript
// ✅ GOOD
await workout.update({ deletedAt: new Date() });

// ❌ BAD
await workout.destroyPermanently();
```

✅ **Server timestamps only for `updated_at`**
```typescript
// Client sets created_at, server overwrites updated_at
await workoutsCollection.create(w => {
  w.serverId = uuid();
  w.userId = user.id;
  // updated_at is handled by server
});
```

✅ **Use UTC timestamps everywhere**
```typescript
const now = new Date(); // Always UTC
const startedAt = new Date(Date.UTC(2024, 0, 1)); // Explicit UTC
```

### WatermelonDB Patterns

✅ **Use proper query patterns**
```typescript
// ✅ GOOD - Reactive queries
const workouts = await workoutsCollection
  .query(
    Q.where('user_id', userId),
    Q.where('deleted_at', null),
    Q.sortBy('started_at', Q.desc)
  )
  .observe();

// ✅ GOOD - Transactions for multi-record operations
await database.write(async () => {
  const workout = await workoutsCollection.create(/* ... */);
  await workoutSetsCollection.create(/* ... */);
});
```

❌ **Never bypass database transactions**
```typescript
// ❌ BAD
const workout = await workoutsCollection.create(/* ... */);
const set = await workoutSetsCollection.create(/* ... */); // Separate transaction!

// ✅ GOOD
await database.write(async () => {
  const workout = await workoutsCollection.create(/* ... */);
  const set = await workoutSetsCollection.create(/* ... */);
});
```

### Backend Edge Functions

✅ **Always follow this pattern**
```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Authenticate
    const authHeader = req.headers.get("Authorization")!;
    const supabaseClient = createClient(/* ... */);
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Parse request
    const body = await req.json();

    // 3. Business logic (use admin client)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SECRET_KEY")!
    );

    // 4. Return response
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

✅ **Functions must be idempotent**
- Same input = same output, no matter how many times called
- Critical for XP awarding, badge unlocking, etc.

### XP & Gamification Rules

❌ **NEVER calculate XP on client**
❌ **NEVER recalculate historical XP**
❌ **NEVER revoke XP for deleted sets**

✅ **XP is append-only**
```typescript
// ✅ GOOD - Server-side XP awarding
await supabaseAdmin
  .from('user_xp_logs')
  .insert({
    user_id: userId,
    source_type: 'SET',
    source_id: setId,
    xp_amount: 10,
  })
  .onConflict('user_id, source_type, source_id') // Idempotency
  .doNothing();
```

### Sync Conflict Resolution

**Rules:**
1. Server timestamp wins
2. Soft delete always wins
3. JSON arrays merged by union
4. Client never overwrites server time

## Code Quality Standards

### React Native Components

✅ **Use functional components with hooks**
```typescript
export default function WorkoutScreen() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  // Implementation
}
```

❌ **Don't use class components** (unless absolutely necessary for error boundaries)

### State Management (Zustand)

✅ **Follow store pattern**
```typescript
interface StoreState {
  // State
  data: DataType[];
  isLoading: boolean;

  // Actions
  fetchData: () => Promise<void>;
  updateData: (id: string, updates: Partial<DataType>) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  data: [],
  isLoading: false,

  fetchData: async () => {
    set({ isLoading: true });
    try {
      const data = await api.fetch();
      set({ data, isLoading: false });
    } catch (error) {
      console.error(error);
      set({ isLoading: false });
    }
  },

  updateData: (id, updates) => {
    set(state => ({
      data: state.data.map(item =>
        item.id === id ? { ...item, ...updates } : item
      )
    }));
  },
}));
```

### Error Handling

✅ **Always handle errors gracefully**
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

✅ **Use Alert for user-facing errors**
```typescript
if (!result.success) {
  Alert.alert('Error', result.error || 'Something went wrong');
  return;
}
```

### Styling

✅ **Use StyleSheet.create**
```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  text: {
    color: '#fff',
    fontSize: 16,
  },
});
```

✅ **Follow design system colors**
- Background: `#0f172a` (dark blue)
- Card background: `#1e293b`
- Text: `#fff` (white)
- Subtext: `#94a3b8` (gray)
- Primary: `#6366f1` (indigo)
- Success: `#22c55e` (green)
- Error: `#ef4444` (red)

## Testing Requirements

✅ **Write tests for new features**
```typescript
describe('Feature Name', () => {
  beforeEach(async () => {
    // Setup
  });

  it('should do something specific', async () => {
    // Arrange
    const input = createTestData();

    // Act
    const result = await performAction(input);

    // Assert
    expect(result.success).toBe(true);
  });
});
```

✅ **Test coverage goals**
- Critical paths: 90%+
- Edge functions: 80%+
- UI components: 60%+

## File Organization

```
frontend/
├── app/                      # Expo Router screens
│   ├── (tabs)/              # Tab navigation screens
│   ├── users/[id]/          # Dynamic routes
│   └── _layout.tsx          # Root layout
├── src/
│   ├── components/          # Reusable components
│   ├── db/
│   │   ├── models/         # WatermelonDB models
│   │   ├── schema.ts       # Database schema
│   │   └── sync.ts         # Sync logic
│   ├── stores/             # Zustand stores
│   ├── services/           # API services
│   └── utils/              # Utility functions
└── __tests__/              # Tests

backend/
└── supabase/
    └── functions/          # Edge functions
        ├── award-xp/
        ├── sync-pull/
        └── sync-push/
```

## Pre-Commit Checklist

Before every commit, verify:

```bash
# 1. TypeScript compilation
cd frontend && npx tsc --noEmit

# 2. Check for 'any' types (should return nothing)
grep -r ":\s*any" src/ app/ --include="*.ts" --include="*.tsx"

# 3. Check for 'as any' (should return nothing)
grep -r "as any" src/ app/ --include="*.ts" --include="*.tsx"

# 4. Run tests (if applicable)
npm test
```

## Common Patterns to Follow

### API Calls
```typescript
// ✅ GOOD
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { param: value }
});

if (error) {
  console.error('API error:', error);
  return { success: false, error: error.message };
}

return { success: true, data };
```

### Loading States
```typescript
const [loading, setLoading] = useState(false);

const handleAction = async () => {
  setLoading(true);
  try {
    await performAction();
  } finally {
    setLoading(false);
  }
};
```

### Form Validation
```typescript
if (!name.trim()) {
  Alert.alert('Error', 'Please enter a name');
  return;
}

if (!email.includes('@')) {
  Alert.alert('Error', 'Please enter a valid email');
  return;
}
```

## Developer Commandments

1. **Thou shalt not use `any`** - Always define proper types
2. **Thou shalt commit after each task** - Keep commits atomic and meaningful
3. **Thou shalt follow CLAUDE.md** - Architecture is law
4. **Thou shalt soft delete** - Never hard delete records
5. **Thou shalt handle errors** - Never silent failures
6. **Thou shalt write tests** - Test critical paths
7. **Thou shalt use transactions** - Database consistency matters
8. **Thou shalt be idempotent** - Backend functions must be safe to retry
9. **Thou shalt respect server authority** - Backend is source of truth
10. **Thou shalt never rewrite history** - Derived data is append-only

---

**Remember:** When in doubt, check CLAUDE.md and existing code patterns. Consistency is key to maintainability.
