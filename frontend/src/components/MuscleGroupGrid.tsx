import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface MuscleGroup {
  id: string;
  label: string;
}

interface MuscleGroupGridProps {
  onSelect: (muscleGroup: string) => void;
  selectedGroups?: string[];
}

const MUSCLE_GROUPS: MuscleGroup[] = [
  { id: 'Chest', label: 'Chest' },
  { id: 'Back', label: 'Back' },
  { id: 'Shoulders', label: 'Shoulders' },
  { id: 'Arms', label: 'Arms' },
  { id: 'Legs', label: 'Legs' },
  { id: 'Core', label: 'Core' },
  { id: 'Cardio', label: 'Cardio' },
  { id: 'Full Body', label: 'Full Body' },
];

export default function MuscleGroupGrid({ onSelect, selectedGroups = [] }: MuscleGroupGridProps) {
  const colors = useTheme();

  const isSelected = (muscleId: string): boolean => {
    return selectedGroups.includes(muscleId);
  };

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {MUSCLE_GROUPS.map((muscle) => {
          const selected = isSelected(muscle.id);
          return (
            <TouchableOpacity
              key={muscle.id}
              style={[
                styles.button,
                { backgroundColor: colors.surface, borderColor: colors.border },
                selected && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => onSelect(muscle.id)}
              accessibilityLabel={`Select ${muscle.label} exercises`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text
                style={[
                  styles.buttonText,
                  { color: colors.textPrimary },
                  selected && { color: colors.background },
                ]}
              >
                {muscle.label}
              </Text>
              {selected && (
                <View style={[styles.checkmark, { backgroundColor: colors.background }]}>
                  <Text style={[styles.checkmarkText, { color: colors.primary }]}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  button: {
    width: '47%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    position: 'relative',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
