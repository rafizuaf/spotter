/**
 * Subscription Settings Screen
 * 
 * Displays current subscription status and management options.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/authStore';
import {
  useSubscriptionStore,
  useCurrentTier,
  TIER_LIMITS,
} from '../../src/stores/subscriptionStore';
import PaywallModal from '../../src/components/PaywallModal';
import { restorePurchases } from '../../src/services/purchases';
import { syncDatabase } from '../../src/db/sync';

export default function SubscriptionScreen() {
  const colors = useTheme();
  const { user } = useAuthStore();
  const currentTier = useCurrentTier();
  const {
    isTrial,
    trialEndsAt,
    validUntil,
    source,
    isLoading,
    refresh,
    daysUntilExpiry,
    isExpired,
  } = useSubscriptionStore();
  const [showPaywall, setShowPaywall] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (user?.id) {
      refresh(user.id);
    }
  }, [user?.id, refresh]);

  const handleManageSubscription = () => {
    // Open App Store or Play Store subscription management
    if (Platform.OS === 'ios') {
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    } else if (Platform.OS === 'android') {
      Linking.openURL('https://play.google.com/store/account/subscriptions');
    } else {
      Alert.alert('Not Available', 'Subscription management is only available on iOS and Android.');
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const customerInfo = await restorePurchases();
      if (customerInfo) {
        await syncDatabase();
        if (user?.id) {
          await refresh(user.id);
        }
        Alert.alert('Success', 'Purchases restored successfully.');
      } else {
        Alert.alert('No Purchases', 'No previous purchases found to restore.');
      }
    } catch (err) {
      console.error('Restore error:', err);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  const handleUpgrade = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPaywall(true);
  };

  const handlePurchaseComplete = async () => {
    if (user?.id) {
      await refresh(user.id);
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getTierColor = (tier: string) => {
    if (tier === 'ELITE') return colors.primary;
    if (tier === 'PRO') return colors.primary;
    return colors.textSecondary;
  };

  const tierLimits = TIER_LIMITS[currentTier];

  return (
    <>
      <Stack.Screen options={{ title: 'Subscription' }} />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Current Plan Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Current Plan</Text>
            {isLoading && (
              <View style={styles.loadingBadge}>
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading...</Text>
              </View>
            )}
          </View>

          <View style={styles.tierDisplay}>
            <Text style={[styles.tierName, { color: getTierColor(currentTier) }]}>
              {currentTier}
            </Text>
            {isTrial && trialEndsAt && (
              <View style={[styles.badge, { backgroundColor: colors.warning + '20' }]}>
                <Text style={[styles.badgeText, { color: colors.warning }]}>Trial</Text>
              </View>
            )}
            {isExpired() && (
              <View style={[styles.badge, { backgroundColor: colors.error + '20' }]}>
                <Text style={[styles.badgeText, { color: colors.error }]}>Expired</Text>
              </View>
            )}
          </View>

          {/* Status Details */}
          <View style={styles.statusDetails}>
            {validUntil && (
              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
                  {isTrial ? 'Trial ends' : 'Expires'}
                </Text>
                <Text style={[styles.statusValue, { color: colors.textPrimary }]}>
                  {formatDate(validUntil)}
                </Text>
              </View>
            )}

            {daysUntilExpiry() !== null && !isExpired() && (
              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
                  Days remaining
                </Text>
                <Text style={[styles.statusValue, { color: colors.textPrimary }]}>
                  {daysUntilExpiry()}
                </Text>
              </View>
            )}

            {source && (
              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Source</Text>
                <Text style={[styles.statusValue, { color: colors.textPrimary }]}>{source}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Feature Limits */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Your Limits</Text>
          <View style={styles.limitsList}>
            <View style={styles.limitRow}>
              <Text style={[styles.limitLabel, { color: colors.textSecondary }]}>Routines</Text>
              <Text style={[styles.limitValue, { color: colors.textPrimary }]}>
                {tierLimits.maxRoutines === Infinity ? 'Unlimited' : tierLimits.maxRoutines}
              </Text>
            </View>
            <View style={styles.limitRow}>
              <Text style={[styles.limitLabel, { color: colors.textSecondary }]}>
                Custom Exercises
              </Text>
              <Text style={[styles.limitValue, { color: colors.textPrimary }]}>
                {tierLimits.maxCustomExercises === Infinity
                  ? 'Unlimited'
                  : tierLimits.maxCustomExercises}
              </Text>
            </View>
            <View style={styles.limitRow}>
              <Text style={[styles.limitLabel, { color: colors.textSecondary }]}>History</Text>
              <Text style={[styles.limitValue, { color: colors.textPrimary }]}>
                {tierLimits.historyDays === Infinity ? 'Unlimited' : `${tierLimits.historyDays} days`}
              </Text>
            </View>
            <View style={styles.limitRow}>
              <Text style={[styles.limitLabel, { color: colors.textSecondary }]}>
                Weekly Volume
              </Text>
              <Text style={[styles.limitValue, { color: colors.textPrimary }]}>
                {tierLimits.hasWeeklyVolumeReport ? '✓' : '—'}
              </Text>
            </View>
            <View style={styles.limitRow}>
              <Text style={[styles.limitLabel, { color: colors.textSecondary }]}>
                Training Max
              </Text>
              <Text style={[styles.limitValue, { color: colors.textPrimary }]}>
                {tierLimits.hasTrainingMax ? '✓' : '—'}
              </Text>
            </View>
            <View style={styles.limitRow}>
              <Text style={[styles.limitLabel, { color: colors.textSecondary }]}>
                Advanced Programs
              </Text>
              <Text style={[styles.limitValue, { color: colors.textPrimary }]}>
                {tierLimits.hasAdvancedPrograms ? '✓' : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {currentTier === 'FREE' && (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleUpgrade}
              accessible={true}
              accessibilityLabel="Upgrade subscription"
            >
              <Text style={[styles.primaryButtonText, { color: colors.background }]}>
                Upgrade to Pro or Elite
              </Text>
            </TouchableOpacity>
          )}

          {currentTier !== 'FREE' && (
            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handleManageSubscription}
              accessible={true}
              accessibilityLabel="Manage subscription in App Store or Play Store"
            >
              <Ionicons name="settings-outline" size={20} color={colors.textPrimary} />
              <Text style={[styles.secondaryButtonText, { color: colors.textPrimary }]}>
                Manage Subscription
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleRestore}
            disabled={restoring}
            accessible={true}
            accessibilityLabel="Restore previous purchases"
          >
            {restoring ? (
              <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>
                Restoring...
              </Text>
            ) : (
              <>
                <Ionicons name="refresh-outline" size={20} color={colors.textPrimary} />
                <Text style={[styles.secondaryButtonText, { color: colors.textPrimary }]}>
                  Restore Purchases
                </Text>
              </>
            )}
          </TouchableOpacity>

          {currentTier !== 'ELITE' && (
            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handleUpgrade}
              accessible={true}
              accessibilityLabel="Upgrade subscription"
            >
              <Ionicons name="arrow-up-outline" size={20} color={colors.primary} />
              <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                {currentTier === 'FREE' ? 'Upgrade to Pro' : 'Upgrade to Elite'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        defaultTier={currentTier === 'FREE' ? 'PRO' : 'ELITE'}
        onPurchaseComplete={handlePurchaseComplete}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  loadingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  loadingText: {
    fontSize: 12,
  },
  tierDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  tierName: {
    fontSize: 32,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusDetails: {
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  limitsList: {
    marginTop: 12,
    gap: 12,
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  limitLabel: {
    fontSize: 14,
  },
  limitValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionsContainer: {
    padding: 16,
    gap: 12,
  },
  primaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 40,
  },
});
