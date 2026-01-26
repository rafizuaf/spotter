/**
 * LoadingState Component
 * 
 * Standardized loading indicator for consistent UX
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface LoadingStateProps {
  /** Loading message */
  message?: string;
  /** Size of the indicator */
  size?: 'small' | 'large';
  /** Full screen or inline */
  fullScreen?: boolean;
}

export default function LoadingState({
  message = 'Loading...',
  size = 'large',
  fullScreen = false,
}: LoadingStateProps) {
  const colors = useTheme();

  const containerStyle = fullScreen
    ? [styles.fullScreen, { backgroundColor: colors.background }]
    : styles.inline;

  return (
    <View style={containerStyle}>
      <ActivityIndicator size={size} color={colors.primary} />
      {message && (
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inline: {
    padding: 20,
    alignItems: 'center',
  },
  message: {
    marginTop: 12,
    fontSize: 14,
  },
});
