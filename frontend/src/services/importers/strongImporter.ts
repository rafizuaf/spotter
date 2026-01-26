/**
 * Phase 2D: Strong CSV import – parse into ImportPreview.
 * 
 * Strong exports CSV with columns:
 * Date, Workout Name, Exercise Name, Set Order, Weight, Reps, Distance, Seconds, Notes, Workout Notes, RPE
 */

import Papa from 'papaparse';
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

interface StrongRow {
  Date: string;
  'Workout Name': string;
  'Exercise Name': string;
  'Set Order': string;
  Weight: string;
  Reps: string;
  Distance: string;
  Seconds: string;
  Notes: string;
  'Workout Notes': string;
  RPE: string;
}

/** Parse Strong CSV string into ImportPreview. */
export async function parseStrongCsv(csvContent: string): Promise<ImportPreview> {
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

  const { data, errors } = Papa.parse<StrongRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  if (errors.length > 0) {
    console.warn('[Strong import] CSV parse warnings:', errors);
  }

  // Group by workout (Date + Workout Name)
  const workoutGroups = new Map<string, StrongRow[]>();
  for (const row of data) {
    const key = `${row.Date ?? ''}|${row['Workout Name'] ?? ''}`;
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

    // Parse date (Strong format: "2026-01-15" or "1/15/2026")
    const dateStr = first.Date?.trim() || '';
    let startedAt: Date;
    if (dateStr.includes('/')) {
      // US format: M/D/YYYY
      const [month, day, year] = dateStr.split('/');
      startedAt = new Date(
        parseInt(year ?? '0', 10),
        parseInt(month ?? '1', 10) - 1,
        parseInt(day ?? '1', 10),
        12, // Default to noon
        0
      );
    } else {
      // ISO format: YYYY-MM-DD
      startedAt = new Date(dateStr + 'T12:00:00');
    }

    const endedAt = startedAt; // Strong doesn't track end time

    if (!dateMin || startedAt < dateMin) dateMin = startedAt;
    if (!dateMax || startedAt > dateMax) dateMax = startedAt;

    // Group by exercise
    const exerciseGroups = new Map<string, StrongRow[]>();
    for (const row of rows) {
      const exerciseName = row['Exercise Name']?.trim() || '';
      if (!exerciseGroups.has(exerciseName)) {
        exerciseGroups.set(exerciseName, []);
      }
      exerciseGroups.get(exerciseName)!.push(row);
    }

    const parsedExercises: ParsedExercise[] = [];
    for (const [exerciseName, exerciseRows] of exerciseGroups) {
      if (!exerciseName) continue;

      exerciseNames.add(exerciseName);
      const match = matchExercise(exerciseName, library);
      if (!match.exerciseId) {
        unmatchedExercises.add(exerciseName);
      }

      // Sort by Set Order
      exerciseRows.sort((a, b) => {
        const orderA = parseInt(a['Set Order']?.trim() || '0', 10);
        const orderB = parseInt(b['Set Order']?.trim() || '0', 10);
        return orderA - orderB;
      });

      const sets: ParsedSet[] = exerciseRows.map((row, index) => {
        const weightStr = row.Weight?.trim();
        const repsStr = row.Reps?.trim();
        const distanceStr = row.Distance?.trim();
        const secondsStr = row.Seconds?.trim();
        const rpeStr = row.RPE?.trim();

        return {
          index: parseInt(row['Set Order']?.trim() || String(index), 10),
          type: 'normal',
          weightKg: weightStr ? parseFloat(weightStr) : null,
          reps: repsStr ? parseInt(repsStr, 10) : null,
          distanceKm: distanceStr ? parseFloat(distanceStr) : null,
          durationSeconds: secondsStr ? parseInt(secondsStr, 10) : null,
          rpe: rpeStr ? parseFloat(rpeStr) : null,
        };
      });

      totalSets += sets.length;
      const notes = exerciseRows[0]?.Notes?.trim() || '';

      parsedExercises.push({
        name: match.exerciseName,
        originalName: exerciseName,
        matchedExerciseId: match.exerciseId,
        matchedExerciseLocalId: match.localId,
        matchConfidence: match.confidence,
        notes,
        supersetId: null, // Strong doesn't track supersets
        sets,
      });
    }

    const workoutName = first['Workout Name']?.trim() || 'Imported workout';
    const workoutNotes = first['Workout Notes']?.trim() || '';

    workouts.push({
      name: workoutName,
      startedAt,
      endedAt,
      description: workoutNotes,
      exercises: parsedExercises,
    });
  }

  workouts.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

  return {
    source: 'generic', // Use generic source since Strong format is similar
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
