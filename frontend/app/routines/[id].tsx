import { useState, useEffect } from 'react';
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
import type Routine from '../../src/db/models/Routine';
import type RoutineExercise from '../../src/db/models/RoutineExercise';
import type Exercise from '../../src/db/models/Exercise';
import { v4 as uuid } from 'uuid';

interface RoutineExerciseWithDetails {
  id: string;
  serverId: string;
  exerciseId: string;
  exerciseName: string;
  targetSets?: number;
  targetReps?: number;
  orderIndex: string;
}

export default function RoutineDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { startWorkout } = useWorkoutStore();

  const [routineName, setRoutineName] = useState('');
  const [exercises, setExercises] = useState<RoutineExerciseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExercisePicker, setShowExercisePicker] = useState(false);

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
      exercisesWithDetails.sort((a: RoutineExerciseWithDetails, b: RoutineExerciseWithDetails) =>
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

      loadRoutine();
    } catch (error) {
      console.error('Error removing exercise:', error);
      Alert.alert('Error', 'Failed to remove exercise');
    }
  };

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
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDeleteRoutine}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.routineTitle}>{routineName}</Text>
        <Text style={styles.exerciseCount}>
          {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'}
        </Text>
      </View>

      <TouchableOpacity style={styles.startWorkoutButton} onPress={handleStartWorkout}>
        <Text style={styles.startWorkoutText}>Start Workout</Text>
      </TouchableOpacity>

      <ScrollView style={styles.exerciseList}>
        {exercises.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No exercises yet</Text>
            <Text style={styles.emptySubtext}>Add exercises to this routine</Text>
          </View>
        ) : (
          exercises.map((exercise, index) => (
            <View key={exercise.id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseNumber}>{index + 1}</Text>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                  <Text style={styles.exerciseTarget}>
                    {exercise.targetSets} sets × {exercise.targetReps} reps
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveExercise(exercise.serverId)}>
                  <Text style={styles.removeButton}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity
          style={styles.addExerciseButton}
          onPress={() => setShowExercisePicker(true)}
        >
          <Text style={styles.addExerciseText}>+ Add Exercise</Text>
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
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backButton: {
    padding: 8,
  },
  backText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
  },
  titleContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  routineTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  exerciseCount: {
    fontSize: 16,
    color: '#94a3b8',
  },
  startWorkoutButton: {
    backgroundColor: '#22c55e',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startWorkoutText: {
    color: '#fff',
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
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#94a3b8',
    fontSize: 14,
  },
  exerciseCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366f1',
    width: 32,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  exerciseTarget: {
    fontSize: 14,
    color: '#94a3b8',
  },
  removeButton: {
    fontSize: 20,
    color: '#ef4444',
    padding: 8,
  },
  addExerciseButton: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
  },
  addExerciseText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
});
