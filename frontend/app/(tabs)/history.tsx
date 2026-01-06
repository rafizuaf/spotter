import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { workoutsCollection, workoutSetsCollection } from '../../src/db';
import { useAuthStore } from '../../src/stores/authStore';
import type Workout from '../../src/db/models/Workout';

interface WorkoutWithStats {
  id: string;
  serverId: string;
  name: string;
  date: Date;
  duration: string;
  exerciseCount: number;
  setCount: number;
  note?: string;
}

export default function HistoryScreen() {
  const { user } = useAuthStore();
  const [workouts, setWorkouts] = useState<WorkoutWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadWorkouts();

    // Subscribe to workout changes
    const subscription = workoutsCollection
      .query(
        Q.where('user_id', user?.id || ''),
        Q.where('deleted_at', null),
        Q.sortBy('started_at', Q.desc)
      )
      .observe()
      .subscribe(() => {
        loadWorkouts();
      });

    return () => subscription.unsubscribe();
  }, [user?.id]);

  const loadWorkouts = async () => {
    try {
      if (!user?.id) {
        setWorkouts([]);
        setLoading(false);
        return;
      }

      const workoutRecords = await workoutsCollection
        .query(
          Q.where('user_id', user.id),
          Q.where('deleted_at', null),
          Q.sortBy('started_at', Q.desc)
        )
        .fetch();

      // Calculate stats for each workout
      const workoutsWithStats = await Promise.all(
        workoutRecords.map(async (workout: Workout) => {
          const sets = await workout.sets.fetch();
          const uniqueExercises = new Set(sets.map((s: { exerciseId: string }) => s.exerciseId));

          // Calculate duration
          const duration = workout.endedAt && workout.startedAt
            ? formatDuration(workout.endedAt.getTime() - workout.startedAt.getTime())
            : '--';

          return {
            id: workout.id,
            serverId: workout.serverId,
            name: workout.name || 'Untitled Workout',
            date: workout.startedAt,
            duration,
            exerciseCount: uniqueExercises.size,
            setCount: sets.length,
            note: workout.note,
          };
        })
      );

      setWorkouts(workoutsWithStats);
    } catch (error) {
      console.error('Error loading workouts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const workoutDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (workoutDate.getTime() === today.getTime()) {
      return 'Today';
    } else if (workoutDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadWorkouts();
  };

  const renderWorkout = ({ item }: { item: WorkoutWithStats }) => (
    <TouchableOpacity style={styles.workoutCard}>
      <View style={styles.workoutHeader}>
        <Text style={styles.workoutName}>{item.name}</Text>
        <Text style={styles.workoutDate}>{formatDate(item.date)}</Text>
      </View>
      {item.note && (
        <Text style={styles.workoutNote} numberOfLines={2}>
          {item.note}
        </Text>
      )}
      <View style={styles.workoutStats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{item.duration}</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{item.exerciseCount}</Text>
          <Text style={styles.statLabel}>Exercises</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{item.setCount}</Text>
          <Text style={styles.statLabel}>Sets</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (workouts.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>No Workout History</Text>
          <Text style={styles.emptySubtext}>
            Complete your first workout to see it here
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={workouts}
        renderItem={renderWorkout}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366f1"
            colors={['#6366f1']}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  listContent: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
  workoutCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workoutName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  workoutDate: {
    fontSize: 14,
    color: '#94a3b8',
  },
  workoutNote: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  workoutStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
});
