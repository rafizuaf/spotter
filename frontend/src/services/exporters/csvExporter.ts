/**
 * Phase 2D: CSV export – Spotter generic format, tier-gated.
 */

import Papa from 'papaparse';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { ExportData } from './exportData';
import type { ExportOptions } from '../importers/types';
import {
  getTier,
  getLastExportAt,
  setLastExportAt,
  canExportCsv,
  getExportDateRange,
} from './exportLimits';
import { getExportData } from './exportData';

const CSV_HEADERS = [
  'workout_name',
  'workout_started_at',
  'workout_ended_at',
  'workout_note',
  'exercise_name',
  'set_index',
  'weight_kg',
  'reps',
  'rpe',
  'distance_km',
  'duration_seconds',
  'set_note',
] as const;

/** Minimal CSV with headers only for generic import template. */
function buildCsvTemplate(): string {
  const headerLine = CSV_HEADERS.map((h) => `"${h}"`).join(',');
  return headerLine + '\n';
}

function toIso(date: Date): string {
  return date.toISOString();
}

function num(v: number | undefined | null): string {
  if (v === undefined || v === null) return '';
  return String(v);
}

/** Build CSV string in Spotter generic format (round-trip with import). */
export function exportWorkoutsToCsv(data: ExportData): string {
  const rows: Record<string, string>[] = [];

  for (const { workout, sets } of data.workouts) {
    const name = workout.name ?? '';
    const started = toIso(workout.startedAt);
    const ended = workout.endedAt ? toIso(workout.endedAt) : started;
    const note = workout.note ?? '';

    for (const { set, exerciseName } of sets) {
      const idx = set.setOrderIndex ?? 0;
      const weight = set.weightKg;
      const reps = set.reps;
      const rpe = set.rpe;
      const distKm = set.distanceMeters != null ? set.distanceMeters / 1000 : null;
      const dur = set.durationSeconds;
      const setNote = set.note ?? '';

      rows.push({
        workout_name: name,
        workout_started_at: started,
        workout_ended_at: ended,
        workout_note: note,
        exercise_name: exerciseName,
        set_index: String(idx),
        weight_kg: num(weight),
        reps: num(reps),
        rpe: num(rpe),
        distance_km: num(distKm),
        duration_seconds: num(dur),
        set_note: setNote,
      });
    }
  }

  return Papa.unparse(rows, { columns: [...CSV_HEADERS] });
}

export interface ShareCsvResult {
  success: boolean;
  error?: string;
}

/**
 * Resolve tier, check limits, fetch data, build CSV, share. Free: 1x/month, 30-day range.
 */
export async function shareCsvExport(
  userId: string,
  options: ExportOptions
): Promise<ShareCsvResult> {
  const tier = await getTier(userId);
  const lastExport = await getLastExportAt();
  const check = canExportCsv(tier, lastExport);
  if (!check.allowed) {
    return { success: false, error: check.reason };
  }

  let start: Date;
  let end: Date;
  if (tier === 'FREE') {
    end = new Date();
    start = new Date();
    start.setDate(start.getDate() - 30);
  } else {
    const range = options.dateRange ?? getExportDateRange(tier);
    start = range.start;
    end = range.end;
  }

  const data = await getExportData(userId, start, end);
  const csv = exportWorkoutsToCsv(data);
  const name = `spotter-export-${new Date().toISOString().slice(0, 10)}.csv`;
  const path = `${FileSystem.cacheDirectory}${name}`;

  try {
    await FileSystem.writeAsStringAsync(path, csv, {
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
      mimeType: 'text/csv',
      dialogTitle: 'Export workout data',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Share failed';
    return { success: false, error: msg };
  }

  if (tier === 'FREE') {
    await setLastExportAt(new Date().toISOString());
  }

  return { success: true };
}

export interface ShareTemplateResult {
  success: boolean;
  error?: string;
}

/** Share generic CSV template (headers only) for import. No tier gating. */
export async function shareCsvTemplate(): Promise<ShareTemplateResult> {
  const csv = buildCsvTemplate();
  const name = 'spotter-import-template.csv';
  const path = `${FileSystem.cacheDirectory}${name}`;

  try {
    await FileSystem.writeAsStringAsync(path, csv, {
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
      mimeType: 'text/csv',
      dialogTitle: 'Spotter CSV template',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Share failed';
    return { success: false, error: msg };
  }

  return { success: true };
}
