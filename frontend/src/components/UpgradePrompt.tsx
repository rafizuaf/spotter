/**
 * UpgradePrompt Component
 * 
 * Displays a prompt when user tries to access a premium feature.
 * Shows current tier vs required tier with upgrade option.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useCurrentTier } from '../stores/subscriptionStore';

export interface UpgradePromptProps {
  requiredTier: 'PRO' | 'ELITE';
  featureName?: string; // e.g., "Weekly Volume Reports"
  onUpgrade: () => void;
  onDismiss?: () => void;
}

export default function UpgradePrompt({
  requiredTier,
  featureName,
  onUpgrade,
  onDismiss,
}: UpgradePromptProps) {
  const colors = useTheme();
  const currentTier = useCurrentTier();

  const tierLabels = {
    FREE: 'Free',
    PRO: 'Pro',
    ELITE: 'Elite',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.icon, { color: colors.primary }]}>⭐</Text>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {featureName ? `${featureName} requires ${tierLabels[requiredTier]}` : `${tierLabels[requiredTier]} Feature`}
        </Text>
      </View>

      <Text style={[styles.message, { color: colors.textSecondary }]}>
        You're currently on <Text style={{ fontWeight: '600' }}>{tierLabels[currentTier]}</Text>.
        Upgrade to <Text style={{ fontWeight: '600', color: colors.primary }}>{tierLabels[requiredTier]}</Text> to access this feature.
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.upgradeButton, { backgroundColor: colors.primary }]}
          onPress={onUpgrade}
          accessible={true}
          accessibilityLabel={`Upgrade to ${tierLabels[requiredTier]}`}
          accessibilityHint="Opens subscription options"
        >
          <Text style={[styles.upgradeButtonText, { color: colors.background }]}>
            Upgrade to {tierLabels[requiredTier]}
          </Text>
        </TouchableOpacity>

        {onDismiss && (
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
            accessible={true}
            accessibilityLabel="Maybe later"
            accessibilityHint="Dismisses this upgrade prompt"
          >
            <Text style={[styles.dismissButtonText, { color: colors.textSecondary }]}>
              Maybe Later
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  actions: {
    gap: 12,
  },
  upgradeButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dismissButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: 14,
  },
});
