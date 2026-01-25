import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';
import {
  useExerciseHistory,
  getWeightPresets,
  REP_PRESETS,
  getDefaultReps,
} from '../hooks/useExerciseHistory';
import PlateCalculatorModal from './PlateCalculatorModal';
import PercentageCalculatorModal from './PercentageCalculatorModal';
import type { Colors } from '../utils/colors';
import type { Gender } from '../constants/startingWeights';

interface QuickSelectSetRowProps {
  /** Set index (1, 2, 3, ...) */
  setIndex: number;
  /** The exercise entry ID from workoutStore */
  exerciseEntryId: string;
  /** The exercise ID for history lookup */
  exerciseId: string;
  /** The exercise name for starting weight lookup */
  exerciseName: string;
  /** Current weight value (as string) */
  currentWeight: string;
  /** Current reps value (as string) */
  currentReps: string;
  /** Whether the set is marked complete */
  isCompleted: boolean;
  /** User's preferred weight unit */
  weightUnit: 'KG' | 'LBS';
  /** User's workout mode */
  workoutMode: 'SIMPLE' | 'FULL';
  /** User's gender for starting weight suggestions */
  userGender: Gender;
  /** Current workout ID (to exclude from history) */
  currentWorkoutId?: string | null;
  /** Weight from the previous set in this workout (for carry-forward) */
  previousSetWeight?: string | null;
  /** Reps from the previous set in this workout (for carry-forward) */
  previousSetReps?: string | null;
  /** RPE value (for Full Mode) */
  rpe?: string;
  /** RIR value (for Full Mode) */
  rir?: string;
  /** Callback when weight changes */
  onWeightChange: (weight: string) => void;
  /** Callback when reps changes */
  onRepsChange: (reps: string) => void;
  /** Callback when RPE changes (Full Mode only) */
  onRpeChange?: (rpe: string) => void;
  /** Callback when set is marked complete */
  onComplete: () => void;
  /** Phase 2E: Elite + TM set → show % calculator (optional) */
  canUsePercentCalculator?: boolean;
  /** Phase 2E: Training max kg for this exercise (optional) */
  tmKg?: number | null;
}

/**
 * QuickSelectSetRow Component
 *
 * A 3-tap set logging interface:
 * 1. Tap weight preset (or manual entry)
 * 2. Tap reps preset (or manual entry)
 * 3. Tap complete button
 *
 * Features:
 * - Smart weight presets based on history
 * - Quick-select reps buttons (5, 8, 10, 12, 15)
 * - Manual entry fallback via keyboard icon
 * - Haptic feedback on selection
 * - Accessibility support
 */
export default function QuickSelectSetRow({
  setIndex,
  exerciseId,
  exerciseName,
  currentWeight,
  currentReps,
  isCompleted,
  weightUnit,
  workoutMode,
  userGender,
  currentWorkoutId,
  previousSetWeight,
  previousSetReps,
  rpe,
  onWeightChange,
  onRepsChange,
  onRpeChange,
  onComplete,
  canUsePercentCalculator,
  tmKg,
}: QuickSelectSetRowProps) {
  const colors = useTheme();
  const styles = createStyles(colors);

  // State for manual entry mode
  const [showManualWeight, setShowManualWeight] = useState(false);
  const [showManualReps, setShowManualReps] = useState(false);
  const [showPlateCalculator, setShowPlateCalculator] = useState(false);
  const [showPercentCalculator, setShowPercentCalculator] = useState(false);

  // Refs for manual input
  const weightInputRef = useRef<TextInput>(null);
  const repsInputRef = useRef<TextInput>(null);

  // Animate selection
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Fetch exercise history
  const { lastWorkoutWeight, lastWorkoutReps, suggestedWeight, isLoading } =
    useExerciseHistory(exerciseId, exerciseName, userGender, currentWorkoutId);

  // Determine the last set's weight in this workout (carry forward from previous set)
  const lastSetWeight = previousSetWeight ? parseFloat(previousSetWeight) : null;
  const lastSetReps = previousSetReps ? parseInt(previousSetReps, 10) : null;

  // Generate weight presets
  const weightPresets = getWeightPresets(
    lastSetWeight,
    lastWorkoutWeight,
    suggestedWeight,
    weightUnit
  );

  // Get default reps selection
  const defaultReps = getDefaultReps(lastSetReps, lastWorkoutReps);

  // Parse current values
  const selectedWeight = currentWeight ? parseFloat(currentWeight) : null;
  const selectedReps = currentReps ? parseInt(currentReps, 10) : null;

  // Check if ready to complete
  const canComplete = selectedWeight !== null && selectedReps !== null;

  // Handle weight selection
  const handleWeightSelect = useCallback(
    (weight: number) => {
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      // Trigger a subtle animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Convert to canonical KG if needed
      const weightKg = weightUnit === 'LBS' ? weight / 2.20462 : weight;
      onWeightChange(weightKg.toFixed(1));
      setShowManualWeight(false);
    },
    [onWeightChange, weightUnit, scaleAnim]
  );

  // Handle reps selection
  const handleRepsSelect = useCallback(
    (reps: number) => {
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      onRepsChange(reps.toString());
      setShowManualReps(false);
    },
    [onRepsChange, scaleAnim]
  );

  // Handle weight adjustment (+/- 2.5kg or 5lbs)
  const handleWeightAdjust = useCallback(
    (delta: number) => {
      const currentWeightNum = selectedWeight ?? 0;
      const adjustment = weightUnit === 'KG' ? delta : delta / 2.20462;
      const newWeight = Math.max(0, currentWeightNum + adjustment);
      onWeightChange(newWeight.toFixed(1));
    },
    [selectedWeight, weightUnit, onWeightChange]
  );

  // Handle complete tap
  const handleCompleteTap = useCallback(() => {
    if (!canComplete) return;

    // Strong haptic feedback for completion
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    onComplete();
  }, [canComplete, onComplete, scaleAnim]);

  // Show manual weight input
  const toggleManualWeight = useCallback(() => {
    setShowManualWeight(!showManualWeight);
    if (!showManualWeight) {
      setTimeout(() => weightInputRef.current?.focus(), 100);
    }
  }, [showManualWeight]);

  // Show manual reps input
  const toggleManualReps = useCallback(() => {
    setShowManualReps(!showManualReps);
    if (!showManualReps) {
      setTimeout(() => repsInputRef.current?.focus(), 100);
    }
  }, [showManualReps]);

  // Format weight for display
  const formatWeight = (weight: number): string => {
    if (weightUnit === 'LBS') {
      return `${Math.round(weight)}`;
    }
    // Show decimal only if needed
    return weight % 1 === 0 ? `${weight}` : weight.toFixed(1);
  };

  // Get display weight (convert from KG if stored in KG)
  const getDisplayWeight = (weightKg: number): number => {
    return weightUnit === 'LBS' ? Math.round(weightKg * 2.20462) : weightKg;
  };

  // Render completed set (collapsed view)
  if (isCompleted) {
    return (
      <View style={styles.completedRow}>
        <Text style={styles.setNumber}>{setIndex}</Text>
        <View style={styles.completedValues}>
          <Text style={styles.completedWeight}>
            {selectedWeight !== null
              ? `${formatWeight(getDisplayWeight(selectedWeight))} ${weightUnit.toLowerCase()}`
              : '-'}
          </Text>
          <Text style={styles.completedSeparator}>x</Text>
          <Text style={styles.completedReps}>
            {selectedReps !== null ? `${selectedReps} reps` : '-'}
          </Text>
        </View>
        <View style={styles.completedCheck}>
          <Ionicons name="checkmark-circle" size={28} color={colors.success} />
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      style={[styles.container, { transform: [{ scale: scaleAnim }] }]}
    >
      {/* Set Number */}
      <View style={styles.setNumberContainer}>
        <Text style={styles.setNumber}>{setIndex}</Text>
      </View>

      {/* Weight Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>WEIGHT ({weightUnit})</Text>

        {showManualWeight ? (
          <View style={styles.manualInputRow}>
            <TextInput
              ref={weightInputRef}
              style={styles.manualInput}
              value={currentWeight}
              onChangeText={onWeightChange}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              onSubmitEditing={() => {
                setShowManualWeight(false);
                repsInputRef.current?.focus();
              }}
              returnKeyType="next"
            />
            <TouchableOpacity
              style={styles.manualDoneButton}
              onPress={() => setShowManualWeight(false)}
            >
              <Ionicons name="checkmark" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.presetRow}>
            {weightPresets.map((weight, index) => {
              const displayWeight = formatWeight(weight);
              const isSelected =
                selectedWeight !== null &&
                Math.abs(getDisplayWeight(selectedWeight) - weight) < 0.1;

              return (
                <TouchableOpacity
                  key={`weight-${index}`}
                  style={[
                    styles.presetButton,
                    isSelected && styles.presetButtonSelected,
                  ]}
                  onPress={() => handleWeightSelect(weight)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${displayWeight} ${weightUnit}`}
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    style={[
                      styles.presetButtonText,
                      isSelected && styles.presetButtonTextSelected,
                    ]}
                  >
                    {displayWeight}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Adjustment buttons */}
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => handleWeightAdjust(weightUnit === 'KG' ? -2.5 : -5)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Decrease weight by ${weightUnit === 'KG' ? '2.5kg' : '5lbs'}`}
            >
              <Text style={styles.adjustButtonText}>
                -{weightUnit === 'KG' ? '2.5' : '5'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => handleWeightAdjust(weightUnit === 'KG' ? 2.5 : 5)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Increase weight by ${weightUnit === 'KG' ? '2.5kg' : '5lbs'}`}
            >
              <Text style={styles.adjustButtonText}>
                +{weightUnit === 'KG' ? '2.5' : '5'}
              </Text>
            </TouchableOpacity>

            {/* Manual entry toggle */}
            <TouchableOpacity
              style={styles.keyboardButton}
              onPress={toggleManualWeight}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Enter weight manually"
            >
              <Ionicons name="keypad-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Plate calculator button */}
            <TouchableOpacity
              style={styles.plateCalcButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setShowPlateCalculator(true);
              }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Open plate calculator"
            >
              <Ionicons name="barbell-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* % of TM button (Elite only, when TM set) */}
            {canUsePercentCalculator && tmKg != null && tmKg > 0 && (
              <TouchableOpacity
                style={styles.plateCalcButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setShowPercentCalculator(true);
                }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Open percentage of TM calculator"
              >
                <Text style={[styles.percentButtonText, { color: colors.primary }]}>%</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Reps Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>REPS</Text>

        {showManualReps ? (
          <View style={styles.manualInputRow}>
            <TextInput
              ref={repsInputRef}
              style={styles.manualInput}
              value={currentReps}
              onChangeText={onRepsChange}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              onSubmitEditing={() => setShowManualReps(false)}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={styles.manualDoneButton}
              onPress={() => setShowManualReps(false)}
            >
              <Ionicons name="checkmark" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.presetRow}>
            {REP_PRESETS.map((reps) => {
              const isSelected = selectedReps === reps;
              const isDefault = defaultReps === reps && selectedReps === null;

              return (
                <TouchableOpacity
                  key={`reps-${reps}`}
                  style={[
                    styles.presetButton,
                    styles.repsButton,
                    isSelected && styles.presetButtonSelected,
                    isDefault && styles.presetButtonDefault,
                  ]}
                  onPress={() => handleRepsSelect(reps)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${reps} reps`}
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    style={[
                      styles.presetButtonText,
                      isSelected && styles.presetButtonTextSelected,
                    ]}
                  >
                    {reps}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Manual entry toggle */}
            <TouchableOpacity
              style={styles.keyboardButton}
              onPress={toggleManualReps}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Enter reps manually"
            >
              <Ionicons name="keypad-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* RPE (Full Mode only) */}
      {workoutMode === 'FULL' && onRpeChange && (
        <View style={styles.rpeSection}>
          <Text style={styles.sectionLabel}>RPE</Text>
          <TextInput
            style={styles.rpeInput}
            value={rpe || ''}
            onChangeText={onRpeChange}
            keyboardType="decimal-pad"
            placeholder="-"
            placeholderTextColor={colors.textMuted}
            maxLength={4}
          />
        </View>
      )}

      {/* Complete Button */}
      <TouchableOpacity
        style={[
          styles.completeButton,
          canComplete && styles.completeButtonReady,
        ]}
        onPress={handleCompleteTap}
        disabled={!canComplete}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={
          canComplete
            ? `Complete set ${setIndex} with ${selectedWeight} ${weightUnit} for ${selectedReps} reps`
            : 'Select weight and reps to complete set'
        }
        accessibilityState={{ disabled: !canComplete }}
      >
        <Ionicons
          name={canComplete ? 'checkmark-circle' : 'checkmark-circle-outline'}
          size={24}
          color={canComplete ? colors.background : colors.textMuted}
        />
        <Text
          style={[
            styles.completeButtonText,
            canComplete && styles.completeButtonTextReady,
          ]}
        >
          {canComplete ? 'COMPLETE' : 'SELECT WEIGHT & REPS'}
        </Text>
      </TouchableOpacity>

      {/* Plate Calculator Modal */}
      <PlateCalculatorModal
        visible={showPlateCalculator}
        initialWeight={selectedWeight ? getDisplayWeight(selectedWeight) : 0}
        weightUnit={weightUnit}
        onClose={() => setShowPlateCalculator(false)}
        onConfirm={(weight) => {
          // Convert display weight back to canonical KG if needed
          const weightKg = weightUnit === 'LBS' ? weight / 2.20462 : weight;
          onWeightChange(weightKg.toFixed(1));
          setShowPlateCalculator(false);
        }}
      />

      {/* % of TM Modal (Elite only) */}
      {canUsePercentCalculator && tmKg != null && tmKg > 0 && (
        <PercentageCalculatorModal
          visible={showPercentCalculator}
          tmKg={tmKg}
          weightUnit={weightUnit}
          onClose={() => setShowPercentCalculator(false)}
          onConfirm={(weightKg) => {
            onWeightChange(weightKg.toFixed(1));
            setShowPercentCalculator(false);
          }}
        />
      )}
    </Animated.View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
    },
    completedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.success,
      opacity: 0.8,
    },
    completedValues: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    completedWeight: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    completedSeparator: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    completedReps: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    completedCheck: {
      marginLeft: 8,
    },
    setNumberContainer: {
      position: 'absolute',
      top: 8,
      left: 12,
      backgroundColor: colors.surface,
      borderRadius: 12,
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    setNumber: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    section: {
      marginBottom: 16,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      letterSpacing: 1,
      marginBottom: 8,
      marginLeft: 2,
    },
    presetRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    presetButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.surface,
      minWidth: 52,
      alignItems: 'center',
    },
    repsButton: {
      minWidth: 44,
      paddingHorizontal: 12,
    },
    presetButtonSelected: {
      backgroundColor: colors.primary,
    },
    presetButtonDefault: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderStyle: 'dashed',
    },
    presetButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    presetButtonTextSelected: {
      color: colors.background,
    },
    adjustButton: {
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    adjustButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    keyboardButton: {
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    plateCalcButton: {
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    percentButtonText: {
      fontSize: 14,
      fontWeight: '700',
    },
    manualInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    manualInput: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 12,
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      textAlign: 'center',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    manualDoneButton: {
      padding: 12,
      borderRadius: 10,
      backgroundColor: colors.surface,
    },
    rpeSection: {
      marginBottom: 16,
    },
    rpeInput: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 12,
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      textAlign: 'center',
      width: 80,
    },
    completeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 2,
      borderColor: colors.border,
    },
    completeButtonReady: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    completeButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textMuted,
      letterSpacing: 0.5,
    },
    completeButtonTextReady: {
      color: colors.background,
    },
  });
