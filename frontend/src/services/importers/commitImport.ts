/**
 * Phase 2D: Commit parsed workouts to WatermelonDB.
 */

import { v4 as uuid } from 'uuid';
import {
  database,
  workoutsCollection,
  workoutSetsCollection,
  exercisesCollection,
} from '../../db';
import type Workout from '../../db/models/Workout';
import type WorkoutSet from '../../db/models/WorkoutSet';
import type Exercise from '../../db/models/Exercise';
import type { ParsedWorkout, ImportResult } from './types';

export async function commitImport(
  workouts: ParsedWorkout[],
  userId: string,
  createMissingExercises: boolean
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    workoutsImported: 0,
    setsImported: 0,
    exercisesCreated: 0,
    errors: [],
  };

  try {
    await database.write(async () => {
      const createdExercisesByOriginalName = new Map<string, string>();

      for (const w of workouts) {
        const workoutServerId = uuid();
        const workout = await workoutsCollection.create((rec: Workout) => {
          rec.serverId = workoutServerId;
          rec.userId = userId;
          rec.name = w.name || undefined;
          rec.note = w.description || undefined;
          rec.startedAt = w.startedAt;
          rec.endedAt = w.endedAt;
          rec.localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          rec.visibility = 'PRIVATE';
        });

        result.workoutsImported += 1;

        for (const ex of w.exercises) {
          let exerciseLocalId: string | null = ex.matchedExerciseLocalId;

          if (!exerciseLocalId && createMissingExercises) {
            const existing = createdExercisesByOriginalName.get(ex.originalName);
            if (existing) {
              exerciseLocalId = existing;
            } else {
              const newServerId = uuid();
              const newEx = await exercisesCollection.create((erec: Exercise) => {
                erec.serverId = newServerId;
                erec.name = ex.name;
                erec.muscleGroup = 'Other';
                erec.isCustom = true;
                erec.createdByUserId = userId;
              });
              exerciseLocalId = newEx.id;
              createdExercisesByOriginalName.set(ex.originalName, exerciseLocalId);
              result.exercisesCreated += 1;
            }
          }

          if (!exerciseLocalId) {
            result.errors.push(`Skipped exercise: ${ex.originalName}`);
            continue;
          }

          for (const set of ex.sets) {
            const weightKg = set.weightKg ?? null;
            const reps = set.reps ?? 0;
            if (reps < 0 || reps > 500) continue;
            if (weightKg !== null && (weightKg < 0 || weightKg > 1000)) continue;

            const distanceMeters = set.distanceKm != null ? set.distanceKm * 1000 : undefined;

            await workoutSetsCollection.create((srec: WorkoutSet) => {
              srec.serverId = uuid();
              srec.workoutId = workout.id;
              srec.exerciseId = exerciseLocalId!;
              srec.weightKg = weightKg ?? undefined;
              srec.reps = reps;
              srec.rpe = set.rpe ?? undefined;
              srec.durationSeconds = set.durationSeconds ?? undefined;
              srec.distanceMeters = distanceMeters;
              srec.setOrderIndex = set.index;
              srec.isPr = false;
              srec.isFailure = false;
              srec.note = ex.notes || undefined;
            });
            result.setsImported += 1;
          }
        }
      }
    });

    result.success = true;
  } catch (err) {
    result.success = false;
    const msg = err instanceof Error ? err.message : 'Unknown error';
    result.errors.push(`Import failed: ${msg}`);
  }

  return result;
}
