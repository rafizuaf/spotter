/**
 * Phase 2D: Exercise name matching – map Hevy (and other) names to Spotter's library.
 */

export interface ExerciseLibraryEntry {
  serverId: string;
  localId: string;
  name: string;
}

export interface MatchResult {
  exerciseId: string | null;
  localId: string | null;
  exerciseName: string;
  confidence: number;
  isExactMatch: boolean;
  suggestedCreate: boolean;
}

/** Hevy-style name → Spotter seed name. */
const HEVY_EXERCISE_MAP: Record<string, string> = {
  'Incline Bench Press (Barbell)': 'Incline Barbell Bench Press',
  'Bench Press (Barbell)': 'Barbell Bench Press',
  'Bench Press (Smith Machine)': 'Machine Chest Press',
  'Pull Up': 'Pull-Up',
  'Pendlay Row (Barbell)': 'Pendlay Row',
  'Bent Over Row (Barbell)': 'Barbell Row',
  'Romanian Deadlift (Barbell)': 'Romanian Deadlift',
  'Squat (Smith Machine)': 'Hack Squat',
  'Hip Thrust (Barbell)': 'Hip Thrust',
  'Split Squat (Dumbbell)': 'Bulgarian Split Squat',
  'Sumo Squat (Barbell)': 'Barbell Squat',
  'Standing Calf Raise (Smith)': 'Calf Raise',
  'Single Arm Lateral Raise (Cable)': 'Cable Lateral Raise',
  'Lateral Raise (Dumbbell)': 'Lateral Raise',
  'Rear Delt Reverse Fly (Dumbbell)': 'Reverse Fly',
  'Face Pull': 'Face Pull',
  'Overhead Press (Barbell)': 'Overhead Press',
  'Hanging Leg Raise': 'Hanging Leg Raise',
  'Cable Crunch': 'Cable Crunch',
  'Overhead Cable Triceps Extension': 'Overhead Tricep Extension',
  'Tricep Pushdown (Cable)': 'Tricep Pushdown',
  'Preacher Curl (Dumbbell)': 'Preacher Curl',
  'Hammer Curl (Dumbbell)': 'Hammer Curl',
  'Seated Chest Flys (Cable)': 'Cable Fly',
  'Dumbbell Fly': 'Dumbbell Fly',
  'Cable Fly': 'Cable Fly',
  'Leg Press': 'Leg Press',
  'Leg Curl': 'Leg Curl',
  'Leg Extension': 'Leg Extension',
};

function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractBaseName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*/g, '').trim();
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let j = 0; j <= b.length; j++) {
    matrix[j] = [j];
  }
  for (let i = 1; i <= a.length; i++) {
    matrix[0][i] = i;
  }
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

function similarity(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1;
  const longer = a.length >= b.length ? a : b;
  const shorter = a.length >= b.length ? b : a;
  const editDistance = levenshtein(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Match an external exercise name to Spotter's library.
 */
export function matchExercise(
  externalName: string,
  exerciseLibrary: Map<string, ExerciseLibraryEntry>
): MatchResult {
  const mapped = HEVY_EXERCISE_MAP[externalName];
  if (mapped) {
    const normalized = normalizeExerciseName(mapped);
    const entry = exerciseLibrary.get(normalized);
    if (entry) {
      return {
        exerciseId: entry.serverId,
        localId: entry.localId,
        exerciseName: entry.name,
        confidence: 1,
        isExactMatch: true,
        suggestedCreate: false,
      };
    }
  }

  const normalizedExternal = normalizeExerciseName(extractBaseName(externalName));
  for (const [key, entry] of exerciseLibrary) {
    if (normalizeExerciseName(entry.name) === normalizedExternal) {
      return {
        exerciseId: entry.serverId,
        localId: entry.localId,
        exerciseName: entry.name,
        confidence: 0.95,
        isExactMatch: true,
        suggestedCreate: false,
      };
    }
  }

  let best: ExerciseLibraryEntry | null = null;
  let bestScore = 0;
  for (const [, entry] of exerciseLibrary) {
    const n = normalizeExerciseName(entry.name);
    const score = similarity(normalizedExternal, n);
    if (score > bestScore && score > 0.6) {
      bestScore = score;
      best = entry;
    }
  }

  if (best) {
    return {
      exerciseId: best.serverId,
      localId: best.localId,
      exerciseName: best.name,
      confidence: bestScore,
      isExactMatch: false,
      suggestedCreate: false,
    };
  }

  return {
    exerciseId: null,
    localId: null,
    exerciseName: extractBaseName(externalName),
    confidence: 0,
    isExactMatch: false,
    suggestedCreate: true,
  };
}

export { normalizeExerciseName, extractBaseName };
