import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface QuickLogSetInputProps {
  visible: boolean;
  exerciseName: string;
  setCount: number;
  weightUnit: 'KG' | 'LBS';
  onAddSet: (weight: string, reps: string) => void;
  onDone: () => void;
  onCancel: () => void;
}

export default function QuickLogSetInput({
  visible,
  exerciseName,
  setCount,
  weightUnit,
  onAddSet,
  onDone,
  onCancel,
}: QuickLogSetInputProps) {
  const colors = useTheme();
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const weightRef = useRef<TextInput>(null);
  const repsRef = useRef<TextInput>(null);

  // Reset and focus when modal opens
  useEffect(() => {
    if (visible) {
      setWeight('');
      setReps('');
      setTimeout(() => {
        weightRef.current?.focus();
      }, 100);
    }
  }, [visible]);

  const handleAddSet = () => {
    onAddSet(weight, reps);
    // Clear inputs for next set
    setWeight('');
    setReps('');
    // Refocus weight input
    weightRef.current?.focus();
  };

  const handleWeightSubmit = () => {
    repsRef.current?.focus();
  };

  const handleRepsSubmit = () => {
    handleAddSet();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onCancel}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {exerciseName}
            </Text>
            <TouchableOpacity onPress={onDone}>
              <Text style={[styles.doneText, { color: colors.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.setCounter, { color: colors.textSecondary }]}>
            Set {setCount + 1}
          </Text>

          <View style={styles.inputRow}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                {weightUnit} (optional)
              </Text>
              <TextInput
                ref={weightRef}
                style={[
                  styles.input,
                  { backgroundColor: colors.surfaceElevated, color: colors.textPrimary },
                ]}
                value={weight}
                onChangeText={setWeight}
                onSubmitEditing={handleWeightSubmit}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                Reps (optional)
              </Text>
              <TextInput
                ref={repsRef}
                style={[
                  styles.input,
                  { backgroundColor: colors.surfaceElevated, color: colors.textPrimary },
                ]}
                value={reps}
                onChangeText={setReps}
                onSubmitEditing={handleRepsSubmit}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                returnKeyType="done"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={handleAddSet}
          >
            <Text style={[styles.addButtonText, { color: colors.background }]}>
              + Add Set
            </Text>
          </TouchableOpacity>

          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Leave fields empty to log without tracking numbers
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  cancelText: {
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600',
  },
  setCounter: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  inputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  input: {
    borderRadius: 16,
    padding: 20,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  addButton: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
  },
});
