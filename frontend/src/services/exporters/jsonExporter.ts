/**
 * Phase 2D: JSON export – Pro/Elite, full history.
 */

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { ExportData } from './exportData';
import type { ExportOptions } from '../importers/types';
import {
  getTier,
  canExportJson,
  getExportDateRange,
} from './exportLimits';
import { getExportData } from './exportData';

interface JsonSet {
  set_index: number;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  distance_km: number | null;
  duration_seconds: number | null;
  note: string | null;
  is_pr: boolean;
}

interface JsonExercise {
  name: string;
  sets: JsonSet[];
}

interface JsonWorkout {
  name: string;
  started_at: string;
  ended_at: string | null;
  note: string | null;
  exercises: JsonExercise[];
}

function toIso(d: Date): string {
  return d.toISOString();
}

/** Build JSON structure for export. */
export function exportWorkoutsToJson(data: ExportData): string {
  const workouts: JsonWorkout[] = [];

  for (const { workout, sets } of data.workouts) {
    const byExercise = new Map<string, JsonSet[]>();

    for (const { set, exerciseName } of sets) {
      const arr = byExercise.get(exerciseName) ?? [];
      arr.push({
        set_index: set.setOrderIndex ?? 0,
        weight_kg: set.weightKg ?? null,
        reps: set.reps ?? null,
        rpe: set.rpe ?? null,
        distance_km:
          set.distanceMeters != null ? set.distanceMeters / 1000 : null,
        duration_seconds: set.durationSeconds ?? null,
        note: set.note ?? null,
        is_pr: set.isPr ?? false,
      });
      byExercise.set(exerciseName, arr);
    }

    const exercises: JsonExercise[] = [];
    for (const [name, setList] of byExercise) {
      setList.sort((a, b) => a.set_index - b.set_index);
      exercises.push({ name, sets: setList });
    }

    workouts.push({
      name: workout.name ?? 'Untitled',
      started_at: toIso(workout.startedAt),
      ended_at: workout.endedAt ? toIso(workout.endedAt) : null,
      note: workout.note ?? null,
      exercises,
    });
  }

  return JSON.stringify({ workouts }, null, 2);
}

export interface ShareJsonResult {
  success: boolean;
  error?: string;
}

export async function shareJsonExport(
  userId: string,
  options: ExportOptions
): Promise<ShareJsonResult> {
  const tier = await getTier(userId);
  const check = canExportJson(tier);
  if (!check.allowed) {
    return { success: false, error: check.reason };
  }

  const range = options.dateRange ?? getExportDateRange(tier);
  const data = await getExportData(userId, range.start, range.end);
  const json = exportWorkoutsToJson(data);
  const name = `spotter-export-${new Date().toISOString().slice(0, 10)}.json`;
  const path = `${FileSystem.cacheDirectory}${name}`;

  try {
    await FileSystem.writeAsStringAsync(path, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Write failed';
    return { success: false, error: msg };
  }

  try {
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      return { success: false, error: 'Sharing is not available on this device.' };
    }
    await Sharing.shareAsync(path, {
      mimeType: 'application/json',
      dialogTitle: 'Export workout data',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Share failed';
    return { success: false, error: msg };
  }

  return { success: true };
}
