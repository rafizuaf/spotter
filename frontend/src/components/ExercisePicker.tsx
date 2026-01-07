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
import { Q } from '@nozbe/watermelondb';
import { database, exercisesCollection } from '../db';
import { useAuthStore } from '../stores/authStore';
import { v4 as uuid } from 'uuid';
import type Exercise from '../db/models/Exercise';

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

  // Custom exercise creation state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [customExerciseName, setCustomExerciseName] = useState('');
  const [customMuscleGroup, setCustomMuscleGroup] = useState('Chest');
  const [customInstructions, setCustomInstructions] = useState('');

  useEffect(() => {
    if (visible) {
      loadExercises();
    }
  }, [visible]);

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
      console.error('Error loading exercises:', error);
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
      console.error('Error creating custom exercise:', error);
      Alert.alert('Error', 'Failed to create custom exercise');
    }
  };

  const handleCancelCreate = () => {
    setCustomExerciseName('');
    setCustomMuscleGroup('Chest');
    setCustomInstructions('');
    setShowCreateForm(false);
  };

  const renderExerciseItem = ({ item }: { item: Exercise }) => (
    <TouchableOpacity
      style={styles.exerciseItem}
      onPress={() => handleSelectExercise(item)}
    >
      <View>
        <Text style={styles.exerciseName}>{item.name}</Text>
        {item.muscleGroup && (
          <Text style={styles.muscleGroup}>{item.muscleGroup}</Text>
        )}
      </View>
      <Text style={styles.selectIcon}>+</Text>
    </TouchableOpacity>
  );

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
                placeholderTextColor="#64748b"
                value={customExerciseName}
                onChangeText={setCustomExerciseName}
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
                placeholderTextColor="#64748b"
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
                placeholderTextColor="#64748b"
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0f172a',
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
    color: '#fff',
  },
  closeButton: {
    fontSize: 28,
    color: '#94a3b8',
    fontWeight: '300',
  },
  createButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  createFormContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  formInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    color: '#fff',
    fontSize: 16,
  },
  formLabel: {
    fontSize: 14,
    color: '#94a3b8',
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
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelFormButtonText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  saveFormButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveFormButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    color: '#fff',
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
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  muscleGroupChipActive: {
    backgroundColor: '#6366f1',
  },
  muscleGroupText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  muscleGroupTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#94a3b8',
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
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  muscleGroup: {
    color: '#94a3b8',
    fontSize: 14,
  },
  selectIcon: {
    color: '#6366f1',
    fontSize: 24,
    fontWeight: '300',
  },
});
