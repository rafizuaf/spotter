import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/authStore';
import {
  userProgramEnrollmentsCollection,
  userBadgesCollection,
  workoutsCollection,
  workoutSetsCollection,
  beginnerProgramsCollection,
} from '../../src/db';
import { Q } from '@nozbe/watermelondb';

const FIRST_30_DAYS_CODE = 'FIRST_30_DAYS';

interface ProgramStats {
  totalWorkouts: number;
  totalSets: number;
  totalVolume: number;
  totalPRs: number;
  startDate: Date | null;
  endDate: Date | null;
}

export default function ProgramCompleteScreen() {
  const colors = useTheme();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<ProgramStats>({
    totalWorkouts: 0,
    totalSets: 0,
    totalVolume: 0,
    totalPRs: 0,
    startDate: null,
    endDate: null,
  });
  const [hasBadge, setHasBadge] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.5));

  const loadStats = useCallback(async () => {
    if (!user) return;

    try {
      // Get the program
      const programs = await beginnerProgramsCollection
        .query(
          Q.where('code', FIRST_30_DAYS_CODE),
          Q.where('is_active', true),
          Q.where('deleted_at', null)
        )
        .fetch();

      if (programs.length === 0) return;

      const program = programs[0];

      // Get user's completed enrollment
      const enrollments = await userProgramEnrollmentsCollection
        .query(
          Q.where('user_id', user.id),
          Q.where('program_id', program.serverId),
          Q.where('deleted_at', null)
        )
        .fetch();

      if (enrollments.length === 0) {
        router.replace('/(tabs)/program' as never);
        return;
      }

      const enrollment = enrollments[0];

      // Check if user has the completion badge
      const badges = await userBadgesCollection
        .query(
          Q.where('user_id', user.id),
          Q.where('achievement_code', 'FIRST_30_DAYS_COMPLETE'),
          Q.where('deleted_at', null)
        )
        .fetch();

      setHasBadge(badges.length > 0);

      // Get workouts during the program period
      const programWorkouts = await workoutsCollection
        .query(
          Q.where('user_id', user.id),
          Q.where('started_at', Q.gte(enrollment.startedAt.getTime())),
          Q.where('ended_at', Q.notEq(null)),
          Q.where('deleted_at', null)
        )
        .fetch();

      // Calculate stats
      let totalSets = 0;
      let totalVolume = 0;
      let totalPRs = 0;

      for (const workout of programWorkouts) {
        const sets = await workoutSetsCollection
          .query(
            Q.where('workout_id', workout.id),
            Q.where('deleted_at', null)
          )
          .fetch();

        totalSets += sets.length;

        for (const set of sets) {
          const weight = parseFloat(String(set.weightKg ?? 0)) || 0;
          const reps = parseInt(String(set.reps ?? 0), 10) || 0;
          totalVolume += weight * reps;

          if (set.isPr) {
            totalPRs += 1;
          }
        }
      }

      setStats({
        totalWorkouts: programWorkouts.length,
        totalSets,
        totalVolume: Math.round(totalVolume),
        totalPRs,
        startDate: enrollment.startedAt,
        endDate: enrollment.completedAt || new Date(),
      });

      // Start animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      console.error('Error loading completion stats:', error);
    }
  }, [user, fadeAnim, scaleAnim]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const formatVolume = (volume: number): string => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    }
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toString();
  };

  const formatDuration = (): string => {
    if (!stats.startDate || !stats.endDate) return '';
    const days = Math.ceil(
      (stats.endDate.getTime() - stats.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days === 1) return '1 day';
    if (days < 7) return `${days} days`;
    const weeks = Math.ceil(days / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''}`;
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Program Complete',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Celebration Header */}
        <Animated.View
          style={[
            styles.celebrationSection,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.celebrationEmoji}>🎓</Text>
          <Text style={[styles.congratsTitle, { color: colors.primary }]}>
            Congratulations!
          </Text>
          <Text style={[styles.congratsSubtitle, { color: colors.textPrimary }]}>
            You've Graduated!
          </Text>
          <Text style={[styles.congratsDescription, { color: colors.textSecondary }]}>
            You've completed the First 30 Days program. You now have the knowledge
            and habits to train effectively for life.
          </Text>
        </Animated.View>

        {/* Badge Earned */}
        {hasBadge && (
          <Animated.View
            style={[
              styles.badgeSection,
              { backgroundColor: colors.surface, opacity: fadeAnim },
            ]}
          >
            <View style={[styles.badgeIcon, { backgroundColor: colors.primary + '20' }]}>
              <Text style={styles.badgeEmoji}>🏆</Text>
            </View>
            <Text style={[styles.badgeTitle, { color: colors.textPrimary }]}>
              Achievement Unlocked!
            </Text>
            <Text style={[styles.badgeName, { color: colors.primary }]}>
              First 30 Days Graduate
            </Text>
            <Text style={[styles.badgeDescription, { color: colors.textSecondary }]}>
              Completed the First 30 Days beginner program
            </Text>
          </Animated.View>
        )}

        {/* Stats Summary */}
        <View style={[styles.statsSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Your Journey
          </Text>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {stats.totalWorkouts}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Workouts
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {stats.totalSets}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Sets Logged
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {formatVolume(stats.totalVolume)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Total Volume (kg)
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {stats.totalPRs}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                PRs Hit
              </Text>
            </View>
          </View>

          {stats.startDate && (
            <View style={[styles.durationRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.durationLabel, { color: colors.textSecondary }]}>
                Completed in
              </Text>
              <Text style={[styles.durationValue, { color: colors.textPrimary }]}>
                {formatDuration()}
              </Text>
            </View>
          )}
        </View>

        {/* What's Next */}
        <View style={[styles.nextSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            What's Next?
          </Text>
          <Text style={[styles.nextDescription, { color: colors.textSecondary }]}>
            You've built a solid foundation. Here are some paths forward:
          </Text>

          <TouchableOpacity
            style={[styles.nextOption, { borderColor: colors.border }]}
            onPress={() => router.push('/(tabs)/routines')}
          >
            <View style={styles.nextOptionContent}>
              <Text style={styles.nextOptionIcon}>📋</Text>
              <View style={styles.nextOptionText}>
                <Text style={[styles.nextOptionTitle, { color: colors.textPrimary }]}>
                  Create Your Own Routine
                </Text>
                <Text style={[styles.nextOptionSubtitle, { color: colors.textMuted }]}>
                  Design a custom workout plan
                </Text>
              </View>
            </View>
            <Text style={[styles.nextOptionArrow, { color: colors.textMuted }]}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.nextOption, { borderColor: colors.border }]}
            onPress={() => router.push('/(tabs)/workout')}
          >
            <View style={styles.nextOptionContent}>
              <Text style={styles.nextOptionIcon}>💪</Text>
              <View style={styles.nextOptionText}>
                <Text style={[styles.nextOptionTitle, { color: colors.textPrimary }]}>
                  Start a Workout
                </Text>
                <Text style={[styles.nextOptionSubtitle, { color: colors.textMuted }]}>
                  Continue building strength
                </Text>
              </View>
            </View>
            <Text style={[styles.nextOptionArrow, { color: colors.textMuted }]}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.nextOption, { borderColor: colors.border }]}
            onPress={() => router.push('/(tabs)/history')}
          >
            <View style={styles.nextOptionContent}>
              <Text style={styles.nextOptionIcon}>📊</Text>
              <View style={styles.nextOptionText}>
                <Text style={[styles.nextOptionTitle, { color: colors.textPrimary }]}>
                  View Your Progress
                </Text>
                <Text style={[styles.nextOptionSubtitle, { color: colors.textMuted }]}>
                  See how far you've come
                </Text>
              </View>
            </View>
            <Text style={[styles.nextOptionArrow, { color: colors.textMuted }]}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Back to Home */}
        <TouchableOpacity
          style={[styles.homeButton, { backgroundColor: colors.primary }]}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={[styles.homeButtonText, { color: colors.background }]}>
            Back to Home
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  celebrationSection: {
    alignItems: 'center',
    padding: 32,
    paddingTop: 48,
  },
  celebrationEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  congratsTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  congratsSubtitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
  },
  congratsDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  badgeSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  badgeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  badgeEmoji: {
    fontSize: 40,
  },
  badgeTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  badgeName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  badgeDescription: {
    fontSize: 14,
    textAlign: 'center',
  },
  statsSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 20,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    textAlign: 'center',
  },
  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    marginTop: 4,
  },
  durationLabel: {
    fontSize: 14,
  },
  durationValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextSection: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    padding: 20,
  },
  nextDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  nextOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  nextOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  nextOptionIcon: {
    fontSize: 24,
    marginRight: 14,
  },
  nextOptionText: {
    flex: 1,
  },
  nextOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  nextOptionSubtitle: {
    fontSize: 13,
  },
  nextOptionArrow: {
    fontSize: 18,
    marginLeft: 8,
  },
  homeButton: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  homeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
