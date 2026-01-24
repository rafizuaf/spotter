/**
 * Phase 2D: Data Import/Export – type definitions.
 * Hevy CSV format and parsed structures.
 */

/** Raw Spotter generic CSV row (round-trip import/export). */
export interface GenericRow {
  workout_name: string;
  workout_started_at: string;
  workout_ended_at: string;
  workout_note: string;
  exercise_name: string;
  set_index: string;
  weight_kg: string;
  reps: string;
  rpe: string;
  distance_km: string;
  duration_seconds: string;
  set_note: string;
}

/** Raw Hevy CSV row (header columns). */
export interface HevyRow {
  title: string;
  start_time: string;
  end_time: string;
  description: string;
  exercise_title: string;
  superset_id: string;
  exercise_notes: string;
  set_index: string;
  set_type: string;
  weight_kg: string;
  reps: string;
  distance_km: string;
  duration_seconds: string;
  rpe: string;
}

/** Parsed workout (intermediate structure before commit). */
export interface ParsedWorkout {
  name: string;
  startedAt: Date;
  endedAt: Date;
  description: string;
  exercises: ParsedExercise[];
}

/** Parsed exercise within a workout. */
export interface ParsedExercise {
  name: string;
  originalName: string;
  matchedExerciseId: string | null;
  matchedExerciseLocalId: string | null;
  matchConfidence: number;
  notes: string;
  supersetId: string | null;
  sets: ParsedSet[];
}

/** Parsed set within an exercise. */
export interface ParsedSet {
  index: number;
  type: string;
  weightKg: number | null;
  reps: number | null;
  distanceKm: number | null;
  durationSeconds: number | null;
  rpe: number | null;
}

/** Preview shown before user confirms import. */
export interface ImportPreview {
  source: 'hevy' | 'generic';
  totalWorkouts: number;
  totalSets: number;
  dateRange: { start: Date; end: Date };
  uniqueExercises: number;
  unmatchedExercises: string[];
  workouts: ParsedWorkout[];
}

/** Result of commitImport. */
export interface ImportResult {
  success: boolean;
  workoutsImported: number;
  setsImported: number;
  exercisesCreated: number;
  errors: string[];
}

/** Export format options. */
export type ExportFormat = 'csv' | 'json' | 'pdf';

/** Options for export. */
export interface ExportOptions {
  format: ExportFormat;
  dateRange?: { start: Date; end: Date };
  includeBodyLogs: boolean;
  includeRoutines: boolean;
}
