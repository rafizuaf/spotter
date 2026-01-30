/**
 * Phase 2D: Spotter generic CSV import – parse into ImportPreview.
 * Same format as CSV export for round-trip. ISO 8601 dates.
 */

import Papa from 'papaparse';
import { Q } from '@nozbe/watermelondb';
import { exercisesCollection } from '../../db';
import { normalizeExerciseName, matchExercise } from './exerciseMatcher';
import { logError } from '../../utils/errorHandler';
import type { ExerciseLibraryEntry } from './exerciseMatcher';
import type {
  GenericRow,
  ImportPreview,
  ParsedWorkout,
  ParsedExercise,
  ParsedSet,
} from './types';

/** Parse generic CSV string into ImportPreview. */
export async function parseGenericCsv(csvContent: string): Promise<ImportPreview> {
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

  const { data, errors } = Papa.parse<GenericRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  if (errors.length > 0) {
    logError(new Error(`CSV parse warnings: ${errors.length} errors`), 'genericImporter_parse');
  }

  const workoutGroups = new Map<string, GenericRow[]>();
  for (const row of data) {
    const key = `${row.workout_name ?? ''}|${row.workout_started_at ?? ''}`;
    if (!workoutGroups.has(key)) {
      workoutGroups.set(key, []);
    }
    workoutGroups.get(key)!.push(row);
  }

  const workouts: ParsedWorkout[] = [];
  const unmatchedExercises = new Set<string>();
  let totalSets = 0;
  const exerciseNames = new Set<string>();
  let dateMin: Date | null = null;
  let dateMax: Date | null = null;

  for (const [, rows] of workoutGroups) {
    const first = rows[0];
    if (!first) continue;

    const exerciseGroups = new Map<string, GenericRow[]>();
    for (const row of rows) {
      const ek = row.exercise_name ?? '';
      if (!exerciseGroups.has(ek)) {
        exerciseGroups.set(ek, []);
      }
      exerciseGroups.get(ek)!.push(row);
    }

    const parsedExercises: ParsedExercise[] = [];
    for (const [exerciseName, exerciseRows] of exerciseGroups) {
      exerciseNames.add(exerciseName);
      const match = matchExercise(exerciseName, library);
      if (!match.exerciseId) {
        unmatchedExercises.add(exerciseName);
      }

      const sets: ParsedSet[] = exerciseRows.map((row) => {
        const sk = row.set_index ?? '0';
        const wk = row.weight_kg?.trim();
        const rk = row.reps?.trim();
        const dk = row.distance_km?.trim();
        const dsk = row.duration_seconds?.trim();
        const rpek = row.rpe?.trim();
        return {
          index: parseInt(sk, 10) || 0,
          type: 'normal',
          weightKg: wk ? parseFloat(wk) : null,
          reps: rk ? parseInt(rk, 10) : null,
          distanceKm: dk ? parseFloat(dk) : null,
          durationSeconds: dsk ? parseInt(dsk, 10) : null,
          rpe: rpek ? parseFloat(rpek) : null,
        };
      });

      totalSets += sets.length;
      const notes = exerciseRows[0]?.set_note?.trim() ?? '';
      const supersetId = null;

      parsedExercises.push({
        name: match.exerciseName,
        originalName: exerciseName,
        matchedExerciseId: match.exerciseId,
        matchedExerciseLocalId: match.localId,
        matchConfidence: match.confidence,
        notes,
        supersetId,
        sets,
      });
    }

    const startedAt = new Date(first.workout_started_at ?? 0);
    const endedAt = new Date(first.workout_ended_at ?? first.workout_started_at ?? 0);
    if (!dateMin || startedAt < dateMin) dateMin = startedAt;
    if (!dateMax || startedAt > dateMax) dateMax = startedAt;

    workouts.push({
      name: first.workout_name?.trim() ?? 'Imported workout',
      startedAt,
      endedAt,
      description: first.workout_note?.trim() ?? '',
      exercises: parsedExercises,
    });
  }

  workouts.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

  return {
    source: 'generic',
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
