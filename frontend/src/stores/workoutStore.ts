import { create } from 'zustand';
import { database, workoutsCollection, workoutSetsCollection } from '../db';
import { syncCritical, syncBackground, syncDatabase } from '../db/sync'; // A4: Use syncCritical for workout sync
import { supabase } from '../services/supabase';
import { v4 as uuid } from 'uuid';
import { Q } from '@nozbe/watermelondb';
import type Workout from '../db/models/Workout';
import type WorkoutSetModel from '../db/models/WorkoutSet';
import { logError } from '../utils/errorHandler';
import { trackEvent } from '../services/monitoring';
import { announceForAccessibility } from '../utils/accessibility';
import { useSyncStatusStore } from './syncStatusStore';
import { CircuitOpenError } from '../utils/circuitBreaker';

export interface WorkoutSet {
  id: string;
  exerciseId: string;
  exerciseName: string;
  weightKg: string;
  reps: string;
  rpe?: string;
  rir?: string;
  isFailure: boolean;
  note?: string;
  completed: boolean;
  setOrderIndex: number;
}

export interface ExerciseEntry {
  id: string;
  exerciseId: string;
  name: string;
  sets: WorkoutSet[];
}

// A2: Gamification results are now pulled from server via sync-pull
// No longer returned from finishWorkout - UI queries WatermelonDB reactively

// B1: Workout lifecycle state machine
type WorkoutStateStatus =
  | { status: 'idle' }
  | {
      status: 'active';
      workoutId: string;
      workoutName: string;
      workoutNote: string;
      visibility: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';
      startTime: Date;
      exercises: ExerciseEntry[];
      routineOriginId: string | null;
    }
  | {
      status: 'completing';
      workoutId: string;
      workoutName: string;
      workoutNote: string;
      visibility: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';
      startTime: Date;
      exercises: ExerciseEntry[];
      routineOriginId: string | null;
    }
  | {
      status: 'completed';
      workoutId: string;
    }
  | {
      status: 'failed';
      error: string;
      workoutId?: string;
    };

interface WorkoutState {
  // B1: Explicit state machine
  workoutState: WorkoutStateStatus;
  
  // Backward-compatible getters (derived from workoutState)
  isActive: boolean;
  workoutId: string | null;
  workoutName: string;
  workoutNote: string;
  visibility: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';
  startTime: Date | null;
  exercises: ExerciseEntry[];
  routineOriginId: string | null;

  // Actions
  startWorkout: (routineId?: string) => void;
  addExercise: (exerciseId: string, exerciseName: string) => void;
  removeExercise: (exerciseEntryId: string) => void;
  addSet: (exerciseEntryId: string) => void;
  removeSet: (exerciseEntryId: string, setId: string) => void;
  updateSet: (exerciseEntryId: string, setId: string, updates: Partial<WorkoutSet>) => void;
  toggleSetComplete: (exerciseEntryId: string, setId: string) => void;
  quickCompleteSet: (exerciseEntryId: string, setId: string, weight: string, reps: string) => void;
  updateWorkoutName: (name: string) => void;
  updateWorkoutNote: (note: string) => void;
  updateVisibility: (visibility: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE') => void;
  finishWorkout: () => Promise<{
    success: boolean;
    workoutId?: string;
    error?: string;
  }>;
  cancelWorkout: () => void;
}

// A1: Extracted helper functions for workout completion
async function saveWorkoutToLocal(
  activeState: Extract<WorkoutStateStatus, { status: 'active' }>,
  userId: string
): Promise<{ success: boolean; workoutId: string; error?: string }> {
  const workoutServerId = activeState.workoutId;
  const endTime = new Date();

  // Get completed sets only (weight and reps are optional for Quick Log)
  const completedSets: WorkoutSet[] = [];
  activeState.exercises.forEach((exercise) => {
    exercise.sets.forEach((set) => {
      if (set.completed) {
        completedSets.push(set);
      }
    });
  });

  if (completedSets.length === 0) {
    return { success: false, workoutId: workoutServerId, error: 'No completed sets to save' };
  }

  try {
    // Save to WatermelonDB
    await database.write(async () => {
      // Create workout
      const workout = await workoutsCollection.create((w: Workout) => {
        w.serverId = workoutServerId;
        w.userId = userId;
        w.routineOriginId = activeState.routineOriginId || undefined;
        w.name = activeState.workoutName || undefined;
        w.note = activeState.workoutNote || undefined;
        w.startedAt = activeState.startTime;
        w.endedAt = endTime;
        w.localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        w.visibility = activeState.visibility;
      });

      // Create workout sets (weight and reps default to 0 if not provided)
      for (const set of completedSets) {
        await workoutSetsCollection.create((s: WorkoutSetModel) => {
          s.serverId = uuid();
          s.workoutId = workout.id;
          s.exerciseId = set.exerciseId;
          s.weightKg = parseFloat(set.weightKg) || 0;
          s.reps = parseInt(set.reps, 10) || 0;
          s.rpe = set.rpe ? parseFloat(set.rpe) : undefined;
          s.rir = set.rir ? parseInt(set.rir, 10) : undefined;
          s.isFailure = set.isFailure;
          s.note = set.note || undefined;
          s.isPr = false;
          s.setOrderIndex = set.setOrderIndex;
        });
      }
    });

    return { success: true, workoutId: workoutServerId };
  } catch (error) {
    logError(error, 'workoutStore_saveWorkoutToLocal');
    return {
      success: false,
      workoutId: workoutServerId,
      error: error instanceof Error ? error.message : 'Failed to save workout locally',
    };
  }
}

/**
 * B2: Background sync function - does not throw errors
 * Used for fire-and-forget sync in optimistic UI flow
 */
async function syncWorkoutInBackground(idempotencyKey?: string): Promise<void> {
  // A2: Single XP path - gamification (XP, level, PRs, badges, social post) runs server-side in sync-push
  // A6: Pass idempotency key to prevent duplicate processing on retry
  // A4: Use syncCritical for workout sync (only syncs critical tables)
  try {
    await syncCritical({ idempotencyKey });
    
    // B2: Clear any previous sync errors on success
    useSyncStatusStore.getState().clearError();
    
    // Phase 2G: Update challenge scores after workout sync completes
    const state = useWorkoutStore.getState();
    const workoutId = state.workoutId;
    if (workoutId) {
      try {
        await supabase.functions.invoke('update-challenge-scores', {
          body: { workout_id: workoutId },
        });
      } catch (challengeError) {
        logError(challengeError, 'workoutStore_challengeScoreUpdate');
        // Don't fail workout completion if challenge update fails
      }
    }

    // A4: Pull updated gamification data (XP, levels, badges, PRs) from background tables
    // This provides immediate feedback without blocking workout completion
    try {
      await syncBackground();
    } catch (pullError) {
      logError(pullError, 'workoutStore_postSyncPull');
      // Don't fail if pull fails - data will sync on next sync cycle
    }
  } catch (syncError) {
    logError(syncError, 'workoutStore_postWorkoutSync');
    // B2: Store error in sync status store for UI to display
    // B3: Handle circuit breaker errors specially
    let errorMessage: string;
    if (syncError instanceof CircuitOpenError) {
      const retryAfterSeconds = Math.ceil(syncError.retryAfterMs / 1000);
      errorMessage = `Sync paused; will retry shortly. (Retry in ${retryAfterSeconds}s)`;
    } else {
      errorMessage = syncError instanceof Error ? syncError.message : 'Sync failed. Saved locally; will sync when online.';
    }
    useSyncStatusStore.getState().setLastError(errorMessage);
    // Don't throw - this is fire-and-forget
  }
}

/**
 * Legacy sync function - throws errors (used by non-optimistic flows)
 * @deprecated Use syncWorkoutInBackground for optimistic UI flows
 */
async function syncWorkout(idempotencyKey?: string): Promise<void> {
  // A2: Single XP path - gamification (XP, level, PRs, badges, social post) runs server-side in sync-push
  // A6: Pass idempotency key to prevent duplicate processing on retry
  try {
    await syncDatabase({ idempotencyKey });
    
    // Phase 2G: Update challenge scores after workout sync completes
    const state = useWorkoutStore.getState();
    const workoutId = state.workoutId;
    if (workoutId) {
      try {
        await supabase.functions.invoke('update-challenge-scores', {
          body: { workout_id: workoutId },
        });
      } catch (challengeError) {
        logError(challengeError, 'workoutStore_challengeScoreUpdate');
        // Don't fail workout completion if challenge update fails
      }
    }

    // Pull updated gamification data (XP, levels, badges, PRs) from server
    // This provides immediate feedback without blocking workout completion
    try {
      await syncDatabase();
    } catch (pullError) {
      logError(pullError, 'workoutStore_postSyncPull');
      // Don't fail if pull fails - data will sync on next sync cycle
    }
  } catch (syncError) {
    logError(syncError, 'workoutStore_postWorkoutSync');
    // Don't fail the workout save if sync fails - it will sync later
    throw syncError; // Re-throw so finishWorkout can handle it
  }
}

export const useWorkoutStore = create<WorkoutState>((set, get) => {
  // Helper to derive backward-compatible fields from state
  const deriveFields = (state: WorkoutStateStatus) => {
    if (state.status === 'idle') {
      return {
        isActive: false,
        workoutId: null,
        workoutName: '',
        workoutNote: '',
        visibility: 'PUBLIC' as const,
        startTime: null,
        exercises: [],
        routineOriginId: null,
      };
    }
    if (state.status === 'active' || state.status === 'completing') {
      return {
        isActive: state.status === 'active',
        workoutId: state.workoutId,
        workoutName: state.workoutName,
        workoutNote: state.workoutNote,
        visibility: state.visibility,
        startTime: state.startTime,
        exercises: state.exercises,
        routineOriginId: state.routineOriginId,
      };
    }
    // completed or failed
    return {
      isActive: false,
      workoutId: state.workoutId || null,
      workoutName: '',
      workoutNote: '',
      visibility: 'PUBLIC' as const,
      startTime: null,
      exercises: [],
      routineOriginId: null,
    };
  };

  return {
    // B1: Initial state machine state
    workoutState: { status: 'idle' } as WorkoutStateStatus,
    
    // Backward-compatible fields (derived)
    ...deriveFields({ status: 'idle' }),

    startWorkout: (routineId?: string) => {
      const now = new Date();
      const newState: WorkoutStateStatus = {
        status: 'active',
        workoutId: uuid(),
        workoutName: `Workout ${now.toLocaleDateString()}`,
        workoutNote: '',
        visibility: 'PUBLIC',
        startTime: now,
        exercises: [],
        routineOriginId: routineId || null,
      };
      set({
        workoutState: newState,
        ...deriveFields(newState),
      });
    },

    addExercise: (exerciseId: string, exerciseName: string) => {
      const newExercise: ExerciseEntry = {
        id: uuid(),
        exerciseId,
        name: exerciseName,
        sets: [
          {
            id: uuid(),
            exerciseId,
            exerciseName,
            weightKg: '',
            reps: '',
            isFailure: false,
            completed: false,
            setOrderIndex: 0,
          },
        ],
      };
      set((state) => {
        // B1: Only allow adding exercises when active
        if (state.workoutState.status !== 'active') return state;
        
        const updatedExercises = [...state.exercises, newExercise];
        const newState: WorkoutStateStatus = {
          ...state.workoutState,
          exercises: updatedExercises,
        };
        return {
          workoutState: newState,
          ...deriveFields(newState),
        };
      });
    },

  removeExercise: (exerciseEntryId: string) => {
    set((state) => {
      // B1: Only allow removing exercises when active
      if (state.workoutState.status !== 'active') return state;
      
      const updatedExercises = state.exercises.filter((ex) => ex.id !== exerciseEntryId);
      const newState: WorkoutStateStatus = {
        ...state.workoutState,
        exercises: updatedExercises,
      };
      return {
        workoutState: newState,
        ...deriveFields(newState),
      };
    });
  },

  addSet: (exerciseEntryId: string) => {
    set((state) => {
      // B1: Only allow adding sets when active
      if (state.workoutState.status !== 'active') return state;
      
      const updatedExercises = state.exercises.map((ex) => {
        if (ex.id === exerciseEntryId) {
          const newSetIndex = ex.sets.length;
          return {
            ...ex,
            sets: [
              ...ex.sets,
              {
                id: uuid(),
                exerciseId: ex.exerciseId,
                exerciseName: ex.name,
                weightKg: '',
                reps: '',
                isFailure: false,
                completed: false,
                setOrderIndex: newSetIndex,
              },
            ],
          };
        }
        return ex;
      });
      const newState: WorkoutStateStatus = {
        ...state.workoutState,
        exercises: updatedExercises,
      };
      return {
        workoutState: newState,
        ...deriveFields(newState),
      };
    });
  },

  removeSet: (exerciseEntryId: string, setId: string) => {
    set((state) => {
      // B1: Only allow removing sets when active
      if (state.workoutState.status !== 'active') return state;
      
      const updatedExercises = state.exercises.map((ex) => {
        if (ex.id === exerciseEntryId) {
          return {
            ...ex,
            sets: ex.sets.filter((s) => s.id !== setId),
          };
        }
        return ex;
      });
      const newState: WorkoutStateStatus = {
        ...state.workoutState,
        exercises: updatedExercises,
      };
      return {
        workoutState: newState,
        ...deriveFields(newState),
      };
    });
  },

  updateSet: (exerciseEntryId: string, setId: string, updates: Partial<WorkoutSet>) => {
    set((state) => {
      // B1: Only allow updating sets when active
      if (state.workoutState.status !== 'active') return state;
      
      const updatedExercises = state.exercises.map((ex) => {
        if (ex.id === exerciseEntryId) {
          return {
            ...ex,
            sets: ex.sets.map((s) => {
              if (s.id === setId) {
                return { ...s, ...updates };
              }
              return s;
            }),
          };
        }
        return ex;
      });
      const newState: WorkoutStateStatus = {
        ...state.workoutState,
        exercises: updatedExercises,
      };
      return {
        workoutState: newState,
        ...deriveFields(newState),
      };
    });
  },

  toggleSetComplete: (exerciseEntryId: string, setId: string) => {
    set((state) => {
      // B1: Only allow toggling sets when active
      if (state.workoutState.status !== 'active') return state;
      
      let completedSetCount = 0;
      let totalSetCount = 0;
      let exerciseName = '';

      const updatedExercises = state.exercises.map((ex) => {
        if (ex.id === exerciseEntryId) {
          exerciseName = ex.name;
          return {
            ...ex,
            sets: ex.sets.map((s) => {
              totalSetCount++;
              if (s.id === setId) {
                const newCompleted = !s.completed;
                if (newCompleted) {
                  completedSetCount++;
                }
                return { ...s, completed: newCompleted };
              }
              if (s.completed) {
                completedSetCount++;
              }
              return s;
            }),
          };
        } else {
          ex.sets.forEach((s) => {
            totalSetCount++;
            if (s.completed) completedSetCount++;
          });
        }
        return ex;
      });

      // Announce set completion
      const remainingSets = totalSetCount - completedSetCount;
      if (completedSetCount > 0 && remainingSets > 0) {
        announceForAccessibility(`Set completed. ${remainingSets} sets remaining.`);
      } else if (completedSetCount === totalSetCount && totalSetCount > 0) {
        announceForAccessibility(`All sets completed for ${exerciseName}.`);
      }

      const newState: WorkoutStateStatus = {
        ...state.workoutState,
        exercises: updatedExercises,
      };
      return {
        workoutState: newState,
        ...deriveFields(newState),
      };
    });
  },

  quickCompleteSet: (exerciseEntryId: string, setId: string, weight: string, reps: string) => {
    set((state) => {
      // B1: Only allow quick completing sets when active
      if (state.workoutState.status !== 'active') return state;
      
      const updatedExercises = state.exercises.map((ex) => {
        if (ex.id === exerciseEntryId) {
          return {
            ...ex,
            sets: ex.sets.map((s) => {
              if (s.id === setId) {
                return {
                  ...s,
                  weightKg: weight,
                  reps: reps,
                  completed: true,
                };
              }
              return s;
            }),
          };
        }
        return ex;
      });
      const newState: WorkoutStateStatus = {
        ...state.workoutState,
        exercises: updatedExercises,
      };
      return {
        workoutState: newState,
        ...deriveFields(newState),
      };
    });
  },

  updateWorkoutName: (name: string) => {
    set((state) => {
      // B1: Only allow updating name when active
      if (state.workoutState.status !== 'active') return state;
      
      const newState: WorkoutStateStatus = {
        ...state.workoutState,
        workoutName: name,
      };
      return {
        workoutState: newState,
        ...deriveFields(newState),
      };
    });
  },

  updateWorkoutNote: (note: string) => {
    set((state) => {
      // B1: Only allow updating note when active
      if (state.workoutState.status !== 'active') return state;
      
      const newState: WorkoutStateStatus = {
        ...state.workoutState,
        workoutNote: note,
      };
      return {
        workoutState: newState,
        ...deriveFields(newState),
      };
    });
  },

  updateVisibility: (visibility: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE') => {
    set((state) => {
      // B1: Only allow updating visibility when active
      if (state.workoutState.status !== 'active') return state;
      
      const newState: WorkoutStateStatus = {
        ...state.workoutState,
        visibility,
      };
      return {
        workoutState: newState,
        ...deriveFields(newState),
      };
    });
  },

  finishWorkout: async () => {
    // A1: Orchestrator - delegates to extracted functions
    try {
      const state = get();
      
      // B1: Guard - only allow finishing when active, prevent double-submit
      if (state.workoutState.status !== 'active') {
        if (state.workoutState.status === 'completing') {
          return { success: false, error: 'Workout completion already in progress' };
        }
        return { success: false, error: 'No active workout to finish' };
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // B1: Transition to completing state (non-reentrant)
      const activeState = state.workoutState;
      const completingState: WorkoutStateStatus = {
        status: 'completing',
        workoutId: activeState.workoutId,
        workoutName: activeState.workoutName,
        workoutNote: activeState.workoutNote,
        visibility: activeState.visibility,
        startTime: activeState.startTime,
        exercises: activeState.exercises,
        routineOriginId: activeState.routineOriginId,
      };
      set({
        workoutState: completingState,
        ...deriveFields(completingState),
      });

      // A1: Extract function 1 - Save workout to local database
      const saveResult = await saveWorkoutToLocal(activeState, user.id);
      if (!saveResult.success) {
        throw new Error(saveResult.error);
      }

      // B2: Transition to completed state immediately (optimistic UI)
      // User sees success within ~500ms without waiting for sync
      const completedState: WorkoutStateStatus = {
        status: 'completed',
        workoutId: saveResult.workoutId,
      };
      set({
        workoutState: completedState,
        ...deriveFields(completedState),
      });

      // Announce workout completion
      announceForAccessibility('Workout completed successfully');

      // B2: Fire-and-forget background sync (does not block UI)
      // A6: Generate idempotency key before sync (ensures deduplication on retry)
      const idempotencyKey = uuid();
      syncWorkoutInBackground(idempotencyKey).catch((err) => {
        // Error already handled in syncWorkoutInBackground (stored in syncStatusStore)
        logError(err, 'workoutStore_finishWorkout_backgroundSync');
      });

      return {
        success: true,
        workoutId: saveResult.workoutId,
      };
    } catch (error) {
      logError(error, 'workoutStore_finishWorkout');
      
      // B1: Transition to failed state
      const currentState = get().workoutState;
      const failedState: WorkoutStateStatus = {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Failed to save workout',
        workoutId: currentState.status === 'completing' || currentState.status === 'active' 
          ? currentState.workoutId 
          : undefined,
      };
      set({
        workoutState: failedState,
        ...deriveFields(failedState),
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save workout',
      };
    }
  },

    cancelWorkout: () => {
      // B1: Transition from active to idle
      set((state) => {
        if (state.workoutState.status !== 'active') {
          // Already idle or in invalid state, reset to idle
          const idleState: WorkoutStateStatus = { status: 'idle' };
          return {
            workoutState: idleState,
            ...deriveFields(idleState),
          };
        }
        
        const idleState: WorkoutStateStatus = { status: 'idle' };
        return {
          workoutState: idleState,
          ...deriveFields(idleState),
        };
      });
    },
  };
});

export default useWorkoutStore;
