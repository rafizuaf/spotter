import { create } from 'zustand';
import { database, workoutsCollection, workoutSetsCollection } from '../db';
import { syncDatabase } from '../db/sync';
import { supabase } from '../services/supabase';
import { v4 as uuid } from 'uuid';
import type Workout from '../db/models/Workout';
import type WorkoutSetModel from '../db/models/WorkoutSet';

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

interface WorkoutState {
  // State
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
  updateWorkoutName: (name: string) => void;
  updateWorkoutNote: (note: string) => void;
  updateVisibility: (visibility: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE') => void;
  finishWorkout: () => Promise<{ success: boolean; workoutId?: string; error?: string }>;
  cancelWorkout: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  // Initial state
  isActive: false,
  workoutId: null,
  workoutName: '',
  workoutNote: '',
  visibility: 'PUBLIC',
  startTime: null,
  exercises: [],
  routineOriginId: null,

  startWorkout: (routineId?: string) => {
    const now = new Date();
    set({
      isActive: true,
      workoutId: uuid(),
      workoutName: `Workout ${now.toLocaleDateString()}`,
      workoutNote: '',
      visibility: 'PUBLIC',
      startTime: now,
      exercises: [],
      routineOriginId: routineId || null,
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
    set((state) => ({
      exercises: [...state.exercises, newExercise],
    }));
  },

  removeExercise: (exerciseEntryId: string) => {
    set((state) => ({
      exercises: state.exercises.filter((ex) => ex.id !== exerciseEntryId),
    }));
  },

  addSet: (exerciseEntryId: string) => {
    set((state) => ({
      exercises: state.exercises.map((ex) => {
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
      }),
    }));
  },

  removeSet: (exerciseEntryId: string, setId: string) => {
    set((state) => ({
      exercises: state.exercises.map((ex) => {
        if (ex.id === exerciseEntryId) {
          return {
            ...ex,
            sets: ex.sets.filter((s) => s.id !== setId),
          };
        }
        return ex;
      }),
    }));
  },

  updateSet: (exerciseEntryId: string, setId: string, updates: Partial<WorkoutSet>) => {
    set((state) => ({
      exercises: state.exercises.map((ex) => {
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
      }),
    }));
  },

  toggleSetComplete: (exerciseEntryId: string, setId: string) => {
    set((state) => ({
      exercises: state.exercises.map((ex) => {
        if (ex.id === exerciseEntryId) {
          return {
            ...ex,
            sets: ex.sets.map((s) => {
              if (s.id === setId) {
                return { ...s, completed: !s.completed };
              }
              return s;
            }),
          };
        }
        return ex;
      }),
    }));
  },

  updateWorkoutName: (name: string) => {
    set({ workoutName: name });
  },

  updateWorkoutNote: (note: string) => {
    set({ workoutNote: note });
  },

  updateVisibility: (visibility: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE') => {
    set({ visibility });
  },

  finishWorkout: async () => {
    try {
      const state = get();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      if (!state.startTime) {
        return { success: false, error: 'No workout start time' };
      }

      const workoutServerId = state.workoutId || uuid();
      const endTime = new Date();

      // Get completed sets only
      const completedSets: WorkoutSet[] = [];
      state.exercises.forEach((exercise) => {
        exercise.sets.forEach((set) => {
          if (set.completed && set.weightKg && set.reps) {
            completedSets.push(set);
          }
        });
      });

      if (completedSets.length === 0) {
        return { success: false, error: 'No completed sets to save' };
      }

      // Save to WatermelonDB
      await database.write(async () => {
        // Create workout
        const workout = await workoutsCollection.create((w: Workout) => {
          w.serverId = workoutServerId;
          w.userId = user.id;
          w.routineOriginId = state.routineOriginId || undefined;
          w.name = state.workoutName || undefined;
          w.note = state.workoutNote || undefined;
          w.startedAt = state.startTime!;
          w.endedAt = endTime;
          w.localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          w.visibility = state.visibility;
        });

        // Create workout sets
        for (const set of completedSets) {
          await workoutSetsCollection.create((s: WorkoutSetModel) => {
            s.serverId = uuid();
            s.workoutId = workout.id;
            s.exerciseId = set.exerciseId;
            s.weightKg = parseFloat(set.weightKg);
            s.reps = parseInt(set.reps, 10);
            s.rpe = set.rpe ? parseFloat(set.rpe) : undefined;
            s.rir = set.rir ? parseInt(set.rir, 10) : undefined;
            s.isFailure = set.isFailure;
            s.note = set.note || undefined;
            s.isPr = false;
            s.setOrderIndex = set.setOrderIndex;
          });
        }
      });

      // Sync to server
      try {
        await syncDatabase();
      } catch (syncError) {
        console.warn('Sync failed, will retry later:', syncError);
        // Don't fail the workout save if sync fails - it will sync later
      }

      // Call award-xp function
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.functions.invoke('award-xp', {
            body: { workoutId: workoutServerId },
          });
        }
      } catch (xpError) {
        console.warn('XP award failed:', xpError);
        // Don't fail the workout save if XP fails
      }

      // Reset workout state
      set({
        isActive: false,
        workoutId: null,
        workoutName: '',
        workoutNote: '',
        visibility: 'PUBLIC',
        startTime: null,
        exercises: [],
        routineOriginId: null,
      });

      return { success: true, workoutId: workoutServerId };
    } catch (error) {
      console.error('Error finishing workout:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save workout',
      };
    }
  },

  cancelWorkout: () => {
    set({
      isActive: false,
      workoutId: null,
      workoutName: '',
      workoutNote: '',
      visibility: 'PUBLIC',
      startTime: null,
      exercises: [],
      routineOriginId: null,
    });
  },
}));

export default useWorkoutStore;
