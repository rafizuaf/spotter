import { renderHook, act } from '@testing-library/react-hooks';
import { useWorkoutStore } from '../src/stores/workoutStore';
import { database } from '../src/db';
import { Q } from '@nozbe/watermelondb';

// Mock Supabase
const mockInvoke = jest.fn();
jest.mock('../src/services/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null,
      }),
    },
    functions: {
      invoke: mockInvoke,
    },
  },
}));

describe('Gamification System', () => {
  beforeEach(async () => {
    // Clear database
    await database.write(async () => {
      const workouts = await database.collections.get('workouts').query().fetch();
      const sets = await database.collections.get('workout_sets').query().fetch();
      const xpLogs = await database.collections.get('user_xp_logs').query().fetch();
      const userLevels = await database.collections.get('user_levels').query().fetch();
      const badges = await database.collections.get('user_badges').query().fetch();

      await Promise.all([
        ...workouts.map((w) => w.markAsDeleted()),
        ...sets.map((s) => s.markAsDeleted()),
        ...xpLogs.map((x) => x.markAsDeleted()),
        ...userLevels.map((l) => l.markAsDeleted()),
        ...badges.map((b) => b.markAsDeleted()),
      ]);
    });

    // Reset workout store
    const { result } = renderHook(() => useWorkoutStore());
    act(() => {
      result.current.cancelWorkout();
    });

    // Reset mock
    mockInvoke.mockClear();
  });

  describe('XP Awarding', () => {
    it('should award XP after workout completion', async () => {
      mockInvoke.mockImplementation((funcName) => {
        if (funcName === 'award-xp') {
          return Promise.resolve({
            data: { success: true, xpAwarded: 120 },
            error: null,
          });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      const { result } = renderHook(() => useWorkoutStore());

      // Start workout
      act(() => {
        result.current.startWorkout();
      });

      // Add exercise and set
      act(() => {
        result.current.addExercise('ex-1', 'Bench Press');
      });

      const exerciseId = result.current.exercises[0].id;
      const setId = result.current.exercises[0].sets[0].id;

      act(() => {
        result.current.updateSet(exerciseId, setId, {
          weightKg: '100',
          reps: '10',
        });
        result.current.toggleSetComplete(exerciseId, setId);
      });

      // Finish workout
      let workoutResult: { success: boolean; gamification?: { xpAwarded: number } } | undefined;
      await act(async () => {
        workoutResult = await result.current.finishWorkout();
      });

      expect(workoutResult?.success).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('award-xp', expect.any(Object));
      expect(workoutResult?.gamification?.xpAwarded).toBe(120);
    });

    it('should not award XP if edge function fails', async () => {
      mockInvoke.mockImplementation((funcName) => {
        if (funcName === 'award-xp') {
          return Promise.resolve({
            data: null,
            error: { message: 'Server error' },
          });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      const { result } = renderHook(() => useWorkoutStore());

      act(() => {
        result.current.startWorkout();
        result.current.addExercise('ex-1', 'Bench Press');
      });

      const exerciseId = result.current.exercises[0].id;
      const setId = result.current.exercises[0].sets[0].id;

      act(() => {
        result.current.updateSet(exerciseId, setId, {
          weightKg: '100',
          reps: '10',
        });
        result.current.toggleSetComplete(exerciseId, setId);
      });

      let workoutResult: { success: boolean } | undefined;
      await act(async () => {
        workoutResult = await result.current.finishWorkout();
      });

      // Workout should still succeed even if XP fails
      expect(workoutResult?.success).toBe(true);
    });
  });

  describe('Level Calculation', () => {
    it('should calculate level after workout', async () => {
      mockInvoke.mockImplementation((funcName) => {
        if (funcName === 'calculate-level') {
          return Promise.resolve({
            data: {
              success: true,
              totalXp: 500,
              level: 3,
              xpToNextLevel: 400,
            },
            error: null,
          });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      const { result } = renderHook(() => useWorkoutStore());

      act(() => {
        result.current.startWorkout();
        result.current.addExercise('ex-1', 'Squat');
      });

      const exerciseId = result.current.exercises[0].id;
      const setId = result.current.exercises[0].sets[0].id;

      act(() => {
        result.current.updateSet(exerciseId, setId, {
          weightKg: '150',
          reps: '5',
        });
        result.current.toggleSetComplete(exerciseId, setId);
      });

      let workoutResult: { success: boolean; gamification?: { newLevel: number } } | undefined;
      await act(async () => {
        workoutResult = await result.current.finishWorkout();
      });

      expect(workoutResult?.success).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('calculate-level', {
        body: { userId: 'test-user-id' },
      });
      expect(workoutResult?.gamification?.newLevel).toBe(3);
    });
  });

  describe('PR Detection', () => {
    it('should detect PRs after workout', async () => {
      mockInvoke.mockImplementation((funcName) => {
        if (funcName === 'detect-pr') {
          return Promise.resolve({
            data: {
              success: true,
              prCount: 2,
              prs: [
                { exerciseId: 'ex-1', setId: 'set-1', newPR: 150, previousPR: 140 },
                { exerciseId: 'ex-2', setId: 'set-2', newPR: 100, previousPR: 95 },
              ],
            },
            error: null,
          });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      const { result } = renderHook(() => useWorkoutStore());

      act(() => {
        result.current.startWorkout();
        result.current.addExercise('ex-1', 'Deadlift');
      });

      const exerciseId = result.current.exercises[0].id;
      const setId = result.current.exercises[0].sets[0].id;

      act(() => {
        result.current.updateSet(exerciseId, setId, {
          weightKg: '200',
          reps: '5',
        });
        result.current.toggleSetComplete(exerciseId, setId);
      });

      let workoutResult: { success: boolean; gamification?: { prCount: number } } | undefined;
      await act(async () => {
        workoutResult = await result.current.finishWorkout();
      });

      expect(workoutResult?.success).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('detect-pr', expect.any(Object));
      expect(workoutResult?.gamification?.prCount).toBe(2);
    });
  });

  describe('Badge Unlocking', () => {
    it('should unlock badges after workout', async () => {
      mockInvoke.mockImplementation((funcName) => {
        if (funcName === 'unlock-badge') {
          return Promise.resolve({
            data: {
              success: true,
              badgeCount: 1,
              newBadges: [
                {
                  code: 'FIRST_WORKOUT',
                  title: 'First Workout',
                  description: 'Complete your first workout',
                  earnedAt: new Date().toISOString(),
                },
              ],
            },
            error: null,
          });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      const { result } = renderHook(() => useWorkoutStore());

      act(() => {
        result.current.startWorkout();
        result.current.addExercise('ex-1', 'Push Up');
      });

      const exerciseId = result.current.exercises[0].id;
      const setId = result.current.exercises[0].sets[0].id;

      act(() => {
        result.current.updateSet(exerciseId, setId, {
          weightKg: '0',
          reps: '20',
        });
        result.current.toggleSetComplete(exerciseId, setId);
      });

      let workoutResult: { success: boolean; gamification?: { badgesUnlocked: number } } | undefined;
      await act(async () => {
        workoutResult = await result.current.finishWorkout();
      });

      expect(workoutResult?.success).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('unlock-badge', {
        body: { userId: 'test-user-id' },
      });
      expect(workoutResult?.gamification?.badgesUnlocked).toBe(1);
    });
  });

  describe('Complete Gamification Flow', () => {
    it('should execute all gamification functions in sequence', async () => {
      mockInvoke.mockImplementation((funcName) => {
        switch (funcName) {
          case 'award-xp':
            return Promise.resolve({
              data: { success: true, xpAwarded: 100 },
              error: null,
            });
          case 'calculate-level':
            return Promise.resolve({
              data: { success: true, level: 2, totalXp: 250, xpToNextLevel: 150 },
              error: null,
            });
          case 'detect-pr':
            return Promise.resolve({
              data: { success: true, prCount: 1 },
              error: null,
            });
          case 'unlock-badge':
            return Promise.resolve({
              data: { success: true, badgeCount: 1 },
              error: null,
            });
          default:
            return Promise.resolve({ data: {}, error: null });
        }
      });

      const { result } = renderHook(() => useWorkoutStore());

      act(() => {
        result.current.startWorkout();
        result.current.addExercise('ex-1', 'Overhead Press');
      });

      const exerciseId = result.current.exercises[0].id;
      const setId = result.current.exercises[0].sets[0].id;

      act(() => {
        result.current.updateSet(exerciseId, setId, {
          weightKg: '60',
          reps: '8',
        });
        result.current.toggleSetComplete(exerciseId, setId);
      });

      let workoutResult: {
        success: boolean;
        gamification?: {
          xpAwarded: number;
          newLevel: number;
          prCount: number;
          badgesUnlocked: number;
        };
      } | undefined;
      await act(async () => {
        workoutResult = await result.current.finishWorkout();
      });

      // Verify all functions were called
      expect(mockInvoke).toHaveBeenCalledWith('award-xp', expect.any(Object));
      expect(mockInvoke).toHaveBeenCalledWith('calculate-level', expect.any(Object));
      expect(mockInvoke).toHaveBeenCalledWith('detect-pr', expect.any(Object));
      expect(mockInvoke).toHaveBeenCalledWith('unlock-badge', expect.any(Object));

      // Verify all results returned
      expect(workoutResult?.success).toBe(true);
      expect(workoutResult?.gamification?.xpAwarded).toBe(100);
      expect(workoutResult?.gamification?.newLevel).toBe(2);
      expect(workoutResult?.gamification?.prCount).toBe(1);
      expect(workoutResult?.gamification?.badgesUnlocked).toBe(1);
    });
  });
});
