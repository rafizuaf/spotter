/**
 * ErrorState Component
 * 
 * Standardized error display for consistent UX
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import type { AppError } from '../utils/errorHandler';

interface ErrorStateProps {
  /** Error to display */
  error: AppError | Error | string;
  /** Retry callback */
  onRetry?: () => void;
  /** Full screen or inline */
  fullScreen?: boolean;
}

export default function ErrorState({
  error,
  onRetry,
  fullScreen = false,
}: ErrorStateProps) {
  const colors = useTheme();

  const errorMessage =
    typeof error === 'string'
      ? error
      : 'userMessage' in error
        ? error.userMessage
        : error instanceof Error
          ? error.message
          : 'An error occurred';

  const containerStyle = fullScreen
    ? [styles.fullScreen, { backgroundColor: colors.background }]
    : styles.inline;

  return (
    <View style={containerStyle}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Something went wrong
      </Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {errorMessage}
      </Text>
      {onRetry && (
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={onRetry}
          accessible={true}
          accessibilityLabel="Retry"
          accessibilityRole="button"
        >
          <Text style={[styles.retryButtonText, { color: colors.background }]}>
            Try Again
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  inline: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
