import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import ExerciseVideoPlayer from './ExerciseVideoPlayer';
import { hasVideoDemo } from '../utils/videoUrl';
import type Exercise from '../db/models/Exercise';

interface ExerciseDetailModalProps {
  visible: boolean;
  exercise: Exercise | null;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
}

export default function ExerciseDetailModal({
  visible,
  exercise,
  onClose,
  onSelect,
}: ExerciseDetailModalProps) {
  const colors = useTheme();

  if (!exercise) return null;

  const handleSelect = () => {
    onSelect(exercise);
    onClose();
  };

  const hasVideo = hasVideoDemo(exercise.videoUrl);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessible={true}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text
            style={[styles.headerTitle, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {exercise.name}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Video Player Section */}
          <View style={styles.videoSection}>
            <ExerciseVideoPlayer videoUrl={exercise.videoUrl} height={220} />
          </View>

          {/* Exercise Info Card */}
          <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="body-outline" size={20} color={colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                    Muscle Group
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                    {formatMuscleGroup(exercise.muscleGroup)}
                  </Text>
                </View>
              </View>
            </View>

            {exercise.equipmentBaseId && (
              <View
                style={[
                  styles.infoRowBorder,
                  { borderTopColor: colors.border },
                ]}
              >
                <View style={styles.infoItem}>
                  <Ionicons
                    name="barbell-outline"
                    size={20}
                    color={colors.primary}
                  />
                  <View style={styles.infoTextContainer}>
                    <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                      Equipment
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                      {formatEquipment(exercise.equipmentBaseId)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Instructions Section */}
          {exercise.instructions && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                How to Perform
              </Text>
              <Text style={[styles.instructionsText, { color: colors.textSecondary }]}>
                {exercise.instructions}
              </Text>
            </View>
          )}

          {/* Key Points Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Key Points
            </Text>
            <View style={styles.keyPointsList}>
              <KeyPoint
                color={colors.success}
                textColor={colors.textSecondary}
                text="Maintain proper form throughout the movement"
              />
              <KeyPoint
                color={colors.success}
                textColor={colors.textSecondary}
                text="Control the weight on both lifting and lowering phases"
              />
              <KeyPoint
                color={colors.success}
                textColor={colors.textSecondary}
                text="Breathe out during exertion, breathe in during release"
              />
              <KeyPoint
                color={colors.success}
                textColor={colors.textSecondary}
                text="Start with lighter weight to master the form"
              />
            </View>
          </View>

          {/* Video Availability Badge */}
          {!hasVideo && (
            <View style={[styles.noDemoBadge, { backgroundColor: colors.surface }]}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color={colors.textMuted}
              />
              <Text style={[styles.noDemoText, { color: colors.textMuted }]}>
                Video demo coming soon for this exercise
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer with Select Button */}
        <View
          style={[
            styles.footer,
            {
              borderTopColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.selectButton, { backgroundColor: colors.primary }]}
            onPress={handleSelect}
            accessible={true}
            accessibilityLabel={`Select ${exercise.name}`}
            accessibilityRole="button"
          >
            <Ionicons name="add" size={20} color={colors.background} />
            <Text style={[styles.selectButtonText, { color: colors.background }]}>
              Select Exercise
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// Helper Component
interface KeyPointProps {
  color: string;
  textColor: string;
  text: string;
}

function KeyPoint({ color, textColor, text }: KeyPointProps) {
  return (
    <View style={styles.keyPoint}>
      <Ionicons
        name="checkmark-circle"
        size={18}
        color={color}
        style={styles.keyPointIcon}
      />
      <Text style={[styles.keyPointText, { color: textColor }]}>{text}</Text>
    </View>
  );
}

// Helper Functions
function formatMuscleGroup(muscleGroup: string | null | undefined): string {
  if (!muscleGroup) return 'General';
  return muscleGroup
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatEquipment(equipmentId: string): string {
  // Map equipment IDs to display names
  const equipmentMap: Record<string, string> = {
    '11111111-1111-1111-1111-111111111001': 'Olympic Barbell',
    '11111111-1111-1111-1111-111111111002': 'Standard Barbell',
    '11111111-1111-1111-1111-111111111003': 'EZ Curl Bar',
    '11111111-1111-1111-1111-111111111004': 'Trap Bar',
    '11111111-1111-1111-1111-111111111007': 'Dumbbell',
    '11111111-1111-1111-1111-111111111008': 'Kettlebell',
    '11111111-1111-1111-1111-111111111009': 'Cable Machine',
    '11111111-1111-1111-1111-111111111011': 'Bodyweight',
    '11111111-1111-1111-1111-111111111013': 'Machine',
  };
  return equipmentMap[equipmentId] || 'Equipment';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  videoSection: {
    marginBottom: 16,
  },
  infoCard: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  infoRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoRowBorder: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoTextContainer: {
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 15,
    lineHeight: 24,
  },
  keyPointsList: {
    gap: 12,
  },
  keyPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  keyPointIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  keyPointText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  noDemoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  noDemoText: {
    marginLeft: 8,
    fontSize: 14,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
