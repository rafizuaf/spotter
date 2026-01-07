import { renderHook, act } from '@testing-library/react-hooks';
import { useWorkoutStore } from '../src/stores/workoutStore';
import { database, exercisesCollection } from '../src/db';
import { Q } from '@nozbe/watermelondb';

// Mock Supabase
jest.mock('../src/services/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      }),
    },
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: { success: true }, error: null }),
    },
  },
}));

describe('Phase 1 Enhancements', () => {
  beforeEach(async () => {
    // Clear database before each test
    await database.write(async () => {
      const workouts = await database.collections.get('workouts').query().fetch();
      const sets = await database.collections.get('workout_sets').query().fetch();
      const exercises = await database.collections.get('exercises').query().fetch();

      await Promise.all([
        ...workouts.map((w) => w.markAsDeleted()),
        ...sets.map((s) => s.markAsDeleted()),
        ...exercises.map((e) => e.markAsDeleted()),
      ]);
    });

    // Reset workout store
    const { result } = renderHook(() => useWorkoutStore());
    act(() => {
      result.current.cancelWorkout();
    });
  });

  describe('Visibility Picker', () => {
    it('should allow updating workout visibility', () => {
      const { result } = renderHook(() => useWorkoutStore());

      // Start workout
      act(() => {
        result.current.startWorkout();
      });

      expect(result.current.isActive).toBe(true);
      expect(result.current.visibility).toBe('PUBLIC');

      // Update visibility to FOLLOWERS
      act(() => {
        result.current.updateVisibility('FOLLOWERS');
      });

      expect(result.current.visibility).toBe('FOLLOWERS');

      // Update visibility to PRIVATE
      act(() => {
        result.current.updateVisibility('PRIVATE');
      });

      expect(result.current.visibility).toBe('PRIVATE');
    });

    it('should save workout with selected visibility', async () => {
      const { result } = renderHook(() => useWorkoutStore());

      // Start workout
      act(() => {
        result.current.startWorkout();
      });

      // Add exercise and set
      act(() => {
        result.current.addExercise('test-exercise-1', 'Bench Press');
        result.current.updateSet('test-exercise-1', expect.any(String), {
          weightKg: '100',
          reps: '10',
        });
        result.current.toggleSetComplete('test-exercise-1', expect.any(String));
      });

      // Set visibility to FOLLOWERS
      act(() => {
        result.current.updateVisibility('FOLLOWERS');
      });

      // Finish workout
      let workoutResult;
      await act(async () => {
        workoutResult = await result.current.finishWorkout();
      });

      expect(workoutResult.success).toBe(true);

      // Verify workout was saved with correct visibility
      const workouts = await database.collections
        .get('workouts')
        .query(Q.where('deleted_at', null))
        .fetch();

      expect(workouts.length).toBe(1);
      expect(workouts[0].visibility).toBe('FOLLOWERS');
    });
  });

  describe('Custom Exercise Creation', () => {
    it('should create custom exercise with all fields', async () => {
      const exerciseName = 'Custom Squat Variation';
      const muscleGroup = 'Legs';
      const instructions = 'Custom instructions for this exercise';
      const userId = 'test-user-id';

      await database.write(async () => {
        await exercisesCollection.create((exercise) => {
          exercise.serverId = 'custom-exercise-1';
          exercise.name = exerciseName;
          exercise.muscleGroup = muscleGroup;
          exercise.instructions = instructions;
          exercise.isCustom = true;
          exercise.createdByUserId = userId;
        });
      });

      // Verify exercise was created
      const exercises = await exercisesCollection
        .query(
          Q.where('deleted_at', null),
          Q.where('is_custom', true)
        )
        .fetch();

      expect(exercises.length).toBe(1);
      expect(exercises[0].name).toBe(exerciseName);
      expect(exercises[0].muscleGroup).toBe(muscleGroup);
      expect(exercises[0].instructions).toBe(instructions);
      expect(exercises[0].isCustom).toBe(true);
      expect(exercises[0].createdByUserId).toBe(userId);
    });

    it('should allow using custom exercise in workout', async () => {
      // Create custom exercise
      await database.write(async () => {
        await exercisesCollection.create((exercise) => {
          exercise.serverId = 'custom-exercise-2';
          exercise.name = 'Custom Deadlift';
          exercise.muscleGroup = 'Back';
          exercise.isCustom = true;
          exercise.createdByUserId = 'test-user-id';
        });
      });

      const { result } = renderHook(() => useWorkoutStore());

      // Start workout
      act(() => {
        result.current.startWorkout();
      });

      // Add custom exercise
      act(() => {
        result.current.addExercise('custom-exercise-2', 'Custom Deadlift');
      });

      expect(result.current.exercises.length).toBe(1);
      expect(result.current.exercises[0].name).toBe('Custom Deadlift');

      // Add set
      const exerciseId = result.current.exercises[0].id;
      const setId = result.current.exercises[0].sets[0].id;

      act(() => {
        result.current.updateSet(exerciseId, setId, {
          weightKg: '150',
          reps: '5',
        });
        result.current.toggleSetComplete(exerciseId, setId);
      });

      // Finish workout
      let workoutResult;
      await act(async () => {
        workoutResult = await result.current.finishWorkout();
      });

      expect(workoutResult.success).toBe(true);

      // Verify workout was saved with custom exercise
      const workouts = await database.collections
        .get('workouts')
        .query(Q.where('deleted_at', null))
        .fetch();

      expect(workouts.length).toBe(1);

      const sets = await database.collections
        .get('workout_sets')
        .query(
          Q.where('workout_id', workouts[0].id),
          Q.where('deleted_at', null)
        )
        .fetch();

      expect(sets.length).toBe(1);
      expect(sets[0].exerciseId).toBe('custom-exercise-2');
    });

    it('should filter custom exercises by muscle group', async () => {
      // Create multiple custom exercises
      await database.write(async () => {
        await exercisesCollection.create((exercise) => {
          exercise.serverId = 'custom-chest-1';
          exercise.name = 'Custom Chest Press';
          exercise.muscleGroup = 'Chest';
          exercise.isCustom = true;
          exercise.createdByUserId = 'test-user-id';
        });

        await exercisesCollection.create((exercise) => {
          exercise.serverId = 'custom-back-1';
          exercise.name = 'Custom Row';
          exercise.muscleGroup = 'Back';
          exercise.isCustom = true;
          exercise.createdByUserId = 'test-user-id';
        });

        await exercisesCollection.create((exercise) => {
          exercise.serverId = 'custom-legs-1';
          exercise.name = 'Custom Squat';
          exercise.muscleGroup = 'Legs';
          exercise.isCustom = true;
          exercise.createdByUserId = 'test-user-id';
        });
      });

      // Query exercises by muscle group
      const chestExercises = await exercisesCollection
        .query(
          Q.where('deleted_at', null),
          Q.where('muscle_group', 'Chest')
        )
        .fetch();

      const backExercises = await exercisesCollection
        .query(
          Q.where('deleted_at', null),
          Q.where('muscle_group', 'Back')
        )
        .fetch();

      expect(chestExercises.length).toBe(1);
      expect(chestExercises[0].name).toBe('Custom Chest Press');

      expect(backExercises.length).toBe(1);
      expect(backExercises[0].name).toBe('Custom Row');
    });
  });

  describe('Integration: Visibility + Custom Exercise', () => {
    it('should create workout with custom exercise and custom visibility', async () => {
      // Create custom exercise
      await database.write(async () => {
        await exercisesCollection.create((exercise) => {
          exercise.serverId = 'custom-exercise-3';
          exercise.name = 'My Special Exercise';
          exercise.muscleGroup = 'Arms';
          exercise.isCustom = true;
          exercise.createdByUserId = 'test-user-id';
        });
      });

      const { result } = renderHook(() => useWorkoutStore());

      // Start workout
      act(() => {
        result.current.startWorkout();
      });

      // Set visibility to PRIVATE
      act(() => {
        result.current.updateVisibility('PRIVATE');
      });

      // Add custom exercise
      act(() => {
        result.current.addExercise('custom-exercise-3', 'My Special Exercise');
      });

      const exerciseId = result.current.exercises[0].id;
      const setId = result.current.exercises[0].sets[0].id;

      act(() => {
        result.current.updateSet(exerciseId, setId, {
          weightKg: '50',
          reps: '12',
        });
        result.current.toggleSetComplete(exerciseId, setId);
      });

      // Finish workout
      let workoutResult;
      await act(async () => {
        workoutResult = await result.current.finishWorkout();
      });

      expect(workoutResult.success).toBe(true);

      // Verify workout
      const workouts = await database.collections
        .get('workouts')
        .query(Q.where('deleted_at', null))
        .fetch();

      expect(workouts.length).toBe(1);
      expect(workouts[0].visibility).toBe('PRIVATE');

      const sets = await database.collections
        .get('workout_sets')
        .query(
          Q.where('workout_id', workouts[0].id),
          Q.where('deleted_at', null)
        )
        .fetch();

      expect(sets.length).toBe(1);
      expect(sets[0].exerciseId).toBe('custom-exercise-3');
    });
  });
});
