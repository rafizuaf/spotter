/**
 * Phase 2E: Advanced program day (5/3/1). Prescribed weights from TM.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useTheme } from '../../../src/hooks/useTheme';
import { useAuthStore } from '../../../src/stores/authStore';
import {
  advancedProgramsCollection,
  advancedProgramDaysCollection,
  userAdvancedProgramEnrollmentsCollection,
  exercisesCollection,
} from '../../../src/db';
import { Q } from '@nozbe/watermelondb';
import { loadTrainingMaxData } from '../../../src/services/trainingMax';
import type AdvancedProgramDay from '../../../src/db/models/AdvancedProgramDay';
import type { AdvancedProgramDayExercise } from '../../../src/db/models/AdvancedProgramDay';
import type UserAdvancedProgramEnrollment from '../../../src/db/models/UserAdvancedProgramEnrollment';
import type Exercise from '../../../src/db/models/Exercise';

const FIVE_THREE_ONE_CODE = 'FIVE_THREE_ONE';

interface ExerciseWithDetails extends AdvancedProgramDayExercise {
  name: string;
}

function prescribedWeight(tmKg: number, percent: number): number {
  return Math.round((tmKg * (percent / 100)) * 10) / 10;
}

export default function AdvancedProgramDayScreen() {
  const { dayIndex } = useLocalSearchParams<{ dayIndex: string }>();
  const colors = useTheme();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState<AdvancedProgramDay | null>(null);
  const [enrollment, setEnrollment] = useState<UserAdvancedProgramEnrollment | null>(null);
  const [exercises, setExercises] = useState<ExerciseWithDetails[]>([]);
  const [tmMap, setTmMap] = useState<Map<string, number>>(new Map());

  const dayNum = parseInt(dayIndex ?? '1', 10);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      const [programs, tmData] = await Promise.all([
        advancedProgramsCollection
          .query(
            Q.where('code', FIVE_THREE_ONE_CODE),
            Q.where('is_active', true),
            Q.where('deleted_at', null)
          )
          .fetch(),
        loadTrainingMaxData(user.id),
      ]);

      if (programs.length === 0) {
        setLoading(false);
        return;
      }
      const program = programs[0];

      const enrollments = await userAdvancedProgramEnrollmentsCollection
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
      setEnrollment(enrollments[0]);

      const days = await advancedProgramDaysCollection
        .query(
          Q.where('program_id', program.serverId),
          Q.where('order_index', dayNum),
          Q.where('deleted_at', null)
        )
        .fetch();

      if (days.length === 0) {
        setLoading(false);
        return;
      }
      const foundDay = days[0];
      setDay(foundDay);

      const exerciseData = foundDay.exercises ?? [];
      const exerciseIds = exerciseData.map((e) => e.exercise_id);
      const tmByExercise = new Map<string, number>();
      for (const eid of exerciseIds) {
        const t = tmData.trainingMaxes.get(eid);
        if (t) tmByExercise.set(eid, t.tm);
      }
      setTmMap(tmByExercise);

      if (exerciseIds.length > 0) {
        const exerciseRecords = await exercisesCollection
          .query(Q.where('server_id', Q.oneOf(exerciseIds)), Q.where('deleted_at', null))
          .fetch();
        const byId = new Map<string, Exercise>();
        exerciseRecords.forEach((e) => byId.set((e as Exercise).serverId, e as Exercise));
        const withDetails: ExerciseWithDetails[] = exerciseData.map((e) => ({
          ...e,
          name: (byId.get(e.exercise_id) as Exercise | undefined)?.name ?? 'Unknown',
        }));
        setExercises(withDetails);
      }
    } catch (e) {
      console.error('Advanced program day load error:', e);
    } finally {
      setLoading(false);
    }
  }, [user, dayNum]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStartWorkout = () => {
    router.push('/(tabs)/workout' as never);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!day || !enrollment) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Day not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `Week ${day.weekNumber} Day ${day.dayNumber}`,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <Text style={[styles.weekLabel, { color: colors.textMuted }]}>{day.weekDayLabel}</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{day.dayTitle}</Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Prescribed sets</Text>
          {exercises.map((ex, exIdx) => {
            const tm = tmMap.get(ex.exercise_id);
            const isLast = exIdx === exercises.length - 1;
            return (
              <View
                key={ex.exercise_id}
                style={[styles.exercise, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
              >
                <Text style={[styles.exName, { color: colors.textPrimary }]}>{ex.name}</Text>
                {tm != null && tm > 0 ? (
                  ex.sets.map((s, i) => (
                    <Text key={i} style={[styles.setLine, { color: colors.textSecondary }]}>
                      Set {i + 1}: {s.percent_tm}% = {prescribedWeight(tm, s.percent_tm)} kg × {s.reps} reps
                    </Text>
                  ))
                ) : (
                  <Text style={[styles.noTm, { color: colors.textMuted }]}>
                    Set a Training Max for this exercise in Settings → Training Max
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: colors.primary }]}
          onPress={handleStartWorkout}
        >
          <Text style={[styles.startBtnText, { color: colors.background }]}>Start workout</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  weekLabel: { fontSize: 14, marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '600' },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  exercise: {
    paddingVertical: 12,
  },
  exName: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  setLine: { fontSize: 14, marginLeft: 8, marginTop: 2 },
  noTm: { fontSize: 13, fontStyle: 'italic', marginTop: 4 },
  startBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startBtnText: { fontSize: 16, fontWeight: '600' },
});
