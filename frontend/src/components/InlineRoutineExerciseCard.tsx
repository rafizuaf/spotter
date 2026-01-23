import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';
import type { Colors } from '../utils/colors';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface RoutineExerciseData {
  id: string;
  serverId: string;
  exerciseId: string;
  exerciseName: string;
  targetSets?: number;
  targetReps?: number;
  orderIndex: string;
}

interface InlineRoutineExerciseCardProps {
  /** The exercise data */
  exercise: RoutineExerciseData;
  /** Index in the list (1-based display) */
  index: number;
  /** Whether this card is expanded for editing */
  isExpanded: boolean;
  /** Whether this is the first item (disables move up) */
  isFirst: boolean;
  /** Whether this is the last item (disables move down) */
  isLast: boolean;
  /** Callback when card is tapped to expand/collapse */
  onToggleExpand: () => void;
  /** Callback when sets/reps are updated */
  onUpdate: (serverId: string, targetSets: number, targetReps: number) => void;
  /** Callback when exercise is removed */
  onRemove: (serverId: string) => void;
  /** Callback when exercise is moved up */
  onMoveUp: (serverId: string) => void;
  /** Callback when exercise is moved down */
  onMoveDown: (serverId: string) => void;
}

// Common rep presets for quick selection
const REP_PRESETS = [5, 8, 10, 12, 15];
// Common set presets
const SET_PRESETS = [3, 4, 5];

/**
 * InlineRoutineExerciseCard
 *
 * An expandable card for editing routine exercises inline.
 * - Collapsed: Shows exercise name, sets×reps, tap to expand
 * - Expanded: Shows editable fields for sets/reps with presets
 *
 * Features:
 * - Preset buttons for common sets/reps values
 * - Manual entry via TextInput
 * - Move up/down buttons for reordering
 * - Haptic feedback on interactions
 * - Full accessibility support
 */
export default function InlineRoutineExerciseCard({
  exercise,
  index,
  isExpanded,
  isFirst,
  isLast,
  onToggleExpand,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: InlineRoutineExerciseCardProps) {
  const colors = useTheme();
  const styles = createStyles(colors);

  // Local state for editing
  const [localSets, setLocalSets] = useState(exercise.targetSets?.toString() || '3');
  const [localReps, setLocalReps] = useState(exercise.targetReps?.toString() || '10');
  const [showManualSets, setShowManualSets] = useState(false);
  const [showManualReps, setShowManualReps] = useState(false);

  // Reset local state when exercise changes or card collapses
  useEffect(() => {
    if (!isExpanded) {
      setLocalSets(exercise.targetSets?.toString() || '3');
      setLocalReps(exercise.targetReps?.toString() || '10');
      setShowManualSets(false);
      setShowManualReps(false);
    }
  }, [isExpanded, exercise.targetSets, exercise.targetReps]);

  const handleToggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleExpand();
  }, [onToggleExpand]);

  const handleSetPreset = useCallback((sets: number) => {
    Haptics.selectionAsync();
    setLocalSets(sets.toString());
    setShowManualSets(false);
  }, []);

  const handleRepPreset = useCallback((reps: number) => {
    Haptics.selectionAsync();
    setLocalReps(reps.toString());
    setShowManualReps(false);
  }, []);

  const handleSave = useCallback(() => {
    const sets = parseInt(localSets, 10) || 3;
    const reps = parseInt(localReps, 10) || 10;

    // Validate ranges
    const validSets = Math.max(1, Math.min(sets, 20));
    const validReps = Math.max(1, Math.min(reps, 100));

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onUpdate(exercise.serverId, validSets, validReps);
    onToggleExpand(); // Collapse after save
  }, [localSets, localReps, exercise.serverId, onUpdate, onToggleExpand]);

  const handleRemove = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRemove(exercise.serverId);
  }, [exercise.serverId, onRemove]);

  const handleMoveUp = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onMoveUp(exercise.serverId);
  }, [exercise.serverId, onMoveUp]);

  const handleMoveDown = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onMoveDown(exercise.serverId);
  }, [exercise.serverId, onMoveDown]);

  const currentSets = parseInt(localSets, 10) || 3;
  const currentReps = parseInt(localReps, 10) || 10;

  // Collapsed view
  if (!isExpanded) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={handleToggleExpand}
        activeOpacity={0.7}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${exercise.exerciseName}, ${exercise.targetSets || 3} sets of ${exercise.targetReps || 10} reps. Tap to edit.`}
        accessibilityHint="Double tap to expand and edit sets and reps"
      >
        <View style={styles.collapsedContent}>
          <Text style={styles.exerciseNumber}>{index}</Text>
          <View style={styles.exerciseInfo}>
            <Text style={styles.exerciseName} numberOfLines={1}>
              {exercise.exerciseName}
            </Text>
            <Text style={styles.exerciseTarget}>
              {exercise.targetSets || 3} sets × {exercise.targetReps || 10} reps
            </Text>
          </View>
          <View style={styles.collapsedActions}>
            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Expanded view
  return (
    <View style={[styles.card, styles.cardExpanded]}>
      {/* Header */}
      <TouchableOpacity
        style={styles.expandedHeader}
        onPress={handleToggleExpand}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Collapse ${exercise.exerciseName} editor`}
      >
        <Text style={styles.exerciseNumber}>{index}</Text>
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName} numberOfLines={1}>
            {exercise.exerciseName}
          </Text>
        </View>
        <Ionicons name="chevron-up" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Sets Section */}
      <View style={styles.editSection}>
        <Text style={styles.sectionLabel}>SETS</Text>
        <View style={styles.presetRow}>
          {SET_PRESETS.map((sets) => (
            <TouchableOpacity
              key={sets}
              style={[
                styles.presetButton,
                currentSets === sets && !showManualSets && styles.presetButtonSelected,
              ]}
              onPress={() => handleSetPreset(sets)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`${sets} sets`}
              accessibilityState={{ selected: currentSets === sets && !showManualSets }}
            >
              <Text
                style={[
                  styles.presetButtonText,
                  currentSets === sets && !showManualSets && styles.presetButtonTextSelected,
                ]}
              >
                {sets}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Manual entry toggle */}
          {showManualSets ? (
            <TextInput
              style={styles.manualInput}
              value={localSets}
              onChangeText={setLocalSets}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              autoFocus
              accessible={true}
              accessibilityLabel="Enter number of sets"
            />
          ) : (
            <TouchableOpacity
              style={styles.keyboardButton}
              onPress={() => {
                Haptics.selectionAsync();
                setShowManualSets(true);
              }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Enter sets manually"
            >
              <Ionicons name="keypad-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Reps Section */}
      <View style={styles.editSection}>
        <Text style={styles.sectionLabel}>REPS</Text>
        <View style={styles.presetRow}>
          {REP_PRESETS.map((reps) => (
            <TouchableOpacity
              key={reps}
              style={[
                styles.presetButton,
                currentReps === reps && !showManualReps && styles.presetButtonSelected,
              ]}
              onPress={() => handleRepPreset(reps)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`${reps} reps`}
              accessibilityState={{ selected: currentReps === reps && !showManualReps }}
            >
              <Text
                style={[
                  styles.presetButtonText,
                  currentReps === reps && !showManualReps && styles.presetButtonTextSelected,
                ]}
              >
                {reps}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Manual entry toggle */}
          {showManualReps ? (
            <TextInput
              style={styles.manualInput}
              value={localReps}
              onChangeText={setLocalReps}
              keyboardType="number-pad"
              maxLength={3}
              selectTextOnFocus
              autoFocus
              accessible={true}
              accessibilityLabel="Enter number of reps"
            />
          ) : (
            <TouchableOpacity
              style={styles.keyboardButton}
              onPress={() => {
                Haptics.selectionAsync();
                setShowManualReps(true);
              }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Enter reps manually"
            >
              <Ionicons name="keypad-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        {/* Reorder Buttons */}
        <View style={styles.reorderButtons}>
          <TouchableOpacity
            style={[styles.reorderButton, isFirst && styles.reorderButtonDisabled]}
            onPress={handleMoveUp}
            disabled={isFirst}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Move exercise up"
            accessibilityState={{ disabled: isFirst }}
          >
            <Ionicons
              name="arrow-up"
              size={18}
              color={isFirst ? colors.textMuted : colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.reorderButton, isLast && styles.reorderButtonDisabled]}
            onPress={handleMoveDown}
            disabled={isLast}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Move exercise down"
            accessibilityState={{ disabled: isLast }}
          >
            <Ionicons
              name="arrow-down"
              size={18}
              color={isLast ? colors.textMuted : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Remove Button */}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={handleRemove}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${exercise.exerciseName} from routine`}
        >
          <Ionicons name="trash-outline" size={18} color={colors.error} />
          <Text style={styles.removeButtonText}>Remove</Text>
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Save ${currentSets} sets of ${currentReps} reps`}
        >
          <Ionicons name="checkmark" size={18} color={colors.background} />
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 12,
      overflow: 'hidden',
    },
    cardExpanded: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    collapsedContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    expandedHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    exerciseNumber: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.primary,
      width: 28,
    },
    exerciseInfo: {
      flex: 1,
      marginLeft: 4,
    },
    exerciseName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    exerciseTarget: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    collapsedActions: {
      marginLeft: 8,
    },
    editSection: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    presetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    presetButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
      minWidth: 48,
      alignItems: 'center',
    },
    presetButtonSelected: {
      backgroundColor: colors.primary,
    },
    presetButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    presetButtonTextSelected: {
      color: colors.background,
    },
    keyboardButton: {
      width: 44,
      height: 44,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
      justifyContent: 'center',
      alignItems: 'center',
    },
    manualInput: {
      width: 60,
      height: 44,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 2,
      borderColor: colors.primary,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 12,
    },
    reorderButtons: {
      flexDirection: 'row',
      gap: 4,
    },
    reorderButton: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
      justifyContent: 'center',
      alignItems: 'center',
    },
    reorderButtonDisabled: {
      opacity: 0.5,
    },
    removeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
      gap: 4,
    },
    removeButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.error,
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      gap: 6,
    },
    saveButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.background,
    },
  });
