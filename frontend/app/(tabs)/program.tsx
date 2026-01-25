import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/authStore';
import { database } from '../../src/db';
import {
  beginnerProgramsCollection,
  beginnerProgramDaysCollection,
  userProgramEnrollmentsCollection,
  userProgramDayProgressCollection,
  advancedProgramsCollection,
  userAdvancedProgramEnrollmentsCollection,
} from '../../src/db';
import { Q } from '@nozbe/watermelondb';
import { supabase } from '../../src/services/supabase';
import { getTier } from '../../src/services/exporters/exportLimits';
import { enrollAdvancedProgram } from '../../src/services/advancedPrograms';
import { syncDatabase } from '../../src/db/sync';
import ProgramProgressBar from '../../src/components/ProgramProgressBar';
import ProgramDayCard, { DayStatus } from '../../src/components/ProgramDayCard';
import type BeginnerProgram from '../../src/db/models/BeginnerProgram';
import type BeginnerProgramDay from '../../src/db/models/BeginnerProgramDay';
import type UserProgramEnrollment from '../../src/db/models/UserProgramEnrollment';
import type UserProgramDayProgress from '../../src/db/models/UserProgramDayProgress';
import type UserAdvancedProgramEnrollment from '../../src/db/models/UserAdvancedProgramEnrollment';

const FIRST_30_DAYS_CODE = 'FIRST_30_DAYS';

interface DayWithProgress {
  day: BeginnerProgramDay;
  progress: UserProgramDayProgress | null;
  status: DayStatus;
}

export default function ProgramScreen() {
  const colors = useTheme();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolling531, setEnrolling531] = useState(false);
  const [program, setProgram] = useState<BeginnerProgram | null>(null);
  const [enrollment, setEnrollment] = useState<UserProgramEnrollment | null>(null);
  const [daysWithProgress, setDaysWithProgress] = useState<DayWithProgress[]>([]);
  const [tier, setTier] = useState<'FREE' | 'PRO' | 'ELITE'>('FREE');
  const [program531, setProgram531] = useState<{ id: string; serverId: string } | null>(null);
  const [enrollment531, setEnrollment531] = useState<UserAdvancedProgramEnrollment | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      // Get the First 30 Days program
      const programs = await beginnerProgramsCollection
        .query(
          Q.where('code', FIRST_30_DAYS_CODE),
          Q.where('is_active', true),
          Q.where('deleted_at', null)
        )
        .fetch();

      if (programs.length === 0) {
        setLoading(false);
        return;
      }

      const foundProgram = programs[0];
      setProgram(foundProgram);

      // Get user's enrollment
      const enrollments = await userProgramEnrollmentsCollection
        .query(
          Q.where('user_id', user.id),
          Q.where('program_id', foundProgram.serverId),
          Q.where('deleted_at', null)
        )
        .fetch();

      if (enrollments.length === 0) {
        setEnrollment(null);
        setDaysWithProgress([]);
        getTier(user.id).then(setTier);
        const p531 = await advancedProgramsCollection
          .query(
            Q.where('code', 'FIVE_THREE_ONE'),
            Q.where('is_active', true),
            Q.where('deleted_at', null)
          )
          .fetch();
        if (p531.length > 0) {
          setProgram531({ id: p531[0].id, serverId: (p531[0] as { serverId: string }).serverId });
          const e531 = await userAdvancedProgramEnrollmentsCollection
            .query(
              Q.where('user_id', user.id),
              Q.where('program_id', (p531[0] as { serverId: string }).serverId),
              Q.where('deleted_at', null)
            )
            .fetch();
          setEnrollment531(e531.length > 0 ? (e531[0] as UserAdvancedProgramEnrollment) : null);
        }
        setLoading(false);
        return;
      }

      const foundEnrollment = enrollments[0];
      setEnrollment(foundEnrollment);

      // Get program days
      const days = await beginnerProgramDaysCollection
        .query(
          Q.where('program_id', foundProgram.serverId),
          Q.where('deleted_at', null),
          Q.sortBy('order_index', Q.asc)
        )
        .fetch();

      // Get progress for each day
      const progressRecords = await userProgramDayProgressCollection
        .query(
          Q.where('enrollment_id', foundEnrollment.serverId),
          Q.where('deleted_at', null)
        )
        .fetch();

      // Create a map of program_day_id to progress
      const progressMap = new Map<string, UserProgramDayProgress>();
      progressRecords.forEach((p) => {
        progressMap.set(p.programDayId, p);
      });

      // Combine days with their progress
      const combined: DayWithProgress[] = days.map((day) => {
        const progress = progressMap.get(day.serverId) || null;
        let status: DayStatus = 'pending';

        if (progress) {
          if (progress.skipped) {
            status = 'skipped';
          } else if (progress.workoutCompletedAt) {
            status = 'completed';
          } else if (progress.lessonReadAt) {
            status = 'in_progress';
          }
        }

        // Mark current day
        if (day.orderIndex === foundEnrollment.currentDayIndex && status === 'pending') {
          status = 'current';
        }

        return { day, progress, status };
      });

      setDaysWithProgress(combined);

      if (user) {
        getTier(user.id).then(setTier);
        const p531 = await advancedProgramsCollection
          .query(
            Q.where('code', 'FIVE_THREE_ONE'),
            Q.where('is_active', true),
            Q.where('deleted_at', null)
          )
          .fetch();
        if (p531.length > 0) {
          setProgram531({ id: p531[0].id, serverId: (p531[0] as { serverId: string }).serverId });
          const e531 = await userAdvancedProgramEnrollmentsCollection
            .query(
              Q.where('user_id', user.id),
              Q.where('program_id', (p531[0] as { serverId: string }).serverId),
              Q.where('deleted_at', null)
            )
            .fetch();
          setEnrollment531(e531.length > 0 ? (e531[0] as UserAdvancedProgramEnrollment) : null);
        }
      }
    } catch (error) {
      console.error('Error loading program data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleEnroll = async () => {
    if (!user) return;

    setEnrolling(true);
    try {
      const { data, error } = await supabase.functions.invoke('enroll-program', {
        body: { programCode: FIRST_30_DAYS_CODE },
      });

      if (error) {
        console.error('Error enrolling:', error);
        return;
      }

      // Reload data after enrollment
      await loadData();
    } catch (error) {
      console.error('Error enrolling:', error);
    } finally {
      setEnrolling(false);
    }
  };

  const handleDayPress = (dayIndex: number) => {
    if (!enrollment) return;
    router.push(`/program/${dayIndex}` as never);
  };

  const handleEnroll531 = async () => {
    if (!user || !program531 || tier !== 'ELITE') return;
    setEnrolling531(true);
    try {
      await enrollAdvancedProgram(user.id, program531.serverId);
      await syncDatabase();
      await loadData();
      router.push('/program/advanced/1' as never);
    } catch (e) {
      console.error('5/3/1 enroll error:', e);
    } finally {
      setEnrolling531(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Not enrolled - show enrollment prompt
  if (!enrollment) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.enrollContainer}
      >
        <View style={[styles.enrollCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.enrollTitle, { color: colors.primary }]}>
            First 30 Days
          </Text>
          <Text style={[styles.enrollSubtitle, { color: colors.textPrimary }]}>
            Your Complete Introduction to Strength Training
          </Text>
          <Text style={[styles.enrollDescription, { color: colors.textSecondary }]}>
            A 4-week guided program designed for beginners. Learn proper form, build
            foundational strength, and develop healthy workout habits.
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>4</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Weeks</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>12</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Workouts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>12</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Lessons</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.enrollButton, { backgroundColor: colors.primary }]}
            onPress={handleEnroll}
            disabled={enrolling}
          >
            {enrolling ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Text style={[styles.enrollButtonText, { color: colors.background }]}>
                Start Program
              </Text>
            )}
          </TouchableOpacity>

          {program531 && (
            <View style={[styles.card531, { marginTop: 24, width: '100%' }]}>
              <Text style={[styles.weekTitle, { color: colors.textSecondary }]}>5/3/1</Text>
              {tier !== 'ELITE' ? (
                <Text style={[styles.card531Text, { color: colors.textMuted }]}>
                  Elite only. Upgrade to use percentage-based programs.
                </Text>
              ) : !enrollment531 ? (
                <>
                  <Text style={[styles.card531Title, { color: colors.textPrimary }]}>5/3/1</Text>
                  <Text style={[styles.card531Text, { color: colors.textSecondary }]}>
                    3 weeks, 4 days/week. Set your Training Maxes first.
                  </Text>
                  <TouchableOpacity
                    style={[styles.enroll531Btn, { backgroundColor: colors.primary }]}
                    onPress={handleEnroll531}
                    disabled={enrolling531}
                  >
                    {enrolling531 ? (
                      <ActivityIndicator size="small" color={colors.background} />
                    ) : (
                      <Text style={[styles.enroll531BtnText, { color: colors.background }]}>Enroll</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={[styles.card531Title, { color: colors.textPrimary }]}>
                    Week {enrollment531.currentWeek}, Day {enrollment531.currentDay}
                  </Text>
                  <TouchableOpacity
                    style={[styles.enroll531Btn, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      const dayIndex = (enrollment531.currentWeek - 1) * 4 + enrollment531.currentDay;
                      router.push(`/program/advanced/${Math.min(dayIndex, 12)}` as never);
                    }}
                  >
                    <Text style={[styles.enroll531BtnText, { color: colors.background }]}>Continue</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    );
  }

  // Program completed
  if (enrollment.completedAt) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.completedContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={[styles.completedCard, { backgroundColor: colors.surface }]}>
          <Text style={styles.celebrationEmoji}>🎓</Text>
          <Text style={[styles.completedTitle, { color: colors.primary }]}>
            Program Complete!
          </Text>
          <Text style={[styles.completedSubtitle, { color: colors.textPrimary }]}>
            Congratulations, Graduate!
          </Text>
          <Text style={[styles.completedDescription, { color: colors.textSecondary }]}>
            You've completed the First 30 Days program. You now have the knowledge
            and habits to train effectively for life.
          </Text>

          <TouchableOpacity
            style={[styles.viewCompletionButton, { borderColor: colors.primary }]}
            onPress={() => router.push('/program/complete' as never)}
          >
            <Text style={[styles.viewCompletionText, { color: colors.primary }]}>
              View Your Achievement
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Active enrollment - show progress
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Program header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.programTitle, { color: colors.textPrimary }]}>
          {program?.title || 'First 30 Days'}
        </Text>
        <Text style={[styles.currentDay, { color: colors.primary }]}>
          Week {enrollment.currentWeek}, Day {enrollment.currentDayInWeek}
        </Text>

        <View style={styles.progressSection}>
          <ProgramProgressBar
            daysCompleted={enrollment.daysCompleted}
            totalDays={12}
            showWeekMarkers={true}
          />
        </View>
      </View>

      {/* Day cards by week */}
      {[1, 2, 3, 4].map((weekNum) => {
        const weekDays = daysWithProgress.filter((d) => d.day.weekNumber === weekNum);
        if (weekDays.length === 0) return null;

        return (
          <View key={weekNum} style={styles.weekSection}>
            <Text style={[styles.weekTitle, { color: colors.textSecondary }]}>
              Week {weekNum}
            </Text>
            {weekDays.map((item) => (
              <ProgramDayCard
                key={item.day.id}
                dayNumber={item.day.orderIndex}
                weekNumber={item.day.weekNumber}
                title={item.day.dayTitle}
                status={item.status}
                onPress={() => handleDayPress(item.day.orderIndex)}
                disabled={item.day.orderIndex > enrollment.currentDayIndex && item.status === 'pending'}
              />
            ))}
          </View>
        );
      })}

      {/* 5/3/1 (Elite) */}
      {program531 && (
        <View style={[styles.weekSection, { marginTop: 8 }]}>
          <Text style={[styles.weekTitle, { color: colors.textSecondary }]}>5/3/1</Text>
          <View style={[styles.card531, { backgroundColor: colors.surface }]}>
            {tier !== 'ELITE' ? (
              <Text style={[styles.card531Text, { color: colors.textMuted }]}>
                Elite only. Upgrade to use percentage-based programs.
              </Text>
            ) : !enrollment531 ? (
              <>
                <Text style={[styles.card531Title, { color: colors.textPrimary }]}>5/3/1</Text>
                <Text style={[styles.card531Text, { color: colors.textSecondary }]}>
                  3 weeks, 4 days/week. Set your Training Maxes first.
                </Text>
                <TouchableOpacity
                  style={[styles.enroll531Btn, { backgroundColor: colors.primary }]}
                  onPress={handleEnroll531}
                  disabled={enrolling531}
                >
                  {enrolling531 ? (
                    <ActivityIndicator size="small" color={colors.background} />
                  ) : (
                    <Text style={[styles.enroll531BtnText, { color: colors.background }]}>Enroll</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.card531Title, { color: colors.textPrimary }]}>
                  Week {enrollment531.currentWeek}, Day {enrollment531.currentDay}
                </Text>
                <TouchableOpacity
                  style={[styles.enroll531Btn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    const dayIndex = (enrollment531.currentWeek - 1) * 4 + enrollment531.currentDay;
                    router.push(`/program/advanced/${Math.min(dayIndex, 12)}` as never);
                  }}
                >
                  <Text style={[styles.enroll531BtnText, { color: colors.background }]}>Continue</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    padding: 20,
    marginBottom: 16,
  },
  programTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  currentDay: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  progressSection: {
    marginTop: 8,
  },
  weekSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  weekTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  enrollContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  enrollCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  enrollTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  enrollSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  enrollDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  enrollButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    minWidth: 200,
    alignItems: 'center',
  },
  enrollButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  completedContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  completedCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  celebrationEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  completedTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  completedSubtitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  completedDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  viewCompletionButton: {
    borderRadius: 12,
    borderWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  viewCompletionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  card531: {
    borderRadius: 12,
    padding: 16,
  },
  card531Title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  card531Text: {
    fontSize: 14,
    marginBottom: 12,
  },
  enroll531Btn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  enroll531BtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
