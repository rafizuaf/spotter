import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Q } from '@nozbe/watermelondb';
import { workoutsCollection } from '../../src/db';
import { useAuthStore } from '../../src/stores/authStore';
import { getTier } from '../../src/services/exporters/exportLimits';
import {
  getWeeklyVolumeByMuscle,
  getLastWeekStarts,
  getWeekStartMonday,
  type MuscleVolume,
} from '../../src/services/weeklyVolume';
import type Workout from '../../src/db/models/Workout';
import { useTheme } from '../../src/hooks/useTheme';

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
  const colors = useTheme();
  const [workouts, setWorkouts] = useState<WorkoutWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tier, setTier] = useState<'FREE' | 'PRO' | 'ELITE'>('FREE');
  const [volumeByMuscle, setVolumeByMuscle] = useState<MuscleVolume[]>([]);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date | null>(null);
  const [volumeLoading, setVolumeLoading] = useState(false);

  useEffect(() => {
    if (user?.id) getTier(user.id).then(setTier);
  }, [user?.id]);

  const loadVolume = useCallback(async () => {
    if (!user?.id || (tier !== 'PRO' && tier !== 'ELITE')) return;
    const week = selectedWeekStart ?? getWeekStartMonday(new Date());
    setVolumeLoading(true);
    try {
      const data = await getWeeklyVolumeByMuscle(user.id, week);
      setVolumeByMuscle(data);
    } catch (e) {
      console.error('Weekly volume load error:', e);
    } finally {
      setVolumeLoading(false);
    }
  }, [user?.id, tier, selectedWeekStart]);

  useEffect(() => {
    if (tier === 'PRO' || tier === 'ELITE') {
      if (selectedWeekStart == null) setSelectedWeekStart(getWeekStartMonday(new Date()));
    }
  }, [tier]);

  useEffect(() => {
    loadVolume();
  }, [loadVolume]);

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

  const weekStarts = getLastWeekStarts(4);
  const showVolume = tier === 'PRO' || tier === 'ELITE';

  const formatWeekLabel = (w: Date) => {
    const end = new Date(w);
    end.setDate(end.getDate() + 6);
    return `${w.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  };

  const renderVolumeHeader = () => {
    if (!showVolume) return null;
    const week = selectedWeekStart ?? getWeekStartMonday(new Date());
    return (
      <View style={[styles.volumeSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.volumeTitle, { color: colors.textPrimary }]}>Weekly volume by muscle</Text>
        <View style={styles.weekSelector}>
          {weekStarts.map((w) => {
            const isSelected = selectedWeekStart ? w.getTime() === selectedWeekStart.getTime() : w.getTime() === week.getTime();
            return (
              <TouchableOpacity
                key={w.getTime()}
                style={[
                  styles.weekButton,
                  { backgroundColor: isSelected ? colors.primary : colors.surfaceElevated, borderColor: colors.border },
                ]}
                onPress={() => {
                  setSelectedWeekStart(w);
                }}
              >
                <Text style={[styles.weekButtonText, { color: isSelected ? colors.background : colors.textPrimary }]} numberOfLines={1}>
                  {formatWeekLabel(w)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {volumeLoading ? (
          <Text style={[styles.volumeMuted, { color: colors.textMuted }]}>Loading…</Text>
        ) : volumeByMuscle.length === 0 ? (
          <Text style={[styles.volumeMuted, { color: colors.textMuted }]}>No volume this week</Text>
        ) : (
          <View style={styles.volumeList}>
            {volumeByMuscle.map(({ muscleGroup, volumeKg }, idx) => (
              <View
                key={muscleGroup}
                style={[
                  styles.volumeRow,
                  idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                ]}
              >
                <Text style={[styles.volumeMuscle, { color: colors.textPrimary }]}>{muscleGroup}</Text>
                <Text style={[styles.volumeKg, { color: colors.textSecondary }]}>
                  {volumeKg.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderWorkout = ({ item }: { item: WorkoutWithStats }) => (
    <TouchableOpacity style={[styles.workoutCard, { backgroundColor: colors.surface }]}>
      <View style={styles.workoutHeader}>
        <Text style={[styles.workoutName, { color: colors.textPrimary }]}>{item.name}</Text>
        <Text style={[styles.workoutDate, { color: colors.textSecondary }]}>{formatDate(item.date)}</Text>
      </View>
      {item.note && (
        <Text style={[styles.workoutNote, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.note}
        </Text>
      )}
      <View style={[styles.workoutStats, { borderTopColor: colors.border }]}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{item.duration}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Duration</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{item.exerciseCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Exercises</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{item.setCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Sets</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (workouts.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Workout History</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Complete your first workout to see it here
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* C3: Show history limit for FREE tier */}
      {tier === 'FREE' && workouts.length > 0 && (
        <View style={[styles.historyLimitBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.historyLimitText, { color: colors.textSecondary }]}>
            Showing last 30 days of workouts
          </Text>
        </View>
      )}
      <FlashList
        data={workouts}
        renderItem={renderWorkout}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderVolumeHeader}
        contentContainerStyle={styles.listContent}
        estimatedItemSize={120}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
  },
  workoutCard: {
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
    flex: 1,
  },
  workoutDate: {
    fontSize: 14,
  },
  workoutNote: {
    fontSize: 14,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  workoutStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  volumeSection: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  volumeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  weekSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  weekButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  weekButtonText: {
    fontSize: 13,
  },
  volumeMuted: {
    fontSize: 14,
  },
  volumeList: {
    marginTop: 4,
  },
  volumeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  volumeMuscle: {
    fontSize: 15,
  },
  volumeKg: {
    fontSize: 14,
  },
  historyLimitBanner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  historyLimitText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
