/**
 * Phase 2D: Hevy CSV import – parse into ImportPreview.
 */

import Papa from 'papaparse';
import { Q } from '@nozbe/watermelondb';
import { exercisesCollection } from '../../db';
import { normalizeExerciseName, matchExercise } from './exerciseMatcher';
import type { ExerciseLibraryEntry } from './exerciseMatcher';
import type {
  HevyRow,
  ImportPreview,
  ParsedWorkout,
  ParsedExercise,
  ParsedSet,
} from './types';

const MONTH_MAP: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

/** Parse Hevy date "24 Jan 2026, 09:15" -> Date. */
function parseHevyDate(str: string): Date {
  const [datePart, timePart] = str.split(', ');
  const [day, monthAbbr, year] = datePart.split(' ');
  const [hours, minutes] = (timePart ?? '0:0').split(':');
  const monthIndex = MONTH_MAP[monthAbbr ?? 'Jan'] ?? 0;
  return new Date(
    parseInt(year ?? '0', 10),
    monthIndex,
    parseInt(day ?? '1', 10),
    parseInt(hours ?? '0', 10),
    parseInt(minutes ?? '0', 10)
  );
}

/** Parse Hevy CSV string into ImportPreview. */
export async function parseHevyCsv(csvContent: string): Promise<ImportPreview> {
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

  const { data, errors } = Papa.parse<HevyRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  if (errors.length > 0) {
    console.warn('[Hevy import] CSV parse warnings:', errors);
  }

  const workoutGroups = new Map<string, HevyRow[]>();
  for (const row of data) {
    const key = `${row.title ?? ''}|${row.start_time ?? ''}`;
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

    const exerciseGroups = new Map<string, HevyRow[]>();
    for (const row of rows) {
      const ek = row.exercise_title ?? '';
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
          type: row.set_type?.trim() || 'normal',
          weightKg: wk ? parseFloat(wk) : null,
          reps: rk ? parseInt(rk, 10) : null,
          distanceKm: dk ? parseFloat(dk) : null,
          durationSeconds: dsk ? parseInt(dsk, 10) : null,
          rpe: rpek ? parseFloat(rpek) : null,
        };
      });

      totalSets += sets.length;
      const notes = exerciseRows[0]?.exercise_notes?.trim() ?? '';
      const supersetId = exerciseRows[0]?.superset_id?.trim() || null;

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

    const startedAt = parseHevyDate(first.start_time ?? '');
    const endedAt = parseHevyDate(first.end_time ?? first.start_time ?? '');
    if (!dateMin || startedAt < dateMin) dateMin = startedAt;
    if (!dateMax || startedAt > dateMax) dateMax = startedAt;

    workouts.push({
      name: first.title?.trim() ?? 'Imported workout',
      startedAt,
      endedAt,
      description: first.description?.trim() ?? '',
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
