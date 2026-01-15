import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/authStore';
import {
  beginnerProgramsCollection,
  beginnerProgramDaysCollection,
  userProgramEnrollmentsCollection,
  userProgramDayProgressCollection,
  exercisesCollection,
} from '../../src/db';
import { Q } from '@nozbe/watermelondb';
import { supabase } from '../../src/services/supabase';
import LessonContent from '../../src/components/LessonContent';
import ExerciseVideoPlayer from '../../src/components/ExerciseVideoPlayer';
import type BeginnerProgramDay from '../../src/db/models/BeginnerProgramDay';
import type { ProgramDayExercise } from '../../src/db/models/BeginnerProgramDay';
import type UserProgramEnrollment from '../../src/db/models/UserProgramEnrollment';
import type UserProgramDayProgress from '../../src/db/models/UserProgramDayProgress';
import type Exercise from '../../src/db/models/Exercise';

const FIRST_30_DAYS_CODE = 'FIRST_30_DAYS';

interface ExerciseWithDetails extends ProgramDayExercise {
  name: string;
  videoUrl?: string;
  muscleGroup?: string;
}

export default function ProgramDayScreen() {
  const { dayIndex } = useLocalSearchParams<{ dayIndex: string }>();
  const colors = useTheme();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState<BeginnerProgramDay | null>(null);
  const [enrollment, setEnrollment] = useState<UserProgramEnrollment | null>(null);
  const [progress, setProgress] = useState<UserProgramDayProgress | null>(null);
  const [exercises, setExercises] = useState<ExerciseWithDetails[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseWithDetails | null>(null);
  const [markingRead, setMarkingRead] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const dayNum = parseInt(dayIndex || '1', 10);

  const loadData = useCallback(async () => {
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

      if (programs.length === 0) {
        setLoading(false);
        return;
      }

      const program = programs[0];

      // Get user's enrollment
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

      const foundEnrollment = enrollments[0];
      setEnrollment(foundEnrollment);

      // Get the specific day
      const days = await beginnerProgramDaysCollection
        .query(
          Q.where('program_id', program.serverId),
          Q.where('order_index', dayNum),
          Q.where('deleted_at', null)
        )
        .fetch();

      if (days.length === 0) {
        router.replace('/(tabs)/program' as never);
        return;
      }

      const foundDay = days[0];
      setDay(foundDay);

      // Get progress for this day
      const progressRecords = await userProgramDayProgressCollection
        .query(
          Q.where('enrollment_id', foundEnrollment.serverId),
          Q.where('program_day_id', foundDay.serverId),
          Q.where('deleted_at', null)
        )
        .fetch();

      if (progressRecords.length > 0) {
        setProgress(progressRecords[0]);
      }

      // Load exercise details
      const exerciseData = foundDay.exercises || [];
      const exerciseIds = exerciseData.map((e) => e.exercise_id);

      if (exerciseIds.length > 0) {
        const exerciseRecords = await exercisesCollection
          .query(Q.where('server_id', Q.oneOf(exerciseIds)))
          .fetch();

        const exerciseMap = new Map<string, Exercise>();
        exerciseRecords.forEach((e) => exerciseMap.set(e.serverId, e));

        const withDetails: ExerciseWithDetails[] = exerciseData.map((e) => {
          const record = exerciseMap.get(e.exercise_id);
          return {
            ...e,
            name: record?.name || 'Unknown Exercise',
            videoUrl: record?.videoUrl,
            muscleGroup: record?.muscleGroup,
          };
        });

        setExercises(withDetails);
      }
    } catch (error) {
      console.error('Error loading program day:', error);
    } finally {
      setLoading(false);
    }
  }, [user, dayNum]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkLessonRead = async () => {
    if (!enrollment || markingRead) return;

    setMarkingRead(true);
    try {
      const { data, error } = await supabase.functions.invoke('complete-program-day', {
        body: {
          enrollmentId: enrollment.serverId,
          dayIndex: dayNum,
          lessonRead: true,
        },
      });

      if (error) {
        console.error('Error marking lesson read:', error);
        return;
      }

      // Reload progress
      await loadData();
    } catch (error) {
      console.error('Error marking lesson read:', error);
    } finally {
      setMarkingRead(false);
    }
  };

  const handleSkipDay = async () => {
    if (!enrollment || skipping) return;

    Alert.alert(
      'Skip This Day?',
      "You can always come back to it later. Your progress will still count.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: async () => {
            setSkipping(true);
            try {
              const { error } = await supabase.functions.invoke('complete-program-day', {
                body: {
                  enrollmentId: enrollment.serverId,
                  dayIndex: dayNum,
                  skipped: true,
                  skipReason: 'User chose to skip',
                },
              });

              if (error) {
                console.error('Error skipping day:', error);
                return;
              }

              router.back();
            } catch (error) {
              console.error('Error skipping day:', error);
            } finally {
              setSkipping(false);
            }
          },
        },
      ]
    );
  };

  const handleStartWorkout = () => {
    // Navigate to workout screen with pre-filled exercises
    // Pass the exercise IDs and enrollment info as params
    router.push({
      pathname: '/(tabs)/workout',
      params: {
        programDayIndex: dayNum.toString(),
        programEnrollmentId: enrollment?.serverId,
        exerciseIds: exercises.map((e) => e.exercise_id).join(','),
      },
    });
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!day || !enrollment) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Day not found</Text>
      </View>
    );
  }

  const isLessonRead = progress?.lessonReadAt != null;
  const isWorkoutCompleted = progress?.workoutCompletedAt != null;
  const isSkipped = progress?.skipped || false;

  return (
    <>
      <Stack.Screen
        options={{
          title: `Day ${dayNum}`,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Day Header */}
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <Text style={[styles.weekLabel, { color: colors.textMuted }]}>
            {day.weekDayLabel}
          </Text>
          <Text style={[styles.dayTitle, { color: colors.textPrimary }]}>
            {day.dayTitle}
          </Text>
        </View>

        {/* Lesson Section */}
        <View style={styles.section}>
          <LessonContent
            title={day.lessonTitle}
            content={day.lessonContent}
            isRead={isLessonRead || isSkipped}
            onMarkRead={handleMarkLessonRead}
          />
        </View>

        {/* Exercises Section */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionIcon]}>💪</Text>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Today's Workout
            </Text>
          </View>

          <View style={[styles.exerciseList, { backgroundColor: colors.surface }]}>
            {exercises.map((exercise, index) => (
              <TouchableOpacity
                key={exercise.exercise_id}
                style={[
                  styles.exerciseCard,
                  index < exercises.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
                onPress={() => setSelectedExercise(exercise)}
              >
                <View style={styles.exerciseInfo}>
                  <Text style={[styles.exerciseName, { color: colors.textPrimary }]}>
                    {exercise.name}
                  </Text>
                  <Text style={[styles.exerciseSets, { color: colors.textSecondary }]}>
                    {exercise.sets} sets × {exercise.reps}
                  </Text>
                  {exercise.notes && (
                    <Text style={[styles.exerciseNotes, { color: colors.textMuted }]}>
                      {exercise.notes}
                    </Text>
                  )}
                </View>
                {exercise.videoUrl && (
                  <Text style={[styles.videoIcon, { color: colors.primary }]}>▶</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Start Workout Button */}
          {!isWorkoutCompleted && !isSkipped && (
            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: colors.primary }]}
              onPress={handleStartWorkout}
              disabled={!isLessonRead}
            >
              <Text style={[styles.startButtonText, { color: colors.background }]}>
                {isLessonRead ? 'Start Workout' : 'Read Lesson First'}
              </Text>
            </TouchableOpacity>
          )}

          {isWorkoutCompleted && (
            <View style={[styles.completedBadge, { backgroundColor: colors.success + '20' }]}>
              <Text style={[styles.completedText, { color: colors.success }]}>
                ✓ Workout Completed
              </Text>
            </View>
          )}

          {isSkipped && (
            <View style={[styles.skippedBadge, { backgroundColor: colors.textMuted + '20' }]}>
              <Text style={[styles.skippedText, { color: colors.textMuted }]}>
                Skipped
              </Text>
            </View>
          )}
        </View>

        {/* Skip Button */}
        {!isWorkoutCompleted && !isSkipped && (
          <TouchableOpacity
            style={[styles.skipButton, { borderColor: colors.border }]}
            onPress={handleSkipDay}
            disabled={skipping}
          >
            <Text style={[styles.skipButtonText, { color: colors.textMuted }]}>
              Skip This Day
            </Text>
          </TouchableOpacity>
        )}

        {/* Selected Exercise Video */}
        {selectedExercise && selectedExercise.videoUrl && (
          <View style={styles.videoSection}>
            <View style={styles.videoHeader}>
              <Text style={[styles.videoTitle, { color: colors.textPrimary }]}>
                {selectedExercise.name}
              </Text>
              <TouchableOpacity onPress={() => setSelectedExercise(null)}>
                <Text style={[styles.closeVideo, { color: colors.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <ExerciseVideoPlayer
              videoUrl={selectedExercise.videoUrl}
              height={220}
            />
          </View>
        )}
      </ScrollView>
    </>
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
  weekLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  dayTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  exerciseList: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  exerciseSets: {
    fontSize: 14,
    marginBottom: 2,
  },
  exerciseNotes: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  videoIcon: {
    fontSize: 18,
    marginLeft: 8,
  },
  startButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  completedBadge: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  completedText: {
    fontSize: 16,
    fontWeight: '600',
  },
  skippedBadge: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  skippedText: {
    fontSize: 14,
    fontWeight: '500',
  },
  skipButton: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  videoSection: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  videoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeVideo: {
    fontSize: 20,
    padding: 4,
  },
});
