/**
 * CopyWorkoutModal Component
 * 
 * C5: Modal for copying exercises (and optionally weights) from a previous workout.
 * Respects 30-day history limit for FREE tier.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { workoutsCollection, workoutSetsCollection } from '../db';
import { useAuthStore } from '../stores/authStore';
import { getTier } from '../services/exporters/exportLimits';
import type Workout from '../db/models/Workout';
import type WorkoutSet from '../db/models/WorkoutSet';
import { useTheme } from '../hooks/useTheme';
import { logError } from '../utils/errorHandler';

interface CopyWorkoutModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectWorkout: (workoutId: string, copyWeights: boolean) => void;
}

interface WorkoutListItem {
  id: string;
  serverId: string;
  name: string;
  date: Date;
  exerciseCount: number;
  setCount: number;
}

export default function CopyWorkoutModal({
  visible,
  onClose,
  onSelectWorkout,
}: CopyWorkoutModalProps) {
  const { user } = useAuthStore();
  const colors = useTheme();
  const [workouts, setWorkouts] = useState<WorkoutListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState<'FREE' | 'PRO' | 'ELITE'>('FREE');
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [copyWeights, setCopyWeights] = useState(false);

  useEffect(() => {
    if (visible && user?.id) {
      loadWorkouts();
      getTier(user.id).then(setTier);
    }
  }, [visible, user?.id]);

  const loadWorkouts = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // C5: For FREE tier, limit to last 30 days
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);

      const queryConditions = [
        Q.where('user_id', user.id),
        Q.where('deleted_at', null),
        Q.sortBy('started_at', Q.desc),
        Q.take(20), // Limit to 20 most recent workouts
      ];

      // C5: Add date filter for FREE tier
      if (tier === 'FREE') {
        queryConditions.push(Q.where('started_at', Q.gte(thirtyDaysAgo.getTime())));
      }

      const workoutRecords = await workoutsCollection
        .query(...queryConditions)
        .fetch();

      // Calculate stats for each workout
      const workoutsWithStats = await Promise.all(
        workoutRecords.map(async (workout: Workout) => {
          const sets = await workout.sets.fetch();
          const uniqueExercises = new Set(sets.map((s: WorkoutSet) => s.exerciseId));

          return {
            id: workout.id,
            serverId: workout.serverId,
            name: workout.name || 'Untitled Workout',
            date: workout.startedAt,
            exerciseCount: uniqueExercises.size,
            setCount: sets.length,
          };
        })
      );

      setWorkouts(workoutsWithStats);
    } catch (error) {
      logError(error, 'CopyWorkoutModal_loadWorkouts');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const handleSelectWorkout = (workoutId: string) => {
    setSelectedWorkoutId(workoutId);
  };

  const handleConfirm = () => {
    if (selectedWorkoutId) {
      onSelectWorkout(selectedWorkoutId, copyWeights);
      onClose();
      // Reset state
      setSelectedWorkoutId(null);
      setCopyWeights(false);
    }
  };

  const renderWorkoutItem = ({ item }: { item: WorkoutListItem }) => {
    const isSelected = selectedWorkoutId === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.workoutItem,
          { backgroundColor: colors.surface, borderColor: colors.border },
          isSelected && { borderColor: colors.primary, borderWidth: 2 },
        ]}
        onPress={() => handleSelectWorkout(item.id)}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Select workout ${item.name} from ${formatDate(item.date)}`}
        accessibilityState={{ selected: isSelected }}
      >
        <View style={styles.workoutInfo}>
          <Text style={[styles.workoutName, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.workoutDate, { color: colors.textSecondary }]}>
            {formatDate(item.date)}
          </Text>
        </View>
        <View style={styles.workoutStats}>
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {item.exerciseCount} {item.exerciseCount === 1 ? 'exercise' : 'exercises'}
          </Text>
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {item.setCount} {item.setCount === 1 ? 'set' : 'sets'}
          </Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color={colors.primary} style={styles.checkIcon} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} accessible={true} accessibilityLabel="Close" accessibilityRole="button">
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Copy from Previous Workout</Text>
          <View style={{ width: 24 }} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : workouts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="fitness-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No previous workouts found
            </Text>
            {tier === 'FREE' && (
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                Showing workouts from the last 30 days
              </Text>
            )}
          </View>
        ) : (
          <>
            {/* Workout List */}
            <FlatList
              data={workouts}
              renderItem={renderWorkoutItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                <View style={styles.headerInfo}>
                  <Text style={[styles.headerInfoText, { color: colors.textSecondary }]}>
                    Select a workout to copy exercises from
                  </Text>
                </View>
              }
            />

            {/* Copy Options */}
            {selectedWorkoutId && (
              <View style={[styles.optionsContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                <Text style={[styles.optionsTitle, { color: colors.textPrimary }]}>Copy Options</Text>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                    !copyWeights && { borderColor: colors.primary, borderWidth: 2 },
                  ]}
                  onPress={() => setCopyWeights(false)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Copy exercises only"
                  accessibilityState={{ selected: !copyWeights }}
                >
                  <Text style={[styles.optionText, { color: colors.textPrimary }]}>Exercises Only</Text>
                  <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                    Copy exercise list without weights/reps
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                    copyWeights && { borderColor: colors.primary, borderWidth: 2 },
                  ]}
                  onPress={() => setCopyWeights(true)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Copy exercises with weights"
                  accessibilityState={{ selected: copyWeights }}
                >
                  <Text style={[styles.optionText, { color: colors.textPrimary }]}>With Weights</Text>
                  <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                    Copy exercises with weights and reps
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmButton, { backgroundColor: colors.primary }]}
                  onPress={handleConfirm}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Start workout with copied exercises"
                >
                  <Text style={[styles.confirmButtonText, { color: colors.background }]}>
                    Start Workout
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  headerInfo: {
    marginBottom: 16,
  },
  headerInfoText: {
    fontSize: 14,
  },
  workoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  workoutDate: {
    fontSize: 14,
  },
  workoutStats: {
    flexDirection: 'row',
    gap: 12,
    marginRight: 8,
  },
  statText: {
    fontSize: 12,
  },
  checkIcon: {
    marginLeft: 8,
  },
  optionsContainer: {
    padding: 16,
    borderTopWidth: 1,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionButton: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
  },
  confirmButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
