/**
 * Phase 2D: Fetch workout + set + exercise data for export.
 */

import { Q } from '@nozbe/watermelondb';
import {
  workoutsCollection,
  exercisesCollection,
} from '../../db';
import type Workout from '../../db/models/Workout';
import type WorkoutSet from '../../db/models/WorkoutSet';
import type Exercise from '../../db/models/Exercise';

export interface ExportSet {
  set: WorkoutSet;
  exerciseName: string;
}

export interface ExportWorkout {
  workout: Workout;
  sets: ExportSet[];
}

export interface ExportData {
  workouts: ExportWorkout[];
}

export async function getExportData(
  userId: string,
  start: Date,
  end: Date
): Promise<ExportData> {
  const startMs = start.getTime();
  const endMs = end.getTime();

  const workoutRecords = await workoutsCollection
    .query(
      Q.where('user_id', userId),
      Q.where('deleted_at', null),
      Q.and(
        Q.where('started_at', Q.gte(startMs)),
        Q.where('started_at', Q.lte(endMs))
      ),
      Q.sortBy('started_at', Q.desc)
    )
    .fetch();

  const exerciseIds = new Set<string>();
  const workoutSets: { workout: Workout; sets: WorkoutSet[] }[] = [];

  for (const w of workoutRecords) {
    const sets = await w.sets.fetch();
    const nonDeleted = sets.filter((s: WorkoutSet) => !s.deletedAt);
    for (const s of nonDeleted) {
      exerciseIds.add(s.exerciseId);
    }
    workoutSets.push({ workout: w, sets: nonDeleted });
  }

  const exerciseIdList = Array.from(exerciseIds);
  const exerciseRecords = exerciseIdList.length
    ? await exercisesCollection
        .query(Q.where('id', Q.oneOf(exerciseIdList)))
        .fetch()
    : [];
  const exerciseMap = new Map<string, Exercise>();
  for (const e of exerciseRecords) {
    exerciseMap.set(e.id, e);
  }

  const workouts: ExportWorkout[] = [];
  for (const { workout, sets } of workoutSets) {
    const exportSets: ExportSet[] = [];
    for (const s of sets) {
      const ex = exerciseMap.get(s.exerciseId);
      exportSets.push({
        set: s,
        exerciseName: ex?.name ?? 'Unknown',
      });
    }
    exportSets.sort((a, b) => (a.set.setOrderIndex ?? 0) - (b.set.setOrderIndex ?? 0));
    workouts.push({ workout, sets: exportSets });
  }

  return { workouts };
}
