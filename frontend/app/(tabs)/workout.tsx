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
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Active Workout</Text>
          <Text style={styles.emptySubtext}>
            Start a new workout or select a routine
          </Text>
          <TouchableOpacity style={styles.startButton} onPress={handleStartWorkout}>
            <Text style={styles.startButtonText}>Start Empty Workout</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.workoutHeader}>
        <View style={styles.workoutHeaderTop}>
          <TextInput
            style={styles.workoutTitle}
            value={workoutName}
            onChangeText={updateWorkoutName}
            placeholder="Workout Name"
            placeholderTextColor="#64748b"
          />
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancelWorkout}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.workoutNote}
          value={workoutNote}
          onChangeText={updateWorkoutNote}
          placeholder="Add workout notes..."
          placeholderTextColor="#64748b"
          multiline
        />

        {/* Visibility Picker */}
        <View style={styles.visibilityContainer}>
          <Text style={styles.visibilityLabel}>Visibility:</Text>
          <View style={styles.visibilityButtons}>
            <TouchableOpacity
              style={[
                styles.visibilityButton,
                visibility === 'PUBLIC' && styles.visibilityButtonActive,
              ]}
              onPress={() => updateVisibility('PUBLIC')}
            >
              <Text
                style={[
                  styles.visibilityButtonText,
                  visibility === 'PUBLIC' && styles.visibilityButtonTextActive,
                ]}
              >
                Public
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.visibilityButton,
                visibility === 'FOLLOWERS' && styles.visibilityButtonActive,
              ]}
              onPress={() => updateVisibility('FOLLOWERS')}
            >
              <Text
                style={[
                  styles.visibilityButtonText,
                  visibility === 'FOLLOWERS' && styles.visibilityButtonTextActive,
                ]}
              >
                Followers
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.visibilityButton,
                visibility === 'PRIVATE' && styles.visibilityButtonActive,
              ]}
              onPress={() => updateVisibility('PRIVATE')}
            >
              <Text
                style={[
                  styles.visibilityButtonText,
                  visibility === 'PRIVATE' && styles.visibilityButtonTextActive,
                ]}
              >
                Private
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.finishButton} onPress={handleFinishWorkout}>
          <Text style={styles.finishButtonText}>Finish Workout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.exerciseList}>
        {exercises.map((exercise) => (
          <View key={exercise.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <TouchableOpacity onPress={() => removeExercise(exercise.id)}>
                <Text style={styles.removeExerciseText}>Remove</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.setHeader}>
              <Text style={styles.setHeaderText}>SET</Text>
              <Text style={styles.setHeaderText}>KG</Text>
              <Text style={styles.setHeaderText}>REPS</Text>
              <Text style={styles.setHeaderText}>RPE</Text>
              <Text style={styles.setHeaderText}></Text>
            </View>

            {exercise.sets.map((set, index) => (
              <View key={set.id} style={styles.setRow}>
                <Text style={styles.setNumber}>{index + 1}</Text>
                <TextInput
                  style={styles.setInput}
                  value={set.weightKg}
                  onChangeText={(value) =>
                    updateSet(exercise.id, set.id, { weightKg: value })
                  }
                  placeholder="0"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.setInput}
                  value={set.reps}
                  onChangeText={(value) =>
                    updateSet(exercise.id, set.id, { reps: value })
                  }
                  placeholder="0"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.setInput}
                  value={set.rpe || ''}
                  onChangeText={(value) =>
                    updateSet(exercise.id, set.id, { rpe: value })
                  }
                  placeholder="-"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={[styles.checkButton, set.completed && styles.checkButtonActive]}
                  onPress={() => toggleSetComplete(exercise.id, set.id)}
                >
                  <Text style={styles.checkText}>{set.completed ? '✓' : ''}</Text>
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.setActions}>
              <TouchableOpacity
                style={styles.addSetButton}
                onPress={() => addSet(exercise.id)}
              >
                <Text style={styles.addSetText}>+ Add Set</Text>
              </TouchableOpacity>
              {exercise.sets.length > 0 && (
                <TouchableOpacity
                  style={styles.removeSetButton}
                  onPress={() => removeSet(exercise.id, exercise.sets[exercise.sets.length - 1].id)}
                >
                  <Text style={styles.removeSetText}>Remove Last Set</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addExerciseButton} onPress={handleAddExercise}>
          <Text style={styles.addExerciseText}>+ Add Exercise</Text>
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
    backgroundColor: '#0f172a',
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
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  startButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    paddingHorizontal: 32,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  workoutHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
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
    color: '#fff',
  },
  cancelButton: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    padding: 8,
    paddingHorizontal: 16,
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  workoutNote: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    marginBottom: 12,
    minHeight: 60,
  },
  visibilityContainer: {
    marginBottom: 12,
  },
  visibilityLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  visibilityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  visibilityButton: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155',
  },
  visibilityButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  visibilityButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  visibilityButtonTextActive: {
    color: '#fff',
  },
  finishButton: {
    backgroundColor: '#22c55e',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  finishButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  exerciseList: {
    flex: 1,
    padding: 16,
  },
  exerciseCard: {
    backgroundColor: '#1e293b',
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
    color: '#fff',
  },
  removeExerciseText: {
    color: '#ef4444',
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
    color: '#64748b',
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
    color: '#fff',
    textAlign: 'center',
  },
  setInput: {
    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    color: '#fff',
    textAlign: 'center',
  },
  checkButton: {
    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 12,
    marginLeft: 4,
    alignItems: 'center',
  },
  checkButtonActive: {
    backgroundColor: '#22c55e',
  },
  checkText: {
    color: '#fff',
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
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  removeSetButton: {
    padding: 12,
    flex: 1,
  },
  removeSetText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  addExerciseButton: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
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
