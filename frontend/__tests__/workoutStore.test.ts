/**
 * WorkoutStore Tests
 * 
 * Tests for the workout store state management
 */

import { useWorkoutStore } from '../src/stores/workoutStore';

// Mock dependencies
jest.mock('../src/db', () => ({
  database: {
    write: jest.fn((callback) => callback()),
  },
  workoutsCollection: {
    create: jest.fn(),
  },
  workoutSetsCollection: {
    create: jest.fn(),
  },
}));

jest.mock('../src/db/sync', () => ({
  syncDatabase: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/services/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}));

describe('WorkoutStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useWorkoutStore.getState().cancelWorkout();
  });

  describe('startWorkout', () => {
    it('should initialize workout state', () => {
      const store = useWorkoutStore.getState();
      
      expect(store.isActive).toBe(false);
      
      store.startWorkout();
      
      const state = useWorkoutStore.getState();
      expect(state.isActive).toBe(true);
      expect(state.workoutId).toBeTruthy();
      expect(state.startTime).toBeInstanceOf(Date);
      expect(state.exercises).toEqual([]);
    });

    it('should accept optional routine ID', () => {
      const store = useWorkoutStore.getState();
      const routineId = 'routine-123';
      
      store.startWorkout(routineId);
      
      const state = useWorkoutStore.getState();
      expect(state.routineOriginId).toBe(routineId);
    });
  });

  describe('addExercise', () => {
    it('should add exercise with initial set', () => {
      const store = useWorkoutStore.getState();
      
      store.startWorkout();
      store.addExercise('exercise-1', 'Bench Press');
      
      const state = useWorkoutStore.getState();
      expect(state.exercises).toHaveLength(1);
      expect(state.exercises[0].name).toBe('Bench Press');
      expect(state.exercises[0].sets).toHaveLength(1);
    });

    it('should add multiple exercises', () => {
      const store = useWorkoutStore.getState();
      
      store.startWorkout();
      store.addExercise('exercise-1', 'Bench Press');
      store.addExercise('exercise-2', 'Squat');
      
      const state = useWorkoutStore.getState();
      expect(state.exercises).toHaveLength(2);
    });
  });

  describe('removeExercise', () => {
    it('should remove exercise by ID', () => {
      const store = useWorkoutStore.getState();
      
      store.startWorkout();
      store.addExercise('exercise-1', 'Bench Press');
      store.addExercise('exercise-2', 'Squat');
      
      const exerciseId = useWorkoutStore.getState().exercises[0].id;
      store.removeExercise(exerciseId);
      
      const state = useWorkoutStore.getState();
      expect(state.exercises).toHaveLength(1);
      expect(state.exercises[0].name).toBe('Squat');
    });
  });

  describe('addSet', () => {
    it('should add set to exercise', () => {
      const store = useWorkoutStore.getState();
      
      store.startWorkout();
      store.addExercise('exercise-1', 'Bench Press');
      
      const exercise = useWorkoutStore.getState().exercises[0];
      store.addSet(exercise.id);
      
      const state = useWorkoutStore.getState();
      expect(state.exercises[0].sets).toHaveLength(2);
    });
  });

  describe('updateSet', () => {
    it('should update set data', () => {
      const store = useWorkoutStore.getState();
      
      store.startWorkout();
      store.addExercise('exercise-1', 'Bench Press');
      
      const exercise = useWorkoutStore.getState().exercises[0];
      const set = exercise.sets[0];
      
      store.updateSet(exercise.id, set.id, {
        weightKg: '100',
        reps: '10',
      });
      
      const state = useWorkoutStore.getState();
      const updatedSet = state.exercises[0].sets[0];
      expect(updatedSet.weightKg).toBe('100');
      expect(updatedSet.reps).toBe('10');
    });
  });

  describe('toggleSetComplete', () => {
    it('should toggle set completion status', () => {
      const store = useWorkoutStore.getState();
      
      store.startWorkout();
      store.addExercise('exercise-1', 'Bench Press');
      
      const exercise = useWorkoutStore.getState().exercises[0];
      const set = exercise.sets[0];
      
      expect(set.completed).toBe(false);
      
      store.toggleSetComplete(exercise.id, set.id);
      
      const state = useWorkoutStore.getState();
      expect(state.exercises[0].sets[0].completed).toBe(true);
      
      store.toggleSetComplete(exercise.id, set.id);
      
      const state2 = useWorkoutStore.getState();
      expect(state2.exercises[0].sets[0].completed).toBe(false);
    });
  });

  describe('cancelWorkout', () => {
    it('should reset all workout state', () => {
      const store = useWorkoutStore.getState();
      
      store.startWorkout();
      store.addExercise('exercise-1', 'Bench Press');
      
      expect(store.isActive).toBe(true);
      
      store.cancelWorkout();
      
      const state = useWorkoutStore.getState();
      expect(state.isActive).toBe(false);
      expect(state.workoutId).toBeNull();
      expect(state.exercises).toEqual([]);
    });
  });

  describe('finishWorkout', () => {
    it('should return error if no completed sets', async () => {
      const store = useWorkoutStore.getState();
      
      store.startWorkout();
      store.addExercise('exercise-1', 'Bench Press');
      
      const result = await store.finishWorkout();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No completed sets');
    });

    it('should successfully finish workout with completed sets', async () => {
      const store = useWorkoutStore.getState();
      
      store.startWorkout();
      store.addExercise('exercise-1', 'Bench Press');
      
      const exercise = useWorkoutStore.getState().exercises[0];
      const set = exercise.sets[0];
      
      store.updateSet(exercise.id, set.id, {
        weightKg: '100',
        reps: '10',
      });
      store.toggleSetComplete(exercise.id, set.id);
      
      const result = await store.finishWorkout();
      
      expect(result.success).toBe(true);
      expect(result.workoutId).toBeTruthy();
    });
  });
});
