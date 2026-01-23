import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Q } from '@nozbe/watermelondb';
import { database, routinesCollection, routineExercisesCollection, exercisesCollection } from '../../src/db';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import ExercisePicker from '../../src/components/ExercisePicker';
import InlineRoutineExerciseCard, { type RoutineExerciseData } from '../../src/components/InlineRoutineExerciseCard';
import type Routine from '../../src/db/models/Routine';
import type RoutineExercise from '../../src/db/models/RoutineExercise';
import type Exercise from '../../src/db/models/Exercise';
import { v4 as uuid } from 'uuid';
import { useTheme } from '../../src/hooks/useTheme';

export default function RoutineDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { startWorkout } = useWorkoutStore();
  const colors = useTheme();

  const [routineName, setRoutineName] = useState('');
  const [exercises, setExercises] = useState<RoutineExerciseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);

  useEffect(() => {
    loadRoutine();
  }, [id]);

  const loadRoutine = async () => {
    try {
      const routine = await routinesCollection
        .query(Q.where('server_id', id))
        .fetch();

      if (routine.length === 0) {
        Alert.alert('Error', 'Routine not found');
        router.back();
        return;
      }

      const routineRecord: Routine = routine[0] as Routine;
      setRoutineName(routineRecord.name);

      // Load routine exercises with exercise details
      const routineExercises = await routineRecord.routineExercises
        .extend(Q.where('deleted_at', null))
        .fetch();

      const exercisesWithDetails = await Promise.all(
        routineExercises.map(async (re: RoutineExercise) => {
          const exercise = await exercisesCollection
            .query(Q.where('server_id', re.exerciseId))
            .fetch();

          const exerciseRecord: Exercise = exercise[0] as Exercise;

          return {
            id: re.id,
            serverId: re.serverId,
            exerciseId: re.exerciseId,
            exerciseName: exerciseRecord?.name || 'Unknown Exercise',
            targetSets: re.targetSets,
            targetReps: re.targetReps,
            orderIndex: re.orderIndex,
          };
        })
      );

      // Sort by order index
      exercisesWithDetails.sort((a: RoutineExerciseData, b: RoutineExerciseData) =>
        a.orderIndex.localeCompare(b.orderIndex)
      );
      setExercises(exercisesWithDetails);
    } catch (error) {
      console.error('Error loading routine:', error);
      Alert.alert('Error', 'Failed to load routine');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExercise = async (exerciseId: string, exerciseName: string) => {
    try {
      const routine = await routinesCollection
        .query(Q.where('server_id', id))
        .fetch();

      if (routine.length === 0) return;

      const maxOrderIndex = exercises.length > 0
        ? Math.max(...exercises.map((e) => parseInt(e.orderIndex, 10)))
        : 0;

      await database.write(async () => {
        await routineExercisesCollection.create((re: RoutineExercise) => {
          re.serverId = uuid();
          re.routineId = routine[0].id;
          re.exerciseId = exerciseId;
          re.orderIndex = (maxOrderIndex + 1).toString();
          re.targetSets = 3;
          re.targetReps = 10;
        });
      });

      loadRoutine();
    } catch (error) {
      console.error('Error adding exercise:', error);
      Alert.alert('Error', 'Failed to add exercise');
    }
  };

  const handleRemoveExercise = async (exerciseId: string) => {
    try {
      const routineExercise = await routineExercisesCollection
        .query(Q.where('server_id', exerciseId))
        .fetch();

      if (routineExercise.length === 0) return;

      await database.write(async () => {
        await routineExercise[0].update((re: RoutineExercise) => {
          re.deletedAt = new Date();
        });
      });

      // Collapse if removing the expanded exercise
      if (expandedExerciseId === exerciseId) {
        setExpandedExerciseId(null);
      }

      loadRoutine();
    } catch (error) {
      console.error('Error removing exercise:', error);
      Alert.alert('Error', 'Failed to remove exercise');
    }
  };

  const handleUpdateExercise = useCallback(async (serverId: string, targetSets: number, targetReps: number) => {
    try {
      const routineExercise = await routineExercisesCollection
        .query(Q.where('server_id', serverId))
        .fetch();

      if (routineExercise.length === 0) return;

      await database.write(async () => {
        await routineExercise[0].update((re: RoutineExercise) => {
          re.targetSets = targetSets;
          re.targetReps = targetReps;
        });
      });

      // Update local state immediately for responsive UI
      setExercises(prev => prev.map(ex =>
        ex.serverId === serverId
          ? { ...ex, targetSets, targetReps }
          : ex
      ));
    } catch (error) {
      console.error('Error updating exercise:', error);
      Alert.alert('Error', 'Failed to update exercise');
    }
  }, []);

  const handleToggleExpand = useCallback((serverId: string) => {
    setExpandedExerciseId(prev => prev === serverId ? null : serverId);
  }, []);

  const handleMoveExercise = useCallback(async (serverId: string, direction: 'up' | 'down') => {
    try {
      const currentIndex = exercises.findIndex(ex => ex.serverId === serverId);
      if (currentIndex === -1) return;

      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= exercises.length) return;

      const currentExercise = exercises[currentIndex];
      const swapExercise = exercises[newIndex];

      // Swap order indices
      const currentOrderIndex = currentExercise.orderIndex;
      const swapOrderIndex = swapExercise.orderIndex;

      // Update both exercises in the database
      const [currentRecord] = await routineExercisesCollection
        .query(Q.where('server_id', currentExercise.serverId))
        .fetch();
      const [swapRecord] = await routineExercisesCollection
        .query(Q.where('server_id', swapExercise.serverId))
        .fetch();

      if (!currentRecord || !swapRecord) return;

      await database.write(async () => {
        await currentRecord.update((re: RoutineExercise) => {
          re.orderIndex = swapOrderIndex;
        });
        await swapRecord.update((re: RoutineExercise) => {
          re.orderIndex = currentOrderIndex;
        });
      });

      // Update local state for immediate feedback
      const newExercises = [...exercises];
      newExercises[currentIndex] = { ...currentExercise, orderIndex: swapOrderIndex };
      newExercises[newIndex] = { ...swapExercise, orderIndex: currentOrderIndex };
      newExercises.sort((a, b) => a.orderIndex.localeCompare(b.orderIndex));
      setExercises(newExercises);
    } catch (error) {
      console.error('Error moving exercise:', error);
      Alert.alert('Error', 'Failed to reorder exercise');
    }
  }, [exercises]);

  const handleStartWorkout = async () => {
    try {
      const routine = await routinesCollection
        .query(Q.where('server_id', id))
        .fetch();

      if (routine.length === 0) return;

      // Start workout with routine ID
      startWorkout(routine[0].serverId);

      // Add exercises from routine to workout
      for (const exercise of exercises) {
        useWorkoutStore.getState().addExercise(exercise.exerciseId, exercise.exerciseName);
      }

      router.push('/(tabs)/workout');
    } catch (error) {
      console.error('Error starting workout:', error);
      Alert.alert('Error', 'Failed to start workout');
    }
  };

  const handleDeleteRoutine = async () => {
    Alert.alert(
      'Delete Routine',
      'Are you sure you want to delete this routine?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const routine = await routinesCollection
                .query(Q.where('server_id', id))
                .fetch();

              if (routine.length === 0) return;

              await database.write(async () => {
                await routine[0].update((r: Routine) => {
                  r.deletedAt = new Date();
                });
              });

              router.back();
            } catch (error) {
              console.error('Error deleting routine:', error);
              Alert.alert('Error', 'Failed to delete routine');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textPrimary }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDeleteRoutine}>
          <Text style={[styles.deleteText, { color: colors.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.titleContainer, { borderBottomColor: colors.border }]}>
        <Text style={[styles.routineTitle, { color: colors.textPrimary }]}>{routineName}</Text>
        <Text style={[styles.exerciseCount, { color: colors.textSecondary }]}>
          {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'}
        </Text>
      </View>

      <TouchableOpacity style={[styles.startWorkoutButton, { backgroundColor: colors.success }]} onPress={handleStartWorkout}>
        <Text style={[styles.startWorkoutText, { color: colors.background }]}>Start Workout</Text>
      </TouchableOpacity>

      <ScrollView style={styles.exerciseList}>
        {exercises.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textPrimary }]}>No exercises yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Tap "Add Exercise" to build your routine</Text>
          </View>
        ) : (
          exercises.map((exercise, index) => (
            <InlineRoutineExerciseCard
              key={exercise.id}
              exercise={exercise}
              index={index + 1}
              isExpanded={expandedExerciseId === exercise.serverId}
              isFirst={index === 0}
              isLast={index === exercises.length - 1}
              onToggleExpand={() => handleToggleExpand(exercise.serverId)}
              onUpdate={handleUpdateExercise}
              onRemove={handleRemoveExercise}
              onMoveUp={(serverId) => handleMoveExercise(serverId, 'up')}
              onMoveDown={(serverId) => handleMoveExercise(serverId, 'down')}
            />
          ))
        )}

        <TouchableOpacity
          style={[styles.addExerciseButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowExercisePicker(true)}
        >
          <Text style={[styles.addExerciseText, { color: colors.primary }]}>+ Add Exercise</Text>
        </TouchableOpacity>
      </ScrollView>

      <ExercisePicker
        visible={showExercisePicker}
        onClose={() => setShowExercisePicker(false)}
        onSelectExercise={handleAddExercise}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
  },
  titleContainer: {
    padding: 20,
    borderBottomWidth: 1,
  },
  routineTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  exerciseCount: {
    fontSize: 16,
  },
  startWorkoutButton: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startWorkoutText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  exerciseList: {
    flex: 1,
    padding: 16,
    paddingTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
  addExerciseButton: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  addExerciseText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
