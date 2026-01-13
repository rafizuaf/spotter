import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import ExercisePicker from '../../src/components/ExercisePicker';
import { useTheme } from '../../src/hooks/useTheme';

export default function WorkoutScreen() {
  const {
    isActive,
    workoutName,
    workoutNote,
    visibility,
    exercises,
    startWorkout,
    addExercise,
    removeExercise,
    addSet,
    removeSet,
    updateSet,
    toggleSetComplete,
    updateWorkoutName,
    updateWorkoutNote,
    updateVisibility,
    finishWorkout,
    cancelWorkout,
  } = useWorkoutStore();
  const colors = useTheme();

  const [showExercisePicker, setShowExercisePicker] = useState(false);

  const handleStartWorkout = () => {
    startWorkout();
  };

  const handleAddExercise = () => {
    setShowExercisePicker(true);
  };

  const handleSelectExercise = (exerciseId: string, exerciseName: string) => {
    addExercise(exerciseId, exerciseName);
  };

  const handleFinishWorkout = async () => {
    const result = await finishWorkout();
    if (result.success) {
      // Build success message with gamification results
      const { gamification } = result;
      let message = 'Workout saved successfully!\n\n';

      if (gamification) {
        if (gamification.xpAwarded > 0) {
          message += `+${gamification.xpAwarded} XP earned\n`;
        }
        if (gamification.levelUp && gamification.newLevel > 0) {
          message += `🎉 Level Up! You're now level ${gamification.newLevel}\n`;
        }
        if (gamification.prCount > 0) {
          message += `🏆 ${gamification.prCount} new personal record${gamification.prCount > 1 ? 's' : ''}!\n`;
        }
        if (gamification.badgesUnlocked > 0) {
          message += `🎖️ ${gamification.badgesUnlocked} badge${gamification.badgesUnlocked > 1 ? 's' : ''} unlocked!\n`;
        }
      }

      Alert.alert('Workout Complete!', message.trim());
    } else {
      Alert.alert('Error', result.error || 'Failed to save workout');
    }
  };

  const handleCancelWorkout = () => {
    Alert.alert(
      'Cancel Workout',
      'Are you sure you want to cancel this workout? All progress will be lost.',
      [
        { text: 'Continue Workout', style: 'cancel' },
        {
          text: 'Cancel Workout',
          style: 'destructive',
          onPress: cancelWorkout,
        },
      ]
    );
  };

  if (!isActive) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Active Workout</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Start a new workout or select a routine
          </Text>
          <TouchableOpacity style={[styles.startButton, { backgroundColor: colors.primary }]} onPress={handleStartWorkout}>
            <Text style={[styles.startButtonText, { color: colors.background }]}>Start Empty Workout</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.workoutHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.workoutHeaderTop}>
          <TextInput
            style={[styles.workoutTitle, { color: colors.textPrimary }]}
            value={workoutName}
            onChangeText={updateWorkoutName}
            placeholder="Workout Name"
            placeholderTextColor={colors.textMuted}
          />
          <TouchableOpacity style={[styles.cancelButton, { backgroundColor: colors.error }]} onPress={handleCancelWorkout}>
            <Text style={[styles.cancelButtonText, { color: colors.white }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.workoutNote, { backgroundColor: colors.surface, color: colors.textPrimary }]}
          value={workoutNote}
          onChangeText={updateWorkoutNote}
          placeholder="Add workout notes..."
          placeholderTextColor={colors.textMuted}
          multiline
        />

        {/* Visibility Picker */}
        <View style={styles.visibilityContainer}>
          <Text style={[styles.visibilityLabel, { color: colors.textSecondary }]}>Visibility:</Text>
          <View style={styles.visibilityButtons}>
            <TouchableOpacity
              style={[
                styles.visibilityButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
                visibility === 'PUBLIC' && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => updateVisibility('PUBLIC')}
            >
              <Text
                style={[
                  styles.visibilityButtonText,
                  { color: colors.textSecondary },
                  visibility === 'PUBLIC' && { color: colors.background },
                ]}
              >
                Public
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.visibilityButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
                visibility === 'FOLLOWERS' && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => updateVisibility('FOLLOWERS')}
            >
              <Text
                style={[
                  styles.visibilityButtonText,
                  { color: colors.textSecondary },
                  visibility === 'FOLLOWERS' && { color: colors.background },
                ]}
              >
                Followers
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.visibilityButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
                visibility === 'PRIVATE' && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => updateVisibility('PRIVATE')}
            >
              <Text
                style={[
                  styles.visibilityButtonText,
                  { color: colors.textSecondary },
                  visibility === 'PRIVATE' && { color: colors.background },
                ]}
              >
                Private
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={[styles.finishButton, { backgroundColor: colors.success }]} onPress={handleFinishWorkout}>
          <Text style={[styles.finishButtonText, { color: colors.background }]}>Finish Workout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.exerciseList}>
        {exercises.map((exercise) => (
          <View key={exercise.id} style={[styles.exerciseCard, { backgroundColor: colors.surface }]}>
            <View style={styles.exerciseHeader}>
              <Text style={[styles.exerciseName, { color: colors.textPrimary }]}>{exercise.name}</Text>
              <TouchableOpacity onPress={() => removeExercise(exercise.id)}>
                <Text style={[styles.removeExerciseText, { color: colors.error }]}>Remove</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.setHeader}>
              <Text style={[styles.setHeaderText, { color: colors.textMuted }]}>SET</Text>
              <Text style={[styles.setHeaderText, { color: colors.textMuted }]}>KG</Text>
              <Text style={[styles.setHeaderText, { color: colors.textMuted }]}>REPS</Text>
              <Text style={[styles.setHeaderText, { color: colors.textMuted }]}>RPE</Text>
              <Text style={styles.setHeaderText}></Text>
            </View>

            {exercise.sets.map((set, index) => (
              <View key={set.id} style={styles.setRow}>
                <Text style={[styles.setNumber, { color: colors.textPrimary }]}>{index + 1}</Text>
                <TextInput
                  style={[styles.setInput, { backgroundColor: colors.surfaceElevated, color: colors.textPrimary }]}
                  value={set.weightKg}
                  onChangeText={(value) =>
                    updateSet(exercise.id, set.id, { weightKg: value })
                  }
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.setInput, { backgroundColor: colors.surfaceElevated, color: colors.textPrimary }]}
                  value={set.reps}
                  onChangeText={(value) =>
                    updateSet(exercise.id, set.id, { reps: value })
                  }
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.setInput, { backgroundColor: colors.surfaceElevated, color: colors.textPrimary }]}
                  value={set.rpe || ''}
                  onChangeText={(value) =>
                    updateSet(exercise.id, set.id, { rpe: value })
                  }
                  placeholder="-"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={[
                    styles.checkButton,
                    { backgroundColor: colors.surfaceElevated },
                    set.completed && { backgroundColor: colors.success },
                  ]}
                  onPress={() => toggleSetComplete(exercise.id, set.id)}
                >
                  <Text style={[styles.checkText, { color: colors.textPrimary }]}>{set.completed ? '✓' : ''}</Text>
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.setActions}>
              <TouchableOpacity
                style={styles.addSetButton}
                onPress={() => addSet(exercise.id)}
              >
                <Text style={[styles.addSetText, { color: colors.primary }]}>+ Add Set</Text>
              </TouchableOpacity>
              {exercise.sets.length > 0 && (
                <TouchableOpacity
                  style={styles.removeSetButton}
                  onPress={() => removeSet(exercise.id, exercise.sets[exercise.sets.length - 1].id)}
                >
                  <Text style={[styles.removeSetText, { color: colors.error }]}>Remove Last Set</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        <TouchableOpacity style={[styles.addExerciseButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleAddExercise}>
          <Text style={[styles.addExerciseText, { color: colors.primary }]}>+ Add Exercise</Text>
        </TouchableOpacity>
      </ScrollView>

      <ExercisePicker
        visible={showExercisePicker}
        onClose={() => setShowExercisePicker(false)}
        onSelectExercise={handleSelectExercise}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  startButton: {
    borderRadius: 12,
    padding: 16,
    paddingHorizontal: 32,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  workoutHeader: {
    padding: 16,
    borderBottomWidth: 1,
  },
  workoutHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  workoutTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
  },
  cancelButton: {
    borderRadius: 8,
    padding: 8,
    paddingHorizontal: 16,
    marginLeft: 8,
  },
  cancelButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  workoutNote: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    minHeight: 60,
  },
  visibilityContainer: {
    marginBottom: 12,
  },
  visibilityLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  visibilityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  visibilityButton: {
    flex: 1,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 2,
  },
  visibilityButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  finishButton: {
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  finishButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  exerciseList: {
    flex: 1,
    padding: 16,
  },
  exerciseCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
  },
  removeExerciseText: {
    fontSize: 14,
    fontWeight: '500',
  },
  setHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  setHeaderText: {
    flex: 1,
    fontSize: 12,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  setNumber: {
    flex: 1,
    fontSize: 16,
    textAlign: 'center',
  },
  setInput: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    textAlign: 'center',
  },
  checkButton: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    marginLeft: 4,
    alignItems: 'center',
  },
  checkText: {
    fontSize: 16,
  },
  setActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  addSetButton: {
    padding: 12,
    flex: 1,
  },
  addSetText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  removeSetButton: {
    padding: 12,
    flex: 1,
  },
  removeSetText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  addExerciseButton: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  addExerciseText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
