/**
 * Phase 2E: Weekly volume by muscle group (Pro+).
 */

import { Q } from '@nozbe/watermelondb';
import {
  workoutsCollection,
  workoutSetsCollection,
  exercisesCollection,
} from '../db';
import type WorkoutSet from '../db/models/WorkoutSet';
import type Exercise from '../db/models/Exercise';

export interface MuscleVolume {
  muscleGroup: string;
  volumeKg: number;
}

/** Monday 00:00 local for the week containing d. */
export function getWeekStartMonday(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Week end (exclusive): Monday + 7 days. */
export function getWeekEnd(weekStart: Date): Date {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 7);
  return end;
}

/**
 * Aggregate volume (sum of weight_kg * reps) per muscle_group for the given week.
 * Week = Monday–Sunday. Uses local time for week boundaries.
 */
export async function getWeeklyVolumeByMuscle(
  userId: string,
  weekStart: Date
): Promise<MuscleVolume[]> {
  const weekEnd = getWeekEnd(weekStart);
  const startMs = weekStart.getTime();
  const endMs = weekEnd.getTime();

  const userWorkouts = await workoutsCollection
    .query(
      Q.where('user_id', userId),
      Q.where('deleted_at', null),
      Q.where('started_at', Q.gte(startMs)),
      Q.where('started_at', Q.lt(endMs))
    )
    .fetch();

  const workoutIds = userWorkouts.map((w) => w.id);
  if (workoutIds.length === 0) return [];

  const sets = (await workoutSetsCollection
    .query(
      Q.where('workout_id', Q.oneOf(workoutIds)),
      Q.where('deleted_at', null)
    )
    .fetch()) as WorkoutSet[];

  const localExIds = [...new Set(sets.map((s) => s.exerciseId))];
  const exercises = await exercisesCollection
    .query(Q.where('id', Q.oneOf(localExIds)), Q.where('deleted_at', null))
    .fetch();
  const localToMuscle = new Map<string, string>();
  for (const e of exercises) {
    const ex = e as Exercise;
    localToMuscle.set(ex.id, ex.muscleGroup ?? 'Other');
  }

  const byMuscle = new Map<string, number>();
  for (const s of sets) {
    const weight = s.weightKg ?? 0;
    const reps = s.reps ?? 0;
    if (weight <= 0 || reps <= 0) continue;
    const muscle = localToMuscle.get(s.exerciseId) ?? 'Other';
    const vol = (byMuscle.get(muscle) ?? 0) + weight * reps;
    byMuscle.set(muscle, vol);
  }

  return Array.from(byMuscle.entries())
    .map(([muscleGroup, volumeKg]) => ({ muscleGroup, volumeKg }))
    .sort((a, b) => b.volumeKg - a.volumeKg);
}

/**
 * Last N week-start dates (Mondays), most recent first.
 */
export function getLastWeekStarts(n: number): Date[] {
  const out: Date[] = [];
  const today = new Date();
  let monday = getWeekStartMonday(today);
  for (let i = 0; i < n; i++) {
    out.push(new Date(monday));
    monday.setDate(monday.getDate() - 7);
  }
  return out;
}
