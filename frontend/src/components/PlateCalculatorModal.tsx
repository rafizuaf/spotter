import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';
import {
  calculatePlatesForWeight,
  formatPlateList,
  getPlateColor,
  getPlateHeightMultiplier,
  getPlateWidthMultiplier,
  getBarbellWeight,
  type PlateResult,
} from '../utils/plateCalculator';
import type { Colors } from '../utils/colors';

interface PlateCalculatorModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Initial target weight to calculate */
  initialWeight: number;
  /** Weight unit (KG or LBS) */
  weightUnit: 'KG' | 'LBS';
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when user confirms a weight */
  onConfirm: (weight: number) => void;
}

const MAX_PLATE_HEIGHT = 80;
const MAX_PLATE_WIDTH = 24;
const BARBELL_HEIGHT = 16;

/**
 * PlateCalculatorModal
 *
 * A modal that shows users what plates to load on a barbell for a target weight.
 * Features:
 * - Visual barbell with colored plates
 * - Editable target weight
 * - Shows plates per side
 * - Handles edge cases (weight less than bar, impossible weights)
 */
export default function PlateCalculatorModal({
  visible,
  initialWeight,
  weightUnit,
  onClose,
  onConfirm,
}: PlateCalculatorModalProps) {
  const colors = useTheme();
  const styles = createStyles(colors);

  const [targetWeight, setTargetWeight] = useState(initialWeight.toString());
  const barbellWeight = getBarbellWeight(weightUnit);

  // Reset when modal opens with new weight
  useEffect(() => {
    if (visible) {
      setTargetWeight(initialWeight > 0 ? initialWeight.toString() : barbellWeight.toString());
    }
  }, [visible, initialWeight, barbellWeight]);

  // Calculate plates based on target weight
  const plateResult = useMemo((): PlateResult => {
    const weight = parseFloat(targetWeight) || 0;
    return calculatePlatesForWeight(weight, weightUnit);
  }, [targetWeight, weightUnit]);

  const handleWeightChange = useCallback((text: string) => {
    // Allow only valid number input
    const cleaned = text.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return;
    }
    setTargetWeight(cleaned);
  }, []);

  const handleAdjustWeight = useCallback((delta: number) => {
    Haptics.selectionAsync();
    const current = parseFloat(targetWeight) || barbellWeight;
    const newWeight = Math.max(barbellWeight, current + delta);
    setTargetWeight(newWeight.toString());
  }, [targetWeight, barbellWeight]);

  const handleConfirm = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm(plateResult.achievedWeight);
  }, [plateResult.achievedWeight, onConfirm]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  // Render a single plate
  const renderPlate = (weight: number, index: number, isLeft: boolean) => {
    const color = getPlateColor(weight, weightUnit);
    const heightMultiplier = getPlateHeightMultiplier(weight, weightUnit);
    const widthMultiplier = getPlateWidthMultiplier(weight, weightUnit);

    const plateHeight = MAX_PLATE_HEIGHT * heightMultiplier;
    const plateWidth = MAX_PLATE_WIDTH * widthMultiplier;

    return (
      <View
        key={`${isLeft ? 'L' : 'R'}-${index}-${weight}`}
        style={[
          styles.plate,
          {
            backgroundColor: color,
            height: plateHeight,
            width: plateWidth,
            marginLeft: isLeft ? 2 : 0,
            marginRight: isLeft ? 0 : 2,
          },
        ]}
        accessible={true}
        accessibilityLabel={`${weight} ${weightUnit.toLowerCase()} plate`}
      >
        <Text
          style={[
            styles.plateLabel,
            { color: color === '#FAFAFA' ? '#333' : '#FFF' },
          ]}
          numberOfLines={1}
        >
          {weight}
        </Text>
      </View>
    );
  };

  const unitLabel = weightUnit.toLowerCase();
  const increment = weightUnit === 'KG' ? 2.5 : 5;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Close plate calculator"
          >
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Plate Calculator
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Target Weight Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              TARGET WEIGHT
            </Text>
            <View style={styles.weightInputRow}>
              <TouchableOpacity
                style={[styles.adjustButton, { backgroundColor: colors.surfaceElevated }]}
                onPress={() => handleAdjustWeight(-increment)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Decrease by ${increment} ${unitLabel}`}
              >
                <Text style={[styles.adjustButtonText, { color: colors.textPrimary }]}>
                  -{increment}
                </Text>
              </TouchableOpacity>

              <View style={[styles.weightInputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.weightInput, { color: colors.textPrimary }]}
                  value={targetWeight}
                  onChangeText={handleWeightChange}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                  accessible={true}
                  accessibilityLabel={`Target weight in ${unitLabel}`}
                />
                <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>
                  {unitLabel}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.adjustButton, { backgroundColor: colors.surfaceElevated }]}
                onPress={() => handleAdjustWeight(increment)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Increase by ${increment} ${unitLabel}`}
              >
                <Text style={[styles.adjustButtonText, { color: colors.textPrimary }]}>
                  +{increment}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Barbell Info */}
          <View style={[styles.barbellInfo, { backgroundColor: colors.surface }]}>
            <Ionicons name="barbell-outline" size={20} color={colors.primary} />
            <Text style={[styles.barbellInfoText, { color: colors.textSecondary }]}>
              Olympic Barbell: {barbellWeight}{unitLabel}
            </Text>
          </View>

          {/* Error Message */}
          {plateResult.error && (
            <View style={[styles.errorContainer, { backgroundColor: colors.error + '20' }]}>
              <Ionicons name="warning-outline" size={20} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>
                {plateResult.error}
              </Text>
            </View>
          )}

          {/* Plate Visualization */}
          {!plateResult.error && (
            <View style={styles.visualizationSection}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                PLATE LOADING
              </Text>

              <View style={styles.barbellContainer}>
                {/* Left side plates (reversed for visual) */}
                <View style={styles.platesContainer}>
                  {[...plateResult.platesPerSide].reverse().map((weight, index) =>
                    renderPlate(weight, index, true)
                  )}
                </View>

                {/* Barbell */}
                <View style={[styles.barbell, { backgroundColor: colors.textMuted }]}>
                  <View style={[styles.barbellCollar, { backgroundColor: colors.textSecondary }]} />
                  <View style={styles.barbellCenter} />
                  <View style={[styles.barbellCollar, { backgroundColor: colors.textSecondary }]} />
                </View>

                {/* Right side plates */}
                <View style={styles.platesContainer}>
                  {plateResult.platesPerSide.map((weight, index) =>
                    renderPlate(weight, index, false)
                  )}
                </View>
              </View>

              {/* Plates Summary */}
              <View style={[styles.summaryContainer, { backgroundColor: colors.surface }]}>
                {plateResult.platesPerSide.length > 0 ? (
                  <>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                      Each Side:
                    </Text>
                    <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                      {formatPlateList(plateResult.platesPerSide, weightUnit)}
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.summaryValue, { color: colors.textSecondary }]}>
                    Empty bar - no plates needed
                  </Text>
                )}
              </View>

              {/* Total Breakdown */}
              <View style={[styles.breakdownContainer, { borderColor: colors.border }]}>
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
                    Barbell
                  </Text>
                  <Text style={[styles.breakdownValue, { color: colors.textPrimary }]}>
                    {barbellWeight}{unitLabel}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
                    Plates (total)
                  </Text>
                  <Text style={[styles.breakdownValue, { color: colors.textPrimary }]}>
                    {plateResult.totalPlateWeight}{unitLabel}
                  </Text>
                </View>
                <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                  <Text style={[styles.breakdownTotalLabel, { color: colors.textPrimary }]}>
                    Total
                  </Text>
                  <Text style={[styles.breakdownTotalValue, { color: colors.primary }]}>
                    {plateResult.achievedWeight}{unitLabel}
                  </Text>
                </View>
              </View>

              {/* Remainder Warning */}
              {!plateResult.isExact && plateResult.remainder > 0 && (
                <View style={[styles.warningContainer, { backgroundColor: colors.warning + '20' }]}>
                  <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
                  <Text style={[styles.warningText, { color: colors.warning }]}>
                    Closest achievable weight. Missing {plateResult.remainder}{unitLabel}
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Confirm Button */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              { backgroundColor: plateResult.error ? colors.textMuted : colors.primary },
            ]}
            onPress={handleConfirm}
            disabled={!!plateResult.error}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Use ${plateResult.achievedWeight} ${unitLabel}`}
            accessibilityState={{ disabled: !!plateResult.error }}
          >
            <Ionicons name="checkmark" size={20} color={colors.background} />
            <Text style={[styles.confirmButtonText, { color: colors.background }]}>
              Use {plateResult.achievedWeight}{unitLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
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
    closeButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    headerSpacer: {
      width: 32,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: 16,
    },
    inputSection: {
      marginBottom: 16,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    weightInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    adjustButton: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
    },
    adjustButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    weightInputContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    weightInput: {
      flex: 1,
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    unitLabel: {
      fontSize: 16,
      marginLeft: 8,
    },
    barbellInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
      gap: 8,
    },
    barbellInfoText: {
      fontSize: 14,
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      marginBottom: 16,
      gap: 12,
    },
    errorText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
    },
    visualizationSection: {
      marginTop: 8,
    },
    barbellContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 24,
      marginBottom: 16,
    },
    platesContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    plate: {
      borderRadius: 4,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.2)',
    },
    plateLabel: {
      fontSize: 8,
      fontWeight: 'bold',
      transform: [{ rotate: '-90deg' }],
    },
    barbell: {
      flexDirection: 'row',
      alignItems: 'center',
      height: BARBELL_HEIGHT,
      minWidth: 60,
    },
    barbellCollar: {
      width: 8,
      height: BARBELL_HEIGHT + 8,
      borderRadius: 2,
    },
    barbellCenter: {
      flex: 1,
      height: 8,
      backgroundColor: '#666',
    },
    summaryContainer: {
      padding: 16,
      borderRadius: 12,
      marginBottom: 16,
    },
    summaryLabel: {
      fontSize: 12,
      marginBottom: 4,
    },
    summaryValue: {
      fontSize: 16,
      fontWeight: '600',
    },
    breakdownContainer: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    breakdownRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    breakdownLabel: {
      fontSize: 14,
    },
    breakdownValue: {
      fontSize: 14,
      fontWeight: '500',
    },
    breakdownTotal: {
      marginTop: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.1)',
      marginBottom: 0,
    },
    breakdownTotalLabel: {
      fontSize: 16,
      fontWeight: '600',
    },
    breakdownTotalValue: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    warningContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      gap: 8,
    },
    warningText: {
      flex: 1,
      fontSize: 13,
    },
    footer: {
      padding: 16,
      borderTopWidth: 1,
    },
    confirmButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderRadius: 12,
      gap: 8,
    },
    confirmButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
  });
