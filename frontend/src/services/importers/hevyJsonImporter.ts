/**
 * Phase 2D: Hevy JSON import – parse into ImportPreview.
 * 
 * Hevy exports JSON with structure:
 * {
 *   "workouts": [
 *     {
 *       "id": "...",
 *       "name": "Push Day",
 *       "start_time": "2026-01-15T10:00:00Z",
 *       "end_time": "2026-01-15T11:30:00Z",
 *       "exercises": [
 *         {
 *           "name": "Bench Press",
 *           "sets": [
 *             { "weight": 100, "reps": 10, "rpe": 8 }
 *           ]
 *         }
 *       ]
 *     }
 *   ]
 * }
 */

import { Q } from '@nozbe/watermelondb';
import { exercisesCollection } from '../../db';
import { normalizeExerciseName, matchExercise } from './exerciseMatcher';
import type { ExerciseLibraryEntry } from './exerciseMatcher';
import type {
  ImportPreview,
  ParsedWorkout,
  ParsedExercise,
  ParsedSet,
} from './types';

interface HevyJsonWorkout {
  id?: string;
  name?: string;
  start_time?: string;
  end_time?: string;
  notes?: string;
  exercises?: HevyJsonExercise[];
}

interface HevyJsonExercise {
  name?: string;
  notes?: string;
  sets?: HevyJsonSet[];
}

interface HevyJsonSet {
  weight?: number;
  reps?: number;
  rpe?: number;
  distance?: number;
  duration?: number;
  type?: string;
  notes?: string;
}

interface HevyJsonExport {
  workouts?: HevyJsonWorkout[];
}

/** Parse Hevy JSON export into ImportPreview. */
export async function parseHevyJson(jsonContent: string): Promise<ImportPreview> {
  const exercises = await exercisesCollection
    .query(Q.where('deleted_at', null))
    .fetch();

  const library = new Map<string, ExerciseLibraryEntry>();
  for (const e of exercises) {
    const n = normalizeExerciseName(e.name);
    library.set(n, {
      serverId: e.serverId,
      localId: e.id,
      name: e.name,
    });
  }

  let data: HevyJsonExport;
  try {
    data = JSON.parse(jsonContent);
  } catch (error) {
    throw new Error('Invalid JSON format');
  }

  if (!data.workouts || !Array.isArray(data.workouts)) {
    throw new Error('Invalid Hevy JSON format: missing workouts array');
  }

  const workouts: ParsedWorkout[] = [];
  const unmatchedExercises = new Set<string>();
  let totalSets = 0;
  const exerciseNames = new Set<string>();
  let dateMin: Date | null = null;
  let dateMax: Date | null = null;

  for (const workout of data.workouts) {
    if (!workout.exercises || !Array.isArray(workout.exercises)) {
      continue;
    }

    const startedAt = workout.start_time ? new Date(workout.start_time) : new Date();
    const endedAt = workout.end_time ? new Date(workout.end_time) : startedAt;

    if (!dateMin || startedAt < dateMin) dateMin = startedAt;
    if (!dateMax || startedAt > dateMax) dateMax = startedAt;

    const parsedExercises: ParsedExercise[] = [];

    for (const exercise of workout.exercises) {
      const exerciseName = exercise.name?.trim() || 'Unknown Exercise';
      exerciseNames.add(exerciseName);
      const match = matchExercise(exerciseName, library);
      
      if (!match.exerciseId) {
        unmatchedExercises.add(exerciseName);
      }

      const sets: ParsedSet[] = (exercise.sets || []).map((set, index) => ({
        index,
        type: set.type || 'normal',
        weightKg: set.weight ?? null,
        reps: set.reps ?? null,
        distanceKm: set.distance ?? null,
        durationSeconds: set.duration ?? null,
        rpe: set.rpe ?? null,
      }));

      totalSets += sets.length;

      parsedExercises.push({
        name: match.exerciseName,
        originalName: exerciseName,
        matchedExerciseId: match.exerciseId,
        matchedExerciseLocalId: match.localId,
        matchConfidence: match.confidence,
        notes: exercise.notes?.trim() || '',
        supersetId: null, // Hevy JSON doesn't include superset info
        sets,
      });
    }

    workouts.push({
      name: workout.name?.trim() || 'Imported workout',
      startedAt,
      endedAt,
      description: workout.notes?.trim() || '',
      exercises: parsedExercises,
    });
  }

  workouts.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

  return {
    source: 'hevy',
    totalWorkouts: workouts.length,
    totalSets,
    dateRange: {
      start: dateMin ?? new Date(),
      end: dateMax ?? new Date(),
    },
    uniqueExercises: exerciseNames.size,
    unmatchedExercises: Array.from(unmatchedExercises),
    workouts,
  };
}
