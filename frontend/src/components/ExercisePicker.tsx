import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { database, exercisesCollection, userSettingsCollection } from '../db';
import { useAuthStore } from '../stores/authStore';
import { v4 as uuid } from 'uuid';
import type Exercise from '../db/models/Exercise';
import type UserSettings from '../db/models/UserSettings';
import colors, { withOpacity } from '@/utils/colors';
import {
  getSuggestedWeight,
  formatSuggestedWeight,
  type Gender,
} from '../constants/startingWeights';
import { hasVideoDemo } from '../utils/videoUrl';
import { logError } from '../utils/errorHandler';
import ExerciseDetailModal from './ExerciseDetailModal';

interface ExercisePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (exerciseId: string, exerciseName: string) => void;
}

const MUSCLE_GROUPS = [
  'All',
  'Chest',
  'Back',
  'Shoulders',
  'Arms',
  'Legs',
  'Core',
  'Cardio',
];

export default function ExercisePicker({
  visible,
  onClose,
  onSelectExercise,
}: ExercisePickerProps) {
  const { user } = useAuthStore();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('All');
  const [loading, setLoading] = useState(true);
  const [userGender, setUserGender] = useState<Gender>('OTHER');
  const [weightUnit, setWeightUnit] = useState<'KG' | 'LBS'>('KG');

  // Exercise detail modal state
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedExerciseForDetail, setSelectedExerciseForDetail] = useState<Exercise | null>(null);

  // Custom exercise creation state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [customExerciseName, setCustomExerciseName] = useState('');
  const [customMuscleGroup, setCustomMuscleGroup] = useState('Chest');
  const [customInstructions, setCustomInstructions] = useState('');

  useEffect(() => {
    if (visible) {
      loadExercises();
      loadUserSettings();
    }
  }, [visible]);

  const loadUserSettings = async () => {
    if (!user) return;
    try {
      const settings = await userSettingsCollection
        .query(Q.where('user_id', user.id))
        .fetch();
      if (settings.length > 0) {
        const record = settings[0] as UserSettings;
        const gender = record.gender?.toUpperCase() as Gender;
        if (gender === 'MALE' || gender === 'FEMALE' || gender === 'OTHER') {
          setUserGender(gender);
        }
        const unit = record.weightUnitPreference?.toUpperCase();
        if (unit === 'KG' || unit === 'LBS') {
          setWeightUnit(unit);
        }
      }
    } catch (error) {
      logError(error, 'ExercisePicker_loadUserSettings');
    }
  };

  useEffect(() => {
    filterExercises();
  }, [exercises, searchQuery, selectedMuscleGroup]);

  const loadExercises = async () => {
    try {
      setLoading(true);
      const exerciseList = await exercisesCollection
        .query(Q.where('deleted_at', null))
        .fetch();
      setExercises(exerciseList.map(e => e as Exercise));
    } catch (error) {
      logError(error, 'ExercisePicker_loadExercises');
    } finally {
      setLoading(false);
    }
  };

  const filterExercises = () => {
    let filtered = exercises;

    // Filter by muscle group
    if (selectedMuscleGroup !== 'All') {
      filtered = filtered.filter(
        (ex) =>
          ex.muscleGroup?.toLowerCase() === selectedMuscleGroup.toLowerCase()
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((ex) =>
        ex.name.toLowerCase().includes(query)
      );
    }

    setFilteredExercises(filtered);
  };

  const handleSelectExercise = (exercise: Exercise) => {
    onSelectExercise(exercise.serverId, exercise.name);
    setSearchQuery('');
    setSelectedMuscleGroup('All');
    onClose();
  };

  const handleCreateCustomExercise = async () => {
    if (!customExerciseName.trim()) {
      Alert.alert('Error', 'Please enter an exercise name');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to create custom exercises');
      return;
    }

    try {
      const serverId = uuid();

      await database.write(async () => {
        const newExercise = await exercisesCollection.create((exercise) => {
          exercise.serverId = serverId;
          exercise.name = customExerciseName.trim();
          exercise.muscleGroup = customMuscleGroup;
          exercise.instructions = customInstructions.trim() || undefined;
          exercise.isCustom = true;
          exercise.createdByUserId = user.id;
        });

        // Immediately select the newly created exercise
        onSelectExercise(newExercise.serverId, newExercise.name);
      });

      // Reset form and close
      setCustomExerciseName('');
      setCustomMuscleGroup('Chest');
      setCustomInstructions('');
      setShowCreateForm(false);
      setSearchQuery('');
      setSelectedMuscleGroup('All');
      onClose();
    } catch (error) {
      logError(error, 'ExercisePicker_createCustomExercise');
      Alert.alert('Error', 'Failed to create custom exercise');
    }
  };

  const handleCancelCreate = () => {
    setCustomExerciseName('');
    setCustomMuscleGroup('Chest');
    setCustomInstructions('');
    setShowCreateForm(false);
  };

  const handleViewDemo = (exercise: Exercise) => {
    setSelectedExerciseForDetail(exercise);
    setDetailModalVisible(true);
  };

  const handleSelectFromDetail = (exercise: Exercise) => {
    onSelectExercise(exercise.serverId, exercise.name);
    setSearchQuery('');
    setSelectedMuscleGroup('All');
    setDetailModalVisible(false);
    onClose();
  };

  const renderExerciseItem = ({ item }: { item: Exercise }) => {
    const suggestedWeight = getSuggestedWeight(item.name, userGender, 'BEGINNER');
    const showSuggestion = suggestedWeight !== null && suggestedWeight > 0;

    return (
      <TouchableOpacity
        style={styles.exerciseItem}
        onPress={() => handleSelectExercise(item)}
      >
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{item.name}</Text>
          <View style={styles.exerciseMeta}>
            {item.muscleGroup && (
              <Text style={styles.muscleGroup}>{item.muscleGroup}</Text>
            )}
            {showSuggestion && (
              <View style={styles.suggestionBadge}>
                <Text style={styles.suggestionText}>
                  Try {formatSuggestedWeight(suggestedWeight, weightUnit)}
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.exerciseActions}>
          {hasVideoDemo(item.videoUrl) && (
            <TouchableOpacity
              style={styles.demoButton}
              onPress={() => handleViewDemo(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="play-circle-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          )}
          <Text style={styles.selectIcon}>+</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {showCreateForm ? 'Create Custom Exercise' : 'Select Exercise'}
            </Text>
            <TouchableOpacity onPress={showCreateForm ? handleCancelCreate : onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {!showCreateForm && (
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreateForm(true)}
            >
              <Text style={styles.createButtonText}>+ Create Custom Exercise</Text>
            </TouchableOpacity>
          )}

          {showCreateForm ? (
            <View style={styles.createFormContainer}>
              <TextInput
                style={styles.formInput}
                placeholder="Exercise Name *"
                placeholderTextColor={colors.textMuted}
                value={customExerciseName}
                onChangeText={setCustomExerciseName}
                maxLength={100}
              />

              <Text style={styles.formLabel}>Muscle Group</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.muscleGroupScroll}
                contentContainerStyle={styles.muscleGroupContent}
              >
                {MUSCLE_GROUPS.filter((g) => g !== 'All').map((group) => (
                  <TouchableOpacity
                    key={group}
                    style={[
                      styles.muscleGroupChip,
                      customMuscleGroup === group && styles.muscleGroupChipActive,
                    ]}
                    onPress={() => setCustomMuscleGroup(group)}
                  >
                    <Text
                      style={[
                        styles.muscleGroupText,
                        customMuscleGroup === group && styles.muscleGroupTextActive,
                      ]}
                    >
                      {group}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TextInput
                style={[styles.formInput, styles.instructionsInput]}
                placeholder="Instructions (optional)"
                placeholderTextColor={colors.textMuted}
                value={customInstructions}
                onChangeText={setCustomInstructions}
                multiline
                numberOfLines={4}
              />

              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={styles.cancelFormButton}
                  onPress={handleCancelCreate}
                >
                  <Text style={styles.cancelFormButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveFormButton}
                  onPress={handleCreateCustomExercise}
                >
                  <Text style={styles.saveFormButtonText}>Create & Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.searchInput}
                placeholder="Search exercises..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.muscleGroupScroll}
            contentContainerStyle={styles.muscleGroupContent}
          >
            {MUSCLE_GROUPS.map((group) => (
              <TouchableOpacity
                key={group}
                style={[
                  styles.muscleGroupChip,
                  selectedMuscleGroup === group &&
                    styles.muscleGroupChipActive,
                ]}
                onPress={() => setSelectedMuscleGroup(group)}
              >
                <Text
                  style={[
                    styles.muscleGroupText,
                    selectedMuscleGroup === group &&
                      styles.muscleGroupTextActive,
                  ]}
                >
                  {group}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading exercises...</Text>
                </View>
              ) : filteredExercises.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No exercises found</Text>
                  <Text style={styles.emptySubtext}>
                    Try adjusting your search or filter
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredExercises}
                  renderItem={renderExerciseItem}
                  keyExtractor={(item) => item.id}
                  style={styles.exerciseList}
                  contentContainerStyle={styles.exerciseListContent}
                />
              )}
            </>
          )}
        </View>
      </View>

      {/* Exercise Detail Modal */}
      <ExerciseDetailModal
        visible={detailModalVisible}
        exercise={selectedExerciseForDetail}
        onClose={() => setDetailModalVisible(false)}
        onSelect={handleSelectFromDetail}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: withOpacity(colors.black, 0.7),
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  closeButton: {
    fontSize: 28,
    color: colors.textSecondary,
    fontWeight: '300',
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  createButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  createFormContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  formInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    color: colors.textPrimary,
    fontSize: 16,
  },
  formLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  instructionsInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelFormButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelFormButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  saveFormButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveFormButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    color: colors.textPrimary,
    fontSize: 16,
  },
  muscleGroupScroll: {
    marginBottom: 16,
  },
  muscleGroupContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  muscleGroupChip: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  muscleGroupChipActive: {
    backgroundColor: colors.primary,
  },
  muscleGroupText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  muscleGroupTextActive: {
    color: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  exerciseList: {
    flex: 1,
  },
  exerciseListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  exerciseItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseInfo: {
    flex: 1,
    marginRight: 12,
  },
  exerciseName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  exerciseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleGroup: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  suggestionBadge: {
    backgroundColor: withOpacity(colors.success, 0.15),
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  suggestionText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '600',
  },
  selectIcon: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '300',
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  demoButton: {
    padding: 4,
  },
});
