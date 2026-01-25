/**
 * Phase 2E: Training Max data hook.
 */

import { useState, useCallback, useEffect } from 'react';
import { loadTrainingMaxData, getTmForExercise } from '../services/trainingMax';

export interface UseTrainingMaxesResult {
  best1RMByExercise: Map<string, number>;
  exerciseNames: Map<string, string>;
  trainingMaxes: Map<string, { tm: number; oneRm: number | null; recordId: string }>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Returns TM for exercise (server id) or null. */
  getTmForExercise: (exerciseId: string) => { trainingMaxKg: number; oneRepMaxKg: number | null } | null;
}

export function useTrainingMaxes(userId: string | undefined): UseTrainingMaxesResult {
  const [best1RMByExercise, setBest1RMByExercise] = useState<Map<string, number>>(new Map());
  const [exerciseNames, setExerciseNames] = useState<Map<string, string>>(new Map());
  const [trainingMaxes, setTrainingMaxes] = useState<
    Map<string, { tm: number; oneRm: number | null; recordId: string }>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await loadTrainingMaxData(userId);
      setBest1RMByExercise(data.best1RMByExercise);
      setExerciseNames(data.exerciseNames);
      setTrainingMaxes(data.trainingMaxes);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getTmForExerciseBound = useCallback(
    (exerciseId: string) => getTmForExercise(trainingMaxes, exerciseId),
    [trainingMaxes]
  );

  return {
    best1RMByExercise,
    exerciseNames,
    trainingMaxes,
    loading,
    error,
    refresh,
    getTmForExercise: getTmForExerciseBound,
  };
}
