/**
 * QuickSelectSetRow Component Tests
 * 
 * Tests for the 3-tap set logging component
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import QuickSelectSetRow from '../src/components/QuickSelectSetRow';

// Mock dependencies
jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => ({
    background: '#0a0a0a',
    surface: '#1a1a1a',
    textPrimary: '#f5f5f5',
    textSecondary: '#a0a0a0',
    primary: '#d4af37',
  }),
}));

jest.mock('../src/hooks/useExerciseHistory', () => ({
  useExerciseHistory: () => ({
    lastWorkoutWeight: 100,
    lastWorkoutReps: 10,
    suggestedWeight: 105,
    isLoading: false,
    refresh: jest.fn(),
  }),
  getWeightPresets: () => [100, 105, 110],
  REP_PRESETS: [5, 8, 10, 12, 15],
  getDefaultReps: () => 10,
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
}));

describe('QuickSelectSetRow', () => {
  const defaultProps = {
    setIndex: 1,
    exerciseEntryId: 'exercise-1',
    exerciseId: 'bench-press',
    exerciseName: 'Bench Press',
    currentWeight: '',
    currentReps: '',
    isCompleted: false,
    weightUnit: 'KG' as const,
    workoutMode: 'SIMPLE' as const,
    userGender: 'MALE' as const,
    onWeightChange: jest.fn(),
    onRepsChange: jest.fn(),
    onComplete: jest.fn(),
  };

  it('should render set row with exercise name', () => {
    const { getByText } = render(<QuickSelectSetRow {...defaultProps} />);
    expect(getByText('Bench Press')).toBeTruthy();
  });

  it('should show weight presets when available', () => {
    const { getByText } = render(<QuickSelectSetRow {...defaultProps} />);
    // Should show preset buttons
    expect(getByText('100')).toBeTruthy();
  });

  it('should call onComplete when set is completed', () => {
    const onComplete = jest.fn();
    const { getByText } = render(
      <QuickSelectSetRow {...defaultProps} onComplete={onComplete} />
    );
    
    // Simulate completing a set
    const completeButton = getByText('✓');
    fireEvent.press(completeButton);
    
    expect(onComplete).toHaveBeenCalled();
  });
});
