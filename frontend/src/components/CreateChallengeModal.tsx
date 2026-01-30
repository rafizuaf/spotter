/**
 * CreateChallengeModal Component
 * Phase 2G: Social & Competition - Challenge System
 * 
 * Modal for creating a new challenge
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import type { ChallengeType, ChallengeVisibility } from '../db/models/Challenge';
import { CHALLENGE_TYPES, CHALLENGE_VISIBILITIES } from '../db/models/Challenge';
import { useChallengeStore } from '../stores/challengeStore';
import { logError } from '../utils/errorHandler';

interface CreateChallengeModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateChallengeModal({
  visible,
  onClose,
  onSuccess,
}: CreateChallengeModalProps) {
  const colors = useTheme();
  const { createChallenge, loading, error, clearError } = useChallengeStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [challengeType, setChallengeType] = useState<ChallengeType>('MOST_VOLUME');
  const [targetValue, setTargetValue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [visibility, setVisibility] = useState<ChallengeVisibility>('FOLLOWERS');
  const [maxParticipants, setMaxParticipants] = useState('50');

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    if (!startDate || !endDate) {
      Alert.alert('Error', 'Start and end dates are required');
      return;
    }

    if (challengeType === 'FIRST_TO_TARGET' && !targetValue) {
      Alert.alert('Error', 'Target value is required for "Race to Target" challenges');
      return;
    }

    try {
      clearError();
      const challenge = await createChallenge({
        title: title.trim(),
        description: description.trim() || undefined,
        challenge_type: challengeType,
        target_value: challengeType === 'FIRST_TO_TARGET' ? parseInt(targetValue, 10) : undefined,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        visibility,
        max_participants: parseInt(maxParticipants, 10) || 50,
      });

      // Reset form
      setTitle('');
      setDescription('');
      setChallengeType('MOST_VOLUME');
      setTargetValue('');
      setStartDate('');
      setEndDate('');
      setVisibility('FOLLOWERS');
      setMaxParticipants('50');

      onSuccess?.();
      onClose();
    } catch (err) {
      // Error is handled by store
      logError(err, 'CreateChallengeModal_create');
    }
  };

  const handleClose = () => {
    clearError();
    onClose();
  };

  // Set default dates (today and 7 days from now)
  React.useEffect(() => {
    if (visible && !startDate && !endDate) {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      setStartDate(today.toISOString().split('T')[0]);
      setEndDate(nextWeek.toISOString().split('T')[0]);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Create Challenge</Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {error && (
            <View style={[styles.errorContainer, { backgroundColor: colors.error + '20' }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., January Volume Challenge"
              placeholderTextColor={colors.textMuted}
              maxLength={100}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Description</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Optional description..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Challenge Type *</Text>
            <View style={styles.typeGrid}>
              {CHALLENGE_TYPES.map((type) => {
                const labels: Record<ChallengeType, string> = {
                  MOST_VOLUME: 'Most Volume',
                  MOST_WORKOUTS: 'Most Workouts',
                  MOST_SETS: 'Most Sets',
                  FIRST_TO_TARGET: 'Race to Target',
                };
                const isSelected = challengeType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setChallengeType(type)}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        { color: isSelected ? colors.background : colors.textPrimary },
                      ]}
                    >
                      {labels[type]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {challengeType === 'FIRST_TO_TARGET' && (
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Target Value *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={targetValue}
                onChangeText={setTargetValue}
                placeholder="e.g., 10000 (kg)"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Start Date *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>End Date *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Visibility</Text>
            <View style={styles.visibilityContainer}>
              {CHALLENGE_VISIBILITIES.map((vis) => {
                const labels: Record<ChallengeVisibility, string> = {
                  PUBLIC: 'Public',
                  FOLLOWERS: 'Followers Only',
                  INVITE_ONLY: 'Invite Only',
                };
                const isSelected = visibility === vis;
                return (
                  <TouchableOpacity
                    key={vis}
                    style={[
                      styles.visibilityButton,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setVisibility(vis)}
                  >
                    <Text
                      style={[
                        styles.visibilityButtonText,
                        { color: isSelected ? colors.background : colors.textPrimary },
                      ]}
                    >
                      {labels[vis]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Max Participants</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
              value={maxParticipants}
              onChangeText={setMaxParticipants}
              placeholder="50"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
          </View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border }]}
            onPress={handleClose}
            disabled={loading}
          >
            <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={handleCreate}
            disabled={loading || !title.trim()}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Text style={[styles.createButtonText, { color: colors.background }]}>Create</Text>
            )}
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
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  visibilityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  visibilityButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  visibilityButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
