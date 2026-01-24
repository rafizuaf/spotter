/**
 * Phase 2D: Import preview modal – summary and confirm before background import.
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useImportStore } from '../stores/importStore';
import { getButtonA11yProps } from '../utils/accessibility';
import type { ImportPreview } from '../services/importers';

interface ImportPreviewModalProps {
  visible: boolean;
  preview: ImportPreview;
  onClose: () => void;
  onConfirm: () => void;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString();
}

export default function ImportPreviewModal({
  visible,
  preview,
  onClose,
  onConfirm,
}: ImportPreviewModalProps) {
  const colors = useTheme();
  const isImporting = useImportStore((s) => s.isImporting);

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={onClose}
            {...getButtonA11yProps('Close', 'Close preview without importing')}
          >
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Import Preview
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content}>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Summary
            </Text>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Source
              </Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {preview.source === 'hevy' ? 'Hevy' : 'CSV'}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Workouts
              </Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {preview.totalWorkouts}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Total Sets
              </Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {preview.totalSets}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Date Range
              </Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {formatDate(preview.dateRange.start)} – {formatDate(preview.dateRange.end)}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Unique Exercises
              </Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {preview.uniqueExercises}
              </Text>
            </View>
          </View>

          {preview.unmatchedExercises.length > 0 && (
            <View
              style={[
                styles.card,
                styles.warningCard,
                { backgroundColor: colors.surface, borderLeftColor: colors.warning },
              ]}
            >
              <View style={styles.warningHeader}>
                <Ionicons name="warning" size={20} color={colors.warning} />
                <Text
                  style={[styles.cardTitle, { color: colors.warning, marginLeft: 8 }]}
                >
                  New Exercises ({preview.unmatchedExercises.length})
                </Text>
              </View>
              <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                These exercises will be created as custom exercises:
              </Text>
              {preview.unmatchedExercises.slice(0, 5).map((name, i) => (
                <Text
                  key={i}
                  style={[styles.exerciseName, { color: colors.textPrimary }]}
                >
                  • {name}
                </Text>
              ))}
              {preview.unmatchedExercises.length > 5 && (
                <Text style={[styles.moreText, { color: colors.textMuted }]}>
                  +{preview.unmatchedExercises.length - 5} more
                </Text>
              )}
            </View>
          )}

          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Recent Workouts
            </Text>
            {preview.workouts.slice(0, 3).map((workout, i) => (
              <View
                key={i}
                style={[styles.workoutPreview, { borderBottomColor: colors.border }]}
              >
                <Text style={[styles.workoutName, { color: colors.textPrimary }]}>
                  {workout.name}
                </Text>
                <Text style={[styles.workoutDate, { color: colors.textSecondary }]}>
                  {formatDate(workout.startedAt)} • {workout.exercises.length} exercises
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={[styles.actions, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
            onPress={onClose}
            disabled={isImporting}
            {...getButtonA11yProps('Cancel', 'Close without importing')}
          >
            <Text style={[styles.buttonText, { color: colors.textPrimary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              styles.confirmButton,
              { backgroundColor: colors.primary },
              isImporting && styles.buttonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={isImporting}
            {...getButtonA11yProps(
              isImporting ? 'Import in progress' : 'Import',
              isImporting ? 'Please wait' : 'Start import in background'
            )}
          >
            <Text
              style={[
                styles.buttonText,
                { color: colors.background },
                isImporting && styles.buttonTextDisabled,
              ]}
            >
              {isImporting ? 'Importing…' : 'Import'}
            </Text>
          </TouchableOpacity>
        </View>
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
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 24,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 14,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  warningCard: {
    borderLeftWidth: 4,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 14,
    paddingVertical: 2,
  },
  moreText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  workoutPreview: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  workoutName: {
    fontSize: 14,
    fontWeight: '600',
  },
  workoutDate: {
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {},
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    opacity: 0.8,
  },
});
