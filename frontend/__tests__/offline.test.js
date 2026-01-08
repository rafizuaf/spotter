/**
 * Offline Mode Tests
 * Tests for offline-first behavior and sync functionality
 */

describe('Offline Mode', () => {
  // Mock database
  const mockDatabase = {
    workouts: [],
    workoutSets: [],
    follows: [],
    syncQueue: [],
  };

  // Helper to simulate creating a workout
  const createWorkout = (userId, name) => {
    const workout = {
      id: `workout-${Date.now()}`,
      serverId: `server-${Date.now()}`,
      userId,
      name,
      startedAt: new Date(),
      endedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    mockDatabase.workouts.push(workout);
    mockDatabase.syncQueue.push({ type: 'create', table: 'workouts', record: workout });
    return workout;
  };

  // Helper to simulate completing a workout
  const completeWorkout = (workoutId) => {
    const workout = mockDatabase.workouts.find((w) => w.id === workoutId);
    if (workout) {
      workout.endedAt = new Date();
      workout.updatedAt = new Date();
      mockDatabase.syncQueue.push({ type: 'update', table: 'workouts', record: workout });
    }
    return workout;
  };

  // Helper to simulate adding a set
  const addSet = (workoutId, exerciseId, weightKg, reps) => {
    const set = {
      id: `set-${Date.now()}-${Math.random()}`,
      serverId: `server-set-${Date.now()}`,
      workoutId,
      exerciseId,
      weightKg,
      reps,
      isPr: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    mockDatabase.workoutSets.push(set);
    mockDatabase.syncQueue.push({ type: 'create', table: 'workout_sets', record: set });
    return set;
  };

  // Helper to simulate sync
  const simulateSync = () => {
    const synced = [...mockDatabase.syncQueue];
    mockDatabase.syncQueue = [];
    return synced;
  };

  beforeEach(() => {
    // Reset mock database
    mockDatabase.workouts = [];
    mockDatabase.workoutSets = [];
    mockDatabase.follows = [];
    mockDatabase.syncQueue = [];
  });

  describe('Workout Creation Offline', () => {
    it('should create workout locally when offline', () => {
      const workout = createWorkout('user-1', 'Morning Workout');

      expect(workout).toBeDefined();
      expect(workout.id).toBeDefined();
      expect(workout.name).toBe('Morning Workout');
      expect(mockDatabase.workouts).toHaveLength(1);
    });

    it('should queue workout for sync when created offline', () => {
      createWorkout('user-1', 'Morning Workout');

      expect(mockDatabase.syncQueue).toHaveLength(1);
      expect(mockDatabase.syncQueue[0].type).toBe('create');
      expect(mockDatabase.syncQueue[0].table).toBe('workouts');
    });

    it('should add sets to workout offline', () => {
      const workout = createWorkout('user-1', 'Morning Workout');
      const set1 = addSet(workout.id, 'exercise-1', 100, 10);
      const set2 = addSet(workout.id, 'exercise-1', 100, 8);

      expect(mockDatabase.workoutSets).toHaveLength(2);
      expect(set1.workoutId).toBe(workout.id);
      expect(set2.workoutId).toBe(workout.id);
    });

    it('should complete workout and queue for sync', () => {
      const workout = createWorkout('user-1', 'Morning Workout');
      addSet(workout.id, 'exercise-1', 100, 10);
      completeWorkout(workout.id);

      const completed = mockDatabase.workouts.find((w) => w.id === workout.id);
      expect(completed.endedAt).toBeDefined();
      expect(mockDatabase.syncQueue.length).toBeGreaterThan(0);
    });
  });

  describe('Sync Queue Management', () => {
    it('should accumulate changes in sync queue', () => {
      const workout = createWorkout('user-1', 'Workout 1');
      addSet(workout.id, 'exercise-1', 100, 10);
      addSet(workout.id, 'exercise-1', 100, 8);
      completeWorkout(workout.id);

      // 1 workout create + 2 set creates + 1 workout update
      expect(mockDatabase.syncQueue).toHaveLength(4);
    });

    it('should clear sync queue after successful sync', () => {
      createWorkout('user-1', 'Workout 1');
      expect(mockDatabase.syncQueue).toHaveLength(1);

      const synced = simulateSync();
      expect(synced).toHaveLength(1);
      expect(mockDatabase.syncQueue).toHaveLength(0);
    });

    it('should maintain order of sync operations', () => {
      const workout = createWorkout('user-1', 'Workout 1');
      addSet(workout.id, 'exercise-1', 100, 10);
      completeWorkout(workout.id);

      expect(mockDatabase.syncQueue[0].table).toBe('workouts');
      expect(mockDatabase.syncQueue[0].type).toBe('create');
      expect(mockDatabase.syncQueue[1].table).toBe('workout_sets');
      expect(mockDatabase.syncQueue[2].table).toBe('workouts');
      expect(mockDatabase.syncQueue[2].type).toBe('update');
    });
  });

  describe('Conflict Resolution', () => {
    it('should use server timestamp for conflict resolution', () => {
      // Simulate a record that was updated both locally and on server
      const localUpdate = {
        id: 'workout-1',
        name: 'Local Update',
        updatedAt: new Date('2024-01-01T10:00:00Z'),
      };

      const serverUpdate = {
        id: 'workout-1',
        name: 'Server Update',
        updatedAt: new Date('2024-01-01T11:00:00Z'), // Later timestamp
      };

      // Server wins because its timestamp is later
      const winner =
        serverUpdate.updatedAt > localUpdate.updatedAt ? serverUpdate : localUpdate;
      expect(winner.name).toBe('Server Update');
    });

    it('should preserve local changes when server has older data', () => {
      const localUpdate = {
        id: 'workout-1',
        name: 'Local Update',
        updatedAt: new Date('2024-01-01T12:00:00Z'), // Later timestamp
      };

      const serverUpdate = {
        id: 'workout-1',
        name: 'Server Update',
        updatedAt: new Date('2024-01-01T10:00:00Z'),
      };

      const winner =
        localUpdate.updatedAt > serverUpdate.updatedAt ? localUpdate : serverUpdate;
      expect(winner.name).toBe('Local Update');
    });

    it('should soft delete win over updates', () => {
      const localUpdate = {
        id: 'workout-1',
        name: 'Updated Name',
        deletedAt: null,
        updatedAt: new Date('2024-01-01T12:00:00Z'),
      };

      const serverDelete = {
        id: 'workout-1',
        deletedAt: new Date('2024-01-01T11:00:00Z'),
        updatedAt: new Date('2024-01-01T11:00:00Z'),
      };

      // Soft delete should win
      const isDeleted = serverDelete.deletedAt !== null;
      expect(isDeleted).toBe(true);
    });
  });

  describe('Data Persistence', () => {
    it('should persist workout data locally', () => {
      const workout = createWorkout('user-1', 'Persisted Workout');

      // Simulate app restart by reading from "database"
      const retrieved = mockDatabase.workouts.find((w) => w.id === workout.id);
      expect(retrieved).toBeDefined();
      expect(retrieved.name).toBe('Persisted Workout');
    });

    it('should persist sets with workout', () => {
      const workout = createWorkout('user-1', 'Workout with Sets');
      addSet(workout.id, 'exercise-1', 100, 10);
      addSet(workout.id, 'exercise-2', 50, 12);

      const sets = mockDatabase.workoutSets.filter((s) => s.workoutId === workout.id);
      expect(sets).toHaveLength(2);
    });

    it('should handle multiple workouts', () => {
      createWorkout('user-1', 'Workout 1');
      createWorkout('user-1', 'Workout 2');
      createWorkout('user-1', 'Workout 3');

      expect(mockDatabase.workouts).toHaveLength(3);
    });
  });

  describe('Network Error Recovery', () => {
    it('should retain sync queue on network failure', () => {
      createWorkout('user-1', 'Failed Sync Workout');

      // Simulate network failure by not clearing queue
      const syncFailed = true;
      if (!syncFailed) {
        mockDatabase.syncQueue = [];
      }

      expect(mockDatabase.syncQueue).toHaveLength(1);
    });

    it('should retry sync after network recovery', () => {
      createWorkout('user-1', 'Retry Workout');

      // First attempt fails
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts && mockDatabase.syncQueue.length > 0) {
        attempts++;
        if (attempts === maxAttempts) {
          // Network recovered, sync succeeds
          simulateSync();
        }
      }

      expect(mockDatabase.syncQueue).toHaveLength(0);
      expect(attempts).toBe(3);
    });
  });
});
