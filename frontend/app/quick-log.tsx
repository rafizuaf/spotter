import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../src/hooks/useTheme';
import { useWorkoutStore } from '../src/stores/workoutStore';
import { useAuthStore } from '../src/stores/authStore';
import { userSettingsCollection } from '../src/db';
import { Q } from '@nozbe/watermelondb';
import MuscleGroupGrid from '../src/components/MuscleGroupGrid';
import ExercisePicker from '../src/components/ExercisePicker';
import QuickLogSetInput from '../src/components/QuickLogSetInput';
import type UserSettings from '../src/db/models/UserSettings';

export default function QuickLogScreen() {
  const colors = useTheme();
  const { user } = useAuthStore();
  const {
    isActive,
    exercises,
    startWorkout,
    addExercise,
    addSet,
    updateSet,
    toggleSetComplete,
    finishWorkout,
    cancelWorkout,
  } = useWorkoutStore();

  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<{ id: string; name: string } | null>(null);
  const [showSetInput, setShowSetInput] = useState(false);
  const [weightUnit, setWeightUnit] = useState<'KG' | 'LBS'>('KG');

  // Load user settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;
      try {
        const settings = await userSettingsCollection
          .query(Q.where('user_id', user.id))
          .fetch();
        if (settings.length > 0) {
          const record = settings[0] as UserSettings;
          setWeightUnit((record.weightUnitPreference as 'KG' | 'LBS') || 'KG');
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, [user]);

  // Start workout when screen loads if not already active
  useEffect(() => {
    if (!isActive) {
      startWorkout();
    }
  }, []);

  const handleMuscleGroupSelect = (muscleGroup: string) => {
    setSelectedMuscleGroup(muscleGroup);
    setShowExercisePicker(true);
  };

  const handleExerciseSelect = (exerciseId: string, exerciseName: string) => {
    addExercise(exerciseId, exerciseName);
    setCurrentExercise({ id: exerciseId, name: exerciseName });
    setShowExercisePicker(false);
    setShowSetInput(true);
  };

  const handleAddSet = (weight: string, reps: string) => {
    if (!currentExercise) return;

    // Find the exercise entry
    const exerciseEntry = exercises.find(
      (e) => e.exerciseId === currentExercise.id
    );
    if (!exerciseEntry) return;

    // Get the last set to update it (addExercise creates one set by default)
    const lastSet = exerciseEntry.sets[exerciseEntry.sets.length - 1];
    if (lastSet && !lastSet.completed) {
      // Update the existing uncompleted set
      updateSet(exerciseEntry.id, lastSet.id, {
        weightKg: weight || '0',
        reps: reps || '0',
      });
      toggleSetComplete(exerciseEntry.id, lastSet.id);
    } else {
      // Add a new set
      addSet(exerciseEntry.id);
      // Get the newly added set
      const updatedExercise = useWorkoutStore.getState().exercises.find(
        (e) => e.exerciseId === currentExercise.id
      );
      if (updatedExercise) {
        const newSet = updatedExercise.sets[updatedExercise.sets.length - 1];
        updateSet(updatedExercise.id, newSet.id, {
          weightKg: weight || '0',
          reps: reps || '0',
        });
        toggleSetComplete(updatedExercise.id, newSet.id);
      }
    }
  };

  const handleDoneWithExercise = () => {
    setShowSetInput(false);
    setCurrentExercise(null);
    setSelectedMuscleGroup(null);
  };

  const handleFinish = async () => {
    // Check if any sets were logged
    const totalSets = exercises.reduce(
      (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
      0
    );

    if (totalSets === 0) {
      Alert.alert(
        'No Sets Logged',
        'Add at least one set before finishing.',
        [{ text: 'OK' }]
      );
      return;
    }

    const result = await finishWorkout();
    if (result.success) {
      const { gamification } = result;
      let message = 'Quick workout saved!\n\n';

      if (gamification) {
        if (gamification.xpAwarded > 0) {
          message += `+${gamification.xpAwarded} XP earned\n`;
        }
        if (gamification.levelUp && gamification.newLevel > 0) {
          message += `Level Up! You're now level ${gamification.newLevel}\n`;
        }
        if (gamification.prCount > 0) {
          message += `${gamification.prCount} new PR${gamification.prCount > 1 ? 's' : ''}!\n`;
        }
        if (gamification.badgesUnlocked > 0) {
          message += `${gamification.badgesUnlocked} badge${gamification.badgesUnlocked > 1 ? 's' : ''} unlocked!\n`;
        }
      }

      Alert.alert('Workout Complete!', message.trim(), [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('Error', result.error || 'Failed to save workout');
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Quick Log',
      'Are you sure? All logged sets will be lost.',
      [
        { text: 'Continue Logging', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: () => {
            cancelWorkout();
            router.back();
          },
        },
      ]
    );
  };

  // Get muscle groups that have logged exercises
  const loggedMuscleGroups = exercises.map((e) => {
    // We'll need to track this - for now just return empty
    return null;
  }).filter(Boolean);

  // Calculate total sets logged
  const totalSets = exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0
  );

  // Get current exercise set count
  const currentExerciseSetCount = currentExercise
    ? exercises.find((e) => e.exerciseId === currentExercise.id)?.sets.filter((s) => s.completed).length || 0
    : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleCancel}>
          <Text style={[styles.cancelText, { color: colors.error }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Quick Log</Text>
        <TouchableOpacity onPress={handleFinish}>
          <Text style={[styles.finishText, { color: colors.success }]}>Finish</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Instructions */}
        <Text style={[styles.instructions, { color: colors.textSecondary }]}>
          Tap a muscle group to log exercises
        </Text>

        {/* Muscle Group Grid */}
        <MuscleGroupGrid
          onSelect={handleMuscleGroupSelect}
          selectedGroups={[]}
        />

        {/* Summary */}
        {exercises.length > 0 && (
          <View style={[styles.summary, { backgroundColor: colors.surface }]}>
            <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>
              Logged Exercises
            </Text>
            {exercises.map((exercise) => {
              const completedSets = exercise.sets.filter((s) => s.completed).length;
              if (completedSets === 0) return null;
              return (
                <View key={exercise.id} style={styles.summaryItem}>
                  <Text style={[styles.summaryExercise, { color: colors.textPrimary }]}>
                    {exercise.name}
                  </Text>
                  <Text style={[styles.summaryCount, { color: colors.primary }]}>
                    {completedSets} set{completedSets !== 1 ? 's' : ''}
                  </Text>
                </View>
              );
            })}
            <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
                Total Sets
              </Text>
              <Text style={[styles.totalValue, { color: colors.primary }]}>
                {totalSets}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Exercise Picker Modal */}
      <ExercisePicker
        visible={showExercisePicker}
        onClose={() => {
          setShowExercisePicker(false);
          setSelectedMuscleGroup(null);
        }}
        onSelectExercise={handleExerciseSelect}
      />

      {/* Set Input Modal */}
      {currentExercise && (
        <QuickLogSetInput
          visible={showSetInput}
          exerciseName={currentExercise.name}
          setCount={currentExerciseSetCount}
          weightUnit={weightUnit}
          onAddSet={handleAddSet}
          onDone={handleDoneWithExercise}
          onCancel={() => {
            setShowSetInput(false);
            setCurrentExercise(null);
          }}
        />
      )}
    </SafeAreaView>
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
    borderBottomWidth: 1,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  finishText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  instructions: {
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 16,
  },
  summary: {
    margin: 16,
    borderRadius: 16,
    padding: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryExercise: {
    fontSize: 16,
  },
  summaryCount: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
