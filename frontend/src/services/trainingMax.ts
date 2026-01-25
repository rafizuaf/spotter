/**
 * Phase 2E: Training Max service.
 * Best 1RM from history, TM CRUD, helpers.
 */

import { Q } from '@nozbe/watermelondb';
import {
  workoutsCollection,
  workoutSetsCollection,
  exercisesCollection,
  userTrainingMaxesCollection,
  database,
} from '../db';
import { calculateEstimated1RM } from '../utils/strengthCalculations';
import type WorkoutSet from '../db/models/WorkoutSet';
import type Exercise from '../db/models/Exercise';
import type UserTrainingMax from '../db/models/UserTrainingMax';
import { v4 as uuid } from 'uuid';

export interface TrainingMaxData {
  exerciseId: string;
  exerciseName: string;
  best1RM: number;
  trainingMaxKg: number | null;
  oneRepMaxKg: number | null;
  recordId: string | null;
}

/** Best 1RM from history = 90% -> suggested TM. */
export const TM_FROM_1RM_RATIO = 0.9;

/**
 * Get exercise names for a list of exercise IDs (server IDs).
 * Uses batch lookup; returns Map<exerciseServerId, name>.
 */
async function getExerciseNames(exerciseServerIds: string[]): Promise<Map<string, string>> {
  if (exerciseServerIds.length === 0) return new Map();
  const uniq = [...new Set(exerciseServerIds)];
  const exercises = await exercisesCollection
    .query(Q.where('server_id', Q.oneOf(uniq)), Q.where('deleted_at', null))
    .fetch();
  const out = new Map<string, string>();
  for (const e of exercises) {
    const ex = e as Exercise;
    out.set(ex.serverId, ex.name);
  }
  return out;
}

/**
 * Fetch user's workouts, then sets, and compute best estimated 1RM per exercise.
 * Uses exercise server_id as key. Resolves set.exerciseId (local) -> exercise.serverId via batch.
 */
export async function getBest1RMByExerciseFromHistory(
  userId: string
): Promise<Map<string, number>> {
  const userWorkouts = await workoutsCollection
    .query(Q.where('user_id', userId), Q.where('deleted_at', null))
    .fetch();

  const workoutIds = userWorkouts.map((w) => w.id);
  if (workoutIds.length === 0) return new Map();

  const sets = (await workoutSetsCollection
    .query(
      Q.where('workout_id', Q.oneOf(workoutIds)),
      Q.where('deleted_at', null),
      Q.where('weight_kg', Q.gt(0)),
      Q.where('reps', Q.gt(0))
    )
    .fetch()) as WorkoutSet[];

  const localExIds = [...new Set(sets.map((s) => s.exerciseId))];
  const exercises = await exercisesCollection
    .query(Q.where('id', Q.oneOf(localExIds)), Q.where('deleted_at', null))
    .fetch();
  const localToServer = new Map<string, string>();
  for (const e of exercises) {
    const ex = e as Exercise;
    localToServer.set(ex.id, ex.serverId);
  }

  const map = new Map<string, number>();
  for (const s of sets) {
    const weight = s.weightKg ?? 0;
    const reps = s.reps ?? 0;
    if (weight <= 0 || reps <= 0) continue;
    const serverId = localToServer.get(s.exerciseId);
    if (!serverId) continue;
    const est = calculateEstimated1RM(weight, reps);
    const prev = map.get(serverId);
    if (prev === undefined || est > prev) map.set(serverId, est);
  }
  return map;
}

/**
 * Load all data needed for the Training Max screen: exercises trained, best 1RM,
 * and existing TMs. User IDs are auth/server IDs. Exercise keys are server_ids.
 */
export async function loadTrainingMaxData(
  userId: string
): Promise<{
  best1RMByExercise: Map<string, number>;
  exerciseNames: Map<string, string>;
  trainingMaxes: Map<string, { tm: number; oneRm: number | null; recordId: string }>;
}> {
  const [best1RM, tms, workouts] = await Promise.all([
    getBest1RMByExerciseFromHistory(userId),
    userTrainingMaxesCollection
      .query(Q.where('user_id', userId), Q.where('deleted_at', null))
      .fetch(),
    workoutsCollection
      .query(Q.where('user_id', userId), Q.where('deleted_at', null))
      .fetch(),
  ]);

  const workoutIds = workouts.map((w) => w.id);
  let sets: WorkoutSet[] = [];
  if (workoutIds.length > 0) {
    const raw = await workoutSetsCollection
      .query(
        Q.where('workout_id', Q.oneOf(workoutIds)),
        Q.where('deleted_at', null)
      )
      .fetch();
    sets = raw as WorkoutSet[];
  }

  const localExIds = new Set<string>();
  for (const s of sets) localExIds.add(s.exerciseId);

  const exerciseServerIds = new Set<string>();
  if (localExIds.size > 0) {
    const exercises = await exercisesCollection
      .query(Q.where('id', Q.oneOf([...localExIds])), Q.where('deleted_at', null))
      .fetch();
    for (const e of exercises) {
      const ex = e as Exercise;
      exerciseServerIds.add(ex.serverId);
    }
  }
  for (const tm of tms) {
    const r = tm as UserTrainingMax;
    exerciseServerIds.add(r.exerciseId);
  }
  const exerciseNames = await getExerciseNames([...exerciseServerIds]);

  const trainingMaxes = new Map<string, { tm: number; oneRm: number | null; recordId: string }>();
  for (const tm of tms) {
    const r = tm as UserTrainingMax;
    trainingMaxes.set(r.exerciseId, {
      tm: r.trainingMaxKg,
      oneRm: r.oneRepMaxKg ?? null,
      recordId: r.id,
    });
  }

  return {
    best1RMByExercise: best1RM,
    exerciseNames,
    trainingMaxes,
  };
}

export function getTmForExercise(
  trainingMaxes: Map<string, { tm: number; oneRm: number | null; recordId: string }>,
  exerciseId: string
): { trainingMaxKg: number; oneRepMaxKg: number | null } | null {
  const e = trainingMaxes.get(exerciseId);
  if (!e) return null;
  return { trainingMaxKg: e.tm, oneRepMaxKg: e.oneRm };
}

/**
 * Create or update a Training Max record. Uses server_id for exercise_id.
 * If recordId provided, update; else create.
 */
export async function saveTrainingMax(
  userId: string,
  exerciseId: string,
  trainingMaxKg: number,
  oneRepMaxKg?: number | null,
  recordId?: string | null
): Promise<void> {
  await database.write(async () => {
    const now = new Date();
    if (recordId) {
      const existing = await userTrainingMaxesCollection.find(recordId);
      await existing.update((r: UserTrainingMax) => {
        r.trainingMaxKg = trainingMaxKg;
        r.oneRepMaxKg = oneRepMaxKg ?? undefined;
        r.updatedAt = now;
      });
    } else {
      const serverId = uuid();
      await userTrainingMaxesCollection.create((r: UserTrainingMax) => {
        r.serverId = serverId;
        r.userId = userId;
        r.exerciseId = exerciseId;
        r.trainingMaxKg = trainingMaxKg;
        r.oneRepMaxKg = oneRepMaxKg ?? undefined;
        r.updatedAt = now;
      });
    }
  });
}

/**
 * Soft-delete a Training Max record.
 */
export async function deleteTrainingMax(recordId: string): Promise<void> {
  await database.write(async () => {
    const rec = await userTrainingMaxesCollection.find(recordId);
    await rec.markAsDeleted();
  });
}
