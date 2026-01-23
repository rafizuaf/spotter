import { useState, useEffect, useCallback } from 'react';
import { Q } from '@nozbe/watermelondb';
import { workoutSetsCollection } from '../db';
import { getSuggestedWeight, type Gender } from '../constants/startingWeights';
import type WorkoutSet from '../db/models/WorkoutSet';

export interface ExerciseHistory {
  /** Most recent weight from any previous workout (in KG) */
  lastWorkoutWeight: number | null;
  /** Most recent reps from any previous workout */
  lastWorkoutReps: number | null;
  /** Suggested starting weight for beginners (in KG) */
  suggestedWeight: number | null;
  /** Whether data is still loading */
  isLoading: boolean;
  /** Refresh the history data */
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch exercise history for smart weight/reps presets
 *
 * Priority for weight suggestions:
 * 1. Last completed set from previous workouts
 * 2. Suggested starting weight for beginners (from startingWeights.ts)
 * 3. null (user must enter manually)
 *
 * @param exerciseId - The exercise ID to fetch history for
 * @param exerciseName - The exercise name (for starting weight lookup)
 * @param gender - User's gender (for starting weight calculation)
 * @param currentWorkoutId - The current active workout ID (to exclude from history)
 */
export function useExerciseHistory(
  exerciseId: string | null,
  exerciseName: string,
  gender: Gender = 'OTHER',
  currentWorkoutId?: string | null
): ExerciseHistory {
  const [lastWorkoutWeight, setLastWorkoutWeight] = useState<number | null>(null);
  const [lastWorkoutReps, setLastWorkoutReps] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get suggested starting weight for beginners
  const suggestedWeight = getSuggestedWeight(exerciseName, gender, 'BEGINNER');

  const fetchHistory = useCallback(async () => {
    if (!exerciseId) {
      setLastWorkoutWeight(null);
      setLastWorkoutReps(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Build query conditions
      const conditions = [
        Q.where('exercise_id', exerciseId),
        Q.where('deleted_at', null),
      ];

      // Exclude current workout sets if provided
      if (currentWorkoutId) {
        conditions.push(Q.where('workout_id', Q.notEq(currentWorkoutId)));
      }

      // Query for the most recent sets with this exercise
      const recentSets = await workoutSetsCollection
        .query(
          Q.and(...conditions),
          Q.sortBy('created_at', Q.desc),
          Q.take(10) // Get last 10 sets to find valid weight/reps
        )
        .fetch();

      if (recentSets.length > 0) {
        // Find the first set with valid weight
        const setWithWeight = recentSets.find(
          (set: WorkoutSet) => set.weightKg !== undefined && set.weightKg !== null && set.weightKg > 0
        );

        // Find the first set with valid reps
        const setWithReps = recentSets.find(
          (set: WorkoutSet) => set.reps !== undefined && set.reps !== null && set.reps > 0
        );

        setLastWorkoutWeight(setWithWeight?.weightKg ?? null);
        setLastWorkoutReps(setWithReps?.reps ?? null);
      } else {
        setLastWorkoutWeight(null);
        setLastWorkoutReps(null);
      }
    } catch (error) {
      console.error('Error fetching exercise history:', error);
      setLastWorkoutWeight(null);
      setLastWorkoutReps(null);
    } finally {
      setIsLoading(false);
    }
  }, [exerciseId, currentWorkoutId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    lastWorkoutWeight,
    lastWorkoutReps,
    suggestedWeight,
    isLoading,
    refresh: fetchHistory,
  };
}

/**
 * Get smart weight presets based on exercise history
 *
 * Returns an array of weight values for quick-select buttons
 *
 * @param lastSetWeight - Last weight from current workout (for this exercise)
 * @param lastWorkoutWeight - Last weight from previous workouts
 * @param suggestedWeight - Suggested starting weight for beginners
 * @param weightUnit - User's preferred weight unit
 */
export function getWeightPresets(
  lastSetWeight: number | null,
  lastWorkoutWeight: number | null,
  suggestedWeight: number | null,
  weightUnit: 'KG' | 'LBS' = 'KG'
): number[] {
  // Determine base weight (priority: last set > last workout > suggested > default)
  const baseWeight = lastSetWeight ?? lastWorkoutWeight ?? suggestedWeight ?? 20;

  // Increment based on unit (2.5kg or 5lbs)
  const increment = weightUnit === 'KG' ? 2.5 : 5;

  // Generate presets: [base - increment, base, base + increment]
  const presets: number[] = [];

  const lowerWeight = baseWeight - increment;
  if (lowerWeight > 0) {
    presets.push(lowerWeight);
  }

  presets.push(baseWeight);
  presets.push(baseWeight + increment);

  // Convert to LBS if needed
  if (weightUnit === 'LBS') {
    return presets.map(w => Math.round(w * 2.20462));
  }

  return presets;
}

/**
 * Standard rep presets for quick selection
 */
export const REP_PRESETS = [5, 8, 10, 12, 15];

/**
 * Get the default rep selection based on history
 *
 * @param lastSetReps - Reps from last set in current workout
 * @param lastWorkoutReps - Reps from previous workout
 */
export function getDefaultReps(
  lastSetReps: number | null,
  lastWorkoutReps: number | null
): number | null {
  // Priority: last set in current workout > last workout
  const reps = lastSetReps ?? lastWorkoutReps;

  if (reps === null) return null;

  // Return the preset that's closest to the last reps
  const closest = REP_PRESETS.reduce((prev, curr) =>
    Math.abs(curr - reps) < Math.abs(prev - reps) ? curr : prev
  );

  return closest;
}
