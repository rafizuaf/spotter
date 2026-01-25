/**
 * PaywallModal Component
 * 
 * Full-screen subscription modal with tier comparison and purchase flow.
 * Integrates with RevenueCat to display offerings and handle purchases.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';
import { useCurrentTier, TIER_LIMITS } from '../stores/subscriptionStore';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  type Offerings,
  type PurchasesPackage,
} from '../services/purchases';
import { syncDatabase } from '../db/sync';

export interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  defaultTier?: 'PRO' | 'ELITE'; // Pre-select tier
  onPurchaseComplete?: () => void; // Called after successful purchase
}

export default function PaywallModal({
  visible,
  onClose,
  defaultTier,
  onPurchaseComplete,
}: PaywallModalProps) {
  const colors = useTheme();
  const currentTier = useCurrentTier();
  const [selectedTier, setSelectedTier] = useState<'PRO' | 'ELITE'>(defaultTier || 'PRO');
  const [offerings, setOfferings] = useState<Offerings | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null); // Package identifier being purchased
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadOfferings();
      if (defaultTier) {
        setSelectedTier(defaultTier);
      }
    }
  }, [visible, defaultTier]);

  const loadOfferings = async () => {
    setLoading(true);
    setError(null);
    try {
      const offeringsData = await getOfferings();
      setOfferings(offeringsData);
    } catch (err) {
      console.error('Error loading offerings:', err);
      setError('Failed to load subscription options. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pkg: PurchasesPackage) => {
    setPurchasing(pkg.identifier);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await purchasePackage(pkg);

      if ('error' in result) {
        if (result.error !== 'Purchase cancelled') {
          setError(result.error);
          Alert.alert('Purchase Failed', result.error);
        }
        setPurchasing(null);
        return;
      }

      // Purchase successful - sync database to get updated entitlement
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await syncDatabase();
      
      // Refresh subscription store (will be done by sync)
      if (onPurchaseComplete) {
        onPurchaseComplete();
      }

      Alert.alert('Success!', 'Your subscription is now active.', [
        { text: 'OK', onPress: onClose },
      ]);
    } catch (err) {
      console.error('Purchase error:', err);
      setError('An unexpected error occurred. Please try again.');
      Alert.alert('Error', 'Purchase failed. Please try again.');
      setPurchasing(null);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const customerInfo = await restorePurchases();
      if (customerInfo) {
        await syncDatabase();
        Alert.alert('Success', 'Purchases restored successfully.', [
          { text: 'OK', onPress: onClose },
        ]);
        if (onPurchaseComplete) {
          onPurchaseComplete();
        }
      } else {
        Alert.alert('No Purchases', 'No previous purchases found to restore.');
      }
    } catch (err) {
      console.error('Restore error:', err);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPackagesForTier = (tier: 'PRO' | 'ELITE'): PurchasesPackage[] => {
    if (!offerings?.current) return [];

    const packages: PurchasesPackage[] = [];
    const availablePackages = offerings.current.availablePackages;

    // Look for packages matching tier pattern
    for (const pkg of availablePackages) {
      const identifier = pkg.identifier.toLowerCase();
      if (tier === 'PRO' && identifier.includes('pro')) {
        packages.push(pkg);
      } else if (tier === 'ELITE' && identifier.includes('elite')) {
        packages.push(pkg);
      }
    }

    // Sort: monthly, yearly, lifetime
    return packages.sort((a, b) => {
      const aId = a.identifier.toLowerCase();
      const bId = b.identifier.toLowerCase();
      if (aId.includes('monthly')) return -1;
      if (bId.includes('monthly')) return 1;
      if (aId.includes('yearly')) return -1;
      if (bId.includes('yearly')) return 1;
      return 0;
    });
  };

  const renderTierComparison = () => {
    const features = [
      { name: 'Routines', free: '3', pro: '10', elite: 'Unlimited' },
      { name: 'Custom Exercises', free: '7', pro: '50', elite: 'Unlimited' },
      { name: 'History', free: '7 days', pro: 'Unlimited', elite: 'Unlimited' },
      { name: 'Export CSV', free: '1x/month', pro: 'Unlimited', elite: 'Unlimited' },
      { name: 'Export JSON', free: '—', pro: '✓', elite: '✓' },
      { name: 'Export PDF', free: '—', pro: '—', elite: '✓' },
      { name: 'Weekly Volume', free: '—', pro: '✓', elite: '✓' },
      { name: 'Training Max', free: '—', pro: '—', elite: '✓' },
      { name: 'Advanced Programs', free: '—', pro: '—', elite: '✓' },
    ];

    return (
      <View style={[styles.comparisonTable, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>Feature</Text>
          <Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>Free</Text>
          <Text style={[styles.tableHeaderText, { color: colors.primary }]}>Pro</Text>
          <Text style={[styles.tableHeaderText, { color: colors.primary }]}>Elite</Text>
        </View>
        {features.map((feature, idx) => (
          <View
            key={feature.name}
            style={[
              styles.tableRow,
              { borderBottomColor: colors.border },
              idx === features.length - 1 && styles.tableRowLast,
            ]}
          >
            <Text style={[styles.tableCell, { color: colors.textPrimary }]}>{feature.name}</Text>
            <Text style={[styles.tableCell, { color: colors.textSecondary }]}>{feature.free}</Text>
            <Text style={[styles.tableCell, { color: colors.textSecondary }]}>{feature.pro}</Text>
            <Text style={[styles.tableCell, { color: colors.textSecondary }]}>{feature.elite}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderPackageButton = (pkg: PurchasesPackage) => {
    const isPurchasing = purchasing === pkg.identifier;
    const isMonthly = pkg.identifier.toLowerCase().includes('monthly');
    const isYearly = pkg.identifier.toLowerCase().includes('yearly');
    const isLifetime = pkg.identifier.toLowerCase().includes('lifetime');

    let label = '';
    if (isMonthly) label = 'Monthly';
    else if (isYearly) label = 'Yearly';
    else if (isLifetime) label = 'Lifetime';
    else label = pkg.packageType;

    return (
      <TouchableOpacity
        key={pkg.identifier}
        style={[
          styles.packageButton,
          { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
          isPurchasing && styles.packageButtonPurchasing,
        ]}
        onPress={() => handlePurchase(pkg)}
        disabled={isPurchasing || loading}
        accessible={true}
        accessibilityLabel={`Purchase ${label} ${selectedTier} subscription`}
        accessibilityHint={`Price: ${pkg.product.priceString}`}
      >
        {isPurchasing ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <>
            <View style={styles.packageInfo}>
              <Text style={[styles.packageLabel, { color: colors.textPrimary }]}>{label}</Text>
              <Text style={[styles.packagePrice, { color: colors.primary }]}>
                {pkg.product.priceString}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Close subscription modal"
          >
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Upgrade</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading && !offerings ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading subscription options...
              </Text>
            </View>
          ) : (
            <>
              {/* Tier Selector */}
              <View style={styles.tierSelector}>
                <TouchableOpacity
                  style={[
                    styles.tierButton,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    selectedTier === 'PRO' && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => {
                    setSelectedTier('PRO');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text
                    style={[
                      styles.tierButtonText,
                      { color: selectedTier === 'PRO' ? colors.background : colors.textPrimary },
                    ]}
                  >
                    Pro
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.tierButton,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    selectedTier === 'ELITE' && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => {
                    setSelectedTier('ELITE');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text
                    style={[
                      styles.tierButtonText,
                      { color: selectedTier === 'ELITE' ? colors.background : colors.textPrimary },
                    ]}
                  >
                    Elite
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Packages */}
              {getPackagesForTier(selectedTier).length > 0 ? (
                <View style={styles.packagesContainer}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    Choose a Plan
                  </Text>
                  {getPackagesForTier(selectedTier).map(renderPackageButton)}
                </View>
              ) : (
                <View style={styles.noPackagesContainer}>
                  <Text style={[styles.noPackagesText, { color: colors.textSecondary }]}>
                    No subscription packages available. Please check your RevenueCat configuration.
                  </Text>
                </View>
              )}

              {/* Comparison Table */}
              {renderTierComparison()}

              {/* Error Message */}
              {error && (
                <View style={[styles.errorContainer, { backgroundColor: colors.error + '20' }]}>
                  <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                </View>
              )}

              {/* Restore Purchases */}
              <TouchableOpacity
                style={styles.restoreButton}
                onPress={handleRestore}
                disabled={loading}
                accessible={true}
                accessibilityLabel="Restore previous purchases"
              >
                <Text style={[styles.restoreButtonText, { color: colors.textSecondary }]}>
                  Restore Purchases
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  tierSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  tierButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  tierButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  packagesContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  packageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  packageButtonPurchasing: {
    opacity: 0.6,
  },
  packageInfo: {
    flex: 1,
  },
  packageLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  packagePrice: {
    fontSize: 14,
  },
  comparisonTable: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 24,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: {
    flex: 1,
    fontSize: 14,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  noPackagesContainer: {
    padding: 20,
    marginBottom: 24,
  },
  noPackagesText: {
    fontSize: 14,
    textAlign: 'center',
  },
  restoreButton: {
    padding: 16,
    alignItems: 'center',
  },
  restoreButtonText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
