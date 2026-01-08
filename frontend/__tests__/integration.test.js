/**
 * Integration Tests
 * Tests for complete user flows across multiple features
 */

describe('Integration Tests', () => {
  // Mock state
  let state = {};

  // Reset state before each test
  beforeEach(() => {
    state = {
      users: [
        { id: 'user-1', username: 'testuser', email: 'test@example.com', level: 1, totalXp: 0 },
      ],
      userLevels: [{ userId: 'user-1', level: 1, totalXp: 0, xpToNextLevel: 100 }],
      workouts: [],
      workoutSets: [],
      exercises: [
        { id: 'exercise-1', name: 'Bench Press', muscleGroup: 'CHEST' },
        { id: 'exercise-2', name: 'Squat', muscleGroup: 'LEGS' },
        { id: 'exercise-3', name: 'Deadlift', muscleGroup: 'BACK' },
      ],
      follows: [],
      socialPosts: [],
      notifications: [],
      userBadges: [],
      userXpLogs: [],
    };
  });

  // Helper functions
  const createWorkout = (userId, name) => {
    const workout = {
      id: `workout-${Date.now()}`,
      userId,
      name,
      startedAt: new Date(),
      endedAt: null,
      visibility: 'PUBLIC',
    };
    state.workouts.push(workout);
    return workout;
  };

  const addSet = (workoutId, exerciseId, weightKg, reps) => {
    const workout = state.workouts.find((w) => w.id === workoutId);
    const set = {
      id: `set-${Date.now()}-${Math.random()}`,
      workoutId,
      userId: workout.userId,
      exerciseId,
      weightKg,
      reps,
      isPr: false,
    };
    state.workoutSets.push(set);
    return set;
  };

  const finishWorkout = (workoutId) => {
    const workout = state.workouts.find((w) => w.id === workoutId);
    if (workout) {
      workout.endedAt = new Date();

      // Award XP (10 XP per set)
      const sets = state.workoutSets.filter((s) => s.workoutId === workoutId);
      const xpAmount = sets.length * 10;

      state.userXpLogs.push({
        id: `xp-${Date.now()}`,
        userId: workout.userId,
        sourceType: 'WORKOUT',
        sourceId: workoutId,
        xpAmount,
      });

      // Update user level
      const userLevel = state.userLevels.find((l) => l.userId === workout.userId);
      if (userLevel) {
        userLevel.totalXp += xpAmount;
        userLevel.level = Math.floor(Math.sqrt(userLevel.totalXp / 100)) + 1;
      }

      // Create social post
      state.socialPosts.push({
        id: `post-${Date.now()}`,
        userId: workout.userId,
        workoutId,
        headline: `Completed ${workout.name}`,
        createdAt: new Date(),
      });
    }
    return workout;
  };

  const detectPRs = (workoutId) => {
    const workout = state.workouts.find((w) => w.id === workoutId);
    const sets = state.workoutSets.filter((s) => s.workoutId === workoutId);
    const prs = [];

    sets.forEach((set) => {
      // Check historical best for this exercise
      const historicalSets = state.workoutSets.filter(
        (s) => s.exerciseId === set.exerciseId && s.workoutId !== workoutId && s.userId === workout.userId
      );

      const historicalBest = Math.max(0, ...historicalSets.map((s) => s.weightKg * (1 + s.reps / 30)));
      const current1RM = set.weightKg * (1 + set.reps / 30);

      if (current1RM > historicalBest) {
        set.isPr = true;
        prs.push({ setId: set.id, exerciseId: set.exerciseId, improvement: current1RM - historicalBest });
      }
    });

    if (prs.length > 0) {
      state.notifications.push({
        id: `notif-${Date.now()}`,
        recipientId: workout.userId,
        type: 'PR',
        title: prs.length === 1 ? 'New Personal Record!' : `${prs.length} New PRs!`,
        createdAt: new Date(),
      });
    }

    return prs;
  };

  const followUser = (followerId, followingId) => {
    const existingFollow = state.follows.find(
      (f) => f.followerId === followerId && f.followingId === followingId
    );
    if (!existingFollow) {
      state.follows.push({
        id: `follow-${Date.now()}`,
        followerId,
        followingId,
        createdAt: new Date(),
        deletedAt: null,
      });

      state.notifications.push({
        id: `notif-${Date.now()}`,
        recipientId: followingId,
        type: 'FOLLOW',
        title: 'New Follower',
        createdAt: new Date(),
      });
    }
  };

  const unfollowUser = (followerId, followingId) => {
    const follow = state.follows.find(
      (f) => f.followerId === followerId && f.followingId === followingId && !f.deletedAt
    );
    if (follow) {
      follow.deletedAt = new Date();
    }
  };

  const getFeed = (userId) => {
    const following = state.follows
      .filter((f) => f.followerId === userId && !f.deletedAt)
      .map((f) => f.followingId);

    return state.socialPosts
      .filter((p) => following.includes(p.userId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  describe('Complete Workout Flow', () => {
    it('should complete full workout → XP → level flow', () => {
      // Start workout
      const workout = createWorkout('user-1', 'Push Day');
      expect(workout).toBeDefined();

      // Add sets
      addSet(workout.id, 'exercise-1', 100, 10);
      addSet(workout.id, 'exercise-1', 100, 8);
      addSet(workout.id, 'exercise-1', 100, 6);

      // Finish workout
      finishWorkout(workout.id);

      // Verify XP was awarded
      const xpLog = state.userXpLogs.find((log) => log.sourceId === workout.id);
      expect(xpLog).toBeDefined();
      expect(xpLog.xpAmount).toBe(30); // 3 sets * 10 XP

      // Verify level was updated
      const userLevel = state.userLevels.find((l) => l.userId === 'user-1');
      expect(userLevel.totalXp).toBe(30);

      // Verify social post was created
      const post = state.socialPosts.find((p) => p.workoutId === workout.id);
      expect(post).toBeDefined();
      expect(post.headline).toContain('Push Day');
    });

    it('should detect PRs and send notification', () => {
      // First workout to establish baseline
      const workout1 = createWorkout('user-1', 'Baseline Workout');
      addSet(workout1.id, 'exercise-1', 100, 10);
      finishWorkout(workout1.id);

      // Second workout with PR
      const workout2 = createWorkout('user-1', 'PR Workout');
      addSet(workout2.id, 'exercise-1', 110, 10); // Heavier weight = PR
      finishWorkout(workout2.id);

      // Detect PRs
      const prs = detectPRs(workout2.id);
      expect(prs.length).toBeGreaterThanOrEqual(1);

      // Verify notification was sent
      const prNotification = state.notifications.find((n) => n.type === 'PR');
      expect(prNotification).toBeDefined();
    });
  });

  describe('Social Flow', () => {
    it('should follow user → see posts → unfollow → posts hidden', () => {
      // Add second user
      state.users.push({ id: 'user-2', username: 'otheruser', email: 'other@example.com' });

      // User 2 creates a workout
      const workout = createWorkout('user-2', 'User 2 Workout');
      addSet(workout.id, 'exercise-1', 80, 12);
      finishWorkout(workout.id);

      // User 1 should not see post initially (not following)
      let feed = getFeed('user-1');
      expect(feed).toHaveLength(0);

      // User 1 follows User 2
      followUser('user-1', 'user-2');

      // Verify follow notification
      const followNotif = state.notifications.find(
        (n) => n.type === 'FOLLOW' && n.recipientId === 'user-2'
      );
      expect(followNotif).toBeDefined();

      // User 1 should now see User 2's posts
      feed = getFeed('user-1');
      expect(feed).toHaveLength(1);
      expect(feed[0].workoutId).toBe(workout.id);

      // User 1 unfollows User 2
      unfollowUser('user-1', 'user-2');

      // Posts should be hidden again
      feed = getFeed('user-1');
      expect(feed).toHaveLength(0);
    });
  });

  describe('Routine → Workout Flow', () => {
    it('should create routine and start workout from it', () => {
      // Create routine
      const routine = {
        id: 'routine-1',
        userId: 'user-1',
        name: 'PPL - Push',
        exercises: [
          { exerciseId: 'exercise-1', targetSets: 3, targetReps: 10 },
          { exerciseId: 'exercise-2', targetSets: 3, targetReps: 12 },
        ],
      };

      // Start workout from routine
      const workout = createWorkout('user-1', routine.name);
      workout.routineOriginId = routine.id;

      expect(workout.routineOriginId).toBe('routine-1');
      expect(workout.name).toBe('PPL - Push');
    });
  });

  describe('Gamification Integration', () => {
    it('should track XP across multiple workouts', () => {
      const initialXp = state.userLevels.find((l) => l.userId === 'user-1')?.totalXp || 0;

      // Complete multiple workouts
      for (let i = 0; i < 5; i++) {
        const workout = createWorkout('user-1', `Workout ${i + 1}`);
        addSet(workout.id, 'exercise-1', 100, 10);
        addSet(workout.id, 'exercise-2', 80, 12);
        finishWorkout(workout.id);
      }

      // Verify XP increased (5 workouts * 2 sets * 10 XP = 100 added)
      const userLevel = state.userLevels.find((l) => l.userId === 'user-1');
      expect(userLevel.totalXp).toBeGreaterThanOrEqual(initialXp + 100);
    });

    it('should level up with enough XP', () => {
      // Level formula: level = floor(sqrt(totalXp / 100)) + 1
      // Level 2 requires 100 XP

      // Complete enough workouts to level up
      for (let i = 0; i < 10; i++) {
        const workout = createWorkout('user-1', `Workout ${i + 1}`);
        addSet(workout.id, 'exercise-1', 100, 10);
        finishWorkout(workout.id);
      }

      const userLevel = state.userLevels.find((l) => l.userId === 'user-1');
      expect(userLevel.totalXp).toBeGreaterThanOrEqual(100);
      expect(userLevel.level).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain referential integrity between workouts and sets', () => {
      const workout = createWorkout('user-1', 'Integrity Test');
      addSet(workout.id, 'exercise-1', 100, 10);
      addSet(workout.id, 'exercise-1', 100, 8);

      const sets = state.workoutSets.filter((s) => s.workoutId === workout.id);
      expect(sets).toHaveLength(2);
      sets.forEach((set) => {
        expect(set.workoutId).toBe(workout.id);
      });
    });

    it('should track user ID on all related records', () => {
      const workout = createWorkout('user-1', 'User Test');
      const set = addSet(workout.id, 'exercise-1', 100, 10);
      finishWorkout(workout.id);

      expect(workout.userId).toBe('user-1');
      expect(set.userId).toBe('user-1');

      const xpLog = state.userXpLogs.find((log) => log.sourceId === workout.id);
      expect(xpLog.userId).toBe('user-1');

      const post = state.socialPosts.find((p) => p.workoutId === workout.id);
      expect(post.userId).toBe('user-1');
    });
  });
});
