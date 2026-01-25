/**
 * Phase 2E: % of TM calculator (Elite). Pick 65–90% → fill weight.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';

const PERCENT_PRESETS = [65, 70, 75, 80, 85, 90] as const;

interface PercentageCalculatorModalProps {
  visible: boolean;
  tmKg: number;
  weightUnit: 'KG' | 'LBS';
  onClose: () => void;
  onConfirm: (weightKg: number) => void;
}

export default function PercentageCalculatorModal({
  visible,
  tmKg,
  weightUnit,
  onClose,
  onConfirm,
}: PercentageCalculatorModalProps) {
  const colors = useTheme();
  const [customPercent, setCustomPercent] = useState('');

  const handleSelect = useCallback(
    (pct: number) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const weightKg = Math.round((tmKg * (pct / 100)) * 10) / 10;
      onConfirm(weightKg);
      onClose();
    },
    [tmKg, onConfirm, onClose]
  );

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  const handleCustomSubmit = useCallback(() => {
    const pct = parseInt(customPercent, 10);
    if (Number.isNaN(pct) || pct < 1 || pct > 100) return;
    handleSelect(pct);
  }, [customPercent, handleSelect]);

  const displayWeight = (pct: number) => {
    const kg = (tmKg * (pct / 100));
    if (weightUnit === 'LBS') {
      return `${Math.round(kg * 2.20462)} lbs`;
    }
    return `${kg.toFixed(1)} kg`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Close percentage calculator"
          >
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            % of TM
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            TM: {tmKg.toFixed(1)} kg. Select % to fill weight.
          </Text>

          <View style={styles.chips}>
            {PERCENT_PRESETS.map((pct) => (
              <TouchableOpacity
                key={pct}
                style={[styles.chip, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                onPress={() => handleSelect(pct)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`${pct} percent, ${displayWeight(pct)}`}
              >
                <Text style={[styles.chipPct, { color: colors.primary }]}>{pct}%</Text>
                <Text style={[styles.chipWeight, { color: colors.textSecondary }]}>
                  {displayWeight(pct)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.customRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.customLabel, { color: colors.textSecondary }]}>Custom %</Text>
            <TextInput
              style={[styles.customInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.textPrimary }]}
              value={customPercent}
              onChangeText={(t) => setCustomPercent(t.replace(/[^0-9]/g, '').slice(0, 3))}
              placeholder="e.g. 72"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              accessible={true}
              accessibilityLabel="Custom percent"
            />
            <TouchableOpacity
              style={[styles.useBtn, { backgroundColor: colors.primary }]}
              onPress={handleCustomSubmit}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Use custom percent"
            >
              <Text style={[styles.useBtnText, { color: colors.background }]}>Use</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
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
    padding: 16,
  },
  hint: {
    fontSize: 14,
    marginBottom: 16,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 100,
  },
  chipPct: {
    fontSize: 16,
    fontWeight: '700',
  },
  chipWeight: {
    fontSize: 13,
    marginTop: 2,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  customLabel: {
    fontSize: 14,
  },
  customInput: {
    width: 80,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
  },
  useBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  useBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
