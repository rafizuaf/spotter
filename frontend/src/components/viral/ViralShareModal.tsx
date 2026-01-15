/**
 * ViralShareModal - Orchestrator for viral sharing cards
 *
 * This modal:
 * 1. Fetches stats from the generate-viral-stats Edge Function
 * 2. Renders the appropriate viral card based on shareType
 * 3. Captures the view using react-native-view-shot
 * 4. Provides share options (Save to Photos, Share Sheet, Copy)
 *
 * Uses react-native-view-shot for view capture per project constraint.
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../services/supabase';
import NutritionLabel from './NutritionLabel';
import ReceiptCard from './ReceiptCard';
import AstrologyCard from './AstrologyCard';
import WantedPoster from './WantedPoster';
import Tombstone from './Tombstone';
import RansomNote from './RansomNote';
import FraudAlert from './FraudAlert';
import type {
  ViralShareModalProps,
  NutritionLabelStats,
  WorkoutViralStatsApiResponse,
  MonthlyArchetypeStats,
  ReceiptItem,
  PainLevel,
  ReEngagementApiResponse,
} from './types';

/**
 * ViralShareModal Component
 *
 * Orchestrates the viral sharing flow:
 * 1. Load stats from Edge Function
 * 2. Display viral card
 * 3. Handle capture and sharing
 */
const ViralShareModal: React.FC<ViralShareModalProps> = ({
  visible,
  onClose,
  workoutId,
  shareType,
}) => {
  const colors = useTheme();
  const viewShotRef = useRef<ViewShot>(null);

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<NutritionLabelStats | null>(null);
  const [workoutName, setWorkoutName] = useState('Workout');
  const [workoutDate, setWorkoutDate] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Additional state for different card types
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [archetype, setArchetype] = useState<MonthlyArchetypeStats | null>(null);
  const [reEngagementData, setReEngagementData] = useState<{
    cardType: string | null;
    muscleGroup?: string;
    daysMissing: number;
    lastWorkoutDate?: Date;
  } | null>(null);

  /**
   * Get pain level from percentage
   */
  const getPainLevel = (painPercent: number): PainLevel => {
    if (painPercent < 25) return 'LOW';
    if (painPercent < 50) return 'MEDIUM';
    if (painPercent < 75) return 'HIGH';
    return 'CRITICAL';
  };

  /**
   * Fetch viral stats from Edge Function based on shareType
   */
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Determine which API call to make based on shareType
      if (shareType === 'ARCHETYPE') {
        // Monthly archetype
        const { data, error: invokeError } = await supabase.functions.invoke(
          'generate-viral-stats',
          { body: { type: 'MONTHLY' } }
        );

        if (invokeError) {
          throw new Error(invokeError.message || 'Failed to fetch archetype');
        }

        const response = data as {
          type: 'MONTHLY';
          archetype: MonthlyArchetypeStats;
        };
        setArchetype(response.archetype);
      } else if (['WANTED', 'RANSOM', 'FRAUD_ALERT'].includes(shareType)) {
        // Re-engagement cards
        const { data, error: invokeError } = await supabase.functions.invoke(
          'generate-viral-stats',
          { body: { type: 'RE_ENGAGEMENT' } }
        );

        if (invokeError) {
          throw new Error(invokeError.message || 'Failed to fetch re-engagement data');
        }

        const response = data as ReEngagementApiResponse;
        setReEngagementData({
          cardType: response.card_type,
          muscleGroup: response.muscle_group ?? undefined,
          daysMissing: response.days_missing,
          lastWorkoutDate: response.last_workout_date
            ? new Date(response.last_workout_date)
            : undefined,
        });
      } else {
        // NUTRITION_LABEL, RECEIPT, TOMBSTONE - need workoutId
        if (!workoutId) {
          setError('No workout selected');
          setLoading(false);
          return;
        }

        const { data, error: invokeError } = await supabase.functions.invoke(
          'generate-viral-stats',
          {
            body: {
              type: 'WORKOUT',
              workout_id: workoutId,
            },
          }
        );

        if (invokeError) {
          throw new Error(invokeError.message || 'Failed to fetch stats');
        }

        const response = data as WorkoutViralStatsApiResponse;

        // Map snake_case response to camelCase
        const mappedStats: NutritionLabelStats = {
          totalVolumeKg: response.nutrition_label.total_volume_kg,
          setsCompleted: response.nutrition_label.sets_completed,
          durationMinutes: response.nutrition_label.duration_minutes,
          exercisesCount: response.nutrition_label.exercises_count,
          muscleGroups: response.nutrition_label.muscle_groups,
          prsHit: response.nutrition_label.prs_hit,
          xpEarned: response.nutrition_label.xp_earned,
          painPercent: response.nutrition_label.pain_percent,
          sweatLiters: response.nutrition_label.sweat_liters,
          regretPercent: response.nutrition_label.regret_percent,
        };

        setStats(mappedStats);
        setWorkoutName(response.workout_name);
        setWorkoutDate(new Date(response.workout_date));

        // For Receipt card, create line items from stats
        if (shareType === 'RECEIPT' && mappedStats) {
          // Create dummy receipt items based on muscle groups and volume
          const items: ReceiptItem[] = mappedStats.muscleGroups.map((mg, i) => ({
            name: mg,
            qty: Math.ceil(mappedStats.setsCompleted / mappedStats.muscleGroups.length),
            total: Math.round(mappedStats.totalVolumeKg / mappedStats.muscleGroups.length),
          }));
          setReceiptItems(items);
        }
      }
    } catch (err) {
      console.error('Error fetching viral stats:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load stats'
      );
    } finally {
      setLoading(false);
    }
  }, [workoutId, shareType]);

  // Fetch stats when modal opens
  useEffect(() => {
    if (visible) {
      fetchStats();
    }
  }, [visible, fetchStats]);

  /**
   * Capture the viral card view as an image
   */
  const captureView = useCallback(async (): Promise<string | null> => {
    if (!viewShotRef.current) {
      console.error('ViewShot ref not available');
      return null;
    }

    try {
      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      return uri;
    } catch (err) {
      console.error('Error capturing view:', err);
      return null;
    }
  }, []);

  /**
   * Save captured image to Photos
   */
  const handleSaveToPhotos = useCallback(async () => {
    try {
      setSaving(true);

      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to save images.'
        );
        return;
      }

      // Capture the view
      const uri = await captureView();
      if (!uri) {
        Alert.alert('Failed Rep', 'Could not capture. One more try.');
        return;
      }

      // Save to media library
      await MediaLibrary.saveToLibraryAsync(uri);

      // Haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert('Gains Secured', 'Receipt saved. Now go make them jealous.');
    } catch (err) {
      console.error('Error saving to photos:', err);
      Alert.alert('Failed Rep', 'Could not save. Try again, quitter.');
    } finally {
      setSaving(false);
    }
  }, [captureView]);

  /**
   * Share captured image via system share sheet
   */
  const handleShare = useCallback(async () => {
    try {
      setSharing(true);

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('No Flex Zone', 'Sharing not available on this device.');
        return;
      }

      // Capture the view
      const uri = await captureView();
      if (!uri) {
        Alert.alert('Failed Rep', 'Could not capture. One more try.');
        return;
      }

      // Share
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Time to flex',
        UTI: 'public.png',
      });

      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      console.error('Error sharing:', err);
      // User may have cancelled - don't show error for cancellation
    } finally {
      setSharing(false);
    }
  }, [captureView]);

  /**
   * Render the appropriate viral card based on shareType
   */
  const renderViralCard = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Calculating your suffering...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.textPrimary }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={fetchStats}
          >
            <Text style={styles.retryButtonText}>One More Rep</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Render based on shareType
    switch (shareType) {
      case 'NUTRITION_LABEL':
        if (!stats) return null;
        return (
          <NutritionLabel
            stats={stats}
            workoutName={workoutName}
            date={workoutDate}
          />
        );

      case 'RECEIPT':
        if (!stats) return null;
        return (
          <ReceiptCard
            items={receiptItems}
            subtotal={stats.totalVolumeKg}
            date={workoutDate}
            painLevel={getPainLevel(stats.painPercent)}
            durationMinutes={stats.durationMinutes}
            prsHit={stats.prsHit}
          />
        );

      case 'ARCHETYPE':
        if (!archetype) return null;
        return <AstrologyCard archetype={archetype} />;

      case 'WANTED':
        if (!reEngagementData || !reEngagementData.muscleGroup) {
          return (
            <View style={styles.placeholderContainer}>
              <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
                All muscles accounted for. Suspicious. We're watching.
              </Text>
            </View>
          );
        }
        return (
          <WantedPoster
            muscleGroup={reEngagementData.muscleGroup}
            lastSeen={reEngagementData.lastWorkoutDate || new Date()}
            daysMissing={reEngagementData.daysMissing}
          />
        );

      case 'TOMBSTONE':
        // Tombstone requires specific failed PR data - show placeholder if not available
        if (!stats) {
          return (
            <View style={styles.placeholderContainer}>
              <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
                No failed PRs on record. Your ego lives another day.
              </Text>
            </View>
          );
        }
        // For demo purposes, show a sample tombstone
        return (
          <Tombstone
            exerciseName={workoutName}
            attemptedWeight={stats.totalVolumeKg > 0 ? Math.round(stats.totalVolumeKg / stats.setsCompleted) : 100}
            failedAt={workoutDate}
            reps={0}
          />
        );

      case 'RANSOM':
        if (!reEngagementData) {
          return (
            <View style={styles.placeholderContainer}>
              <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
                Your gains are safe... for now.
              </Text>
            </View>
          );
        }
        return (
          <RansomNote
            daysSinceWorkout={reEngagementData.daysMissing}
            gainsAtRisk={reEngagementData.muscleGroup ? [reEngagementData.muscleGroup] : ['Arms', 'Chest', 'Back']}
          />
        );

      // Handle FRAUD_ALERT as a special case (not in ViralShareType but supported)
      default:
        // Check if it's a fraud alert based on re-engagement data
        if (reEngagementData?.cardType === 'FRAUD_ALERT' && reEngagementData.muscleGroup) {
          return (
            <FraudAlert
              muscleGroup={reEngagementData.muscleGroup}
              daysSinceVolume={reEngagementData.daysMissing}
            />
          );
        }
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View
          style={[styles.header, { borderBottomColor: colors.border }]}
        >
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessible={true}
            accessibilityLabel="Close modal"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Flex on the Timeline
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Card Preview */}
        <View style={styles.previewContainer}>
          <ViewShot
            ref={viewShotRef}
            options={{
              format: 'png',
              quality: 1,
            }}
            style={styles.viewShot}
          >
            {renderViralCard()}
          </ViewShot>
        </View>

        {/* Action Buttons */}
        {!loading && !error && (stats || archetype || reEngagementData) && (
          <View style={styles.actionsContainer}>
            {/* Save to Photos */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: colors.surface },
              ]}
              onPress={handleSaveToPhotos}
              disabled={saving}
              accessible={true}
              accessibilityLabel="Save to photos"
              accessibilityRole="button"
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons
                  name="download-outline"
                  size={24}
                  color={colors.textPrimary}
                />
              )}
              <Text
                style={[styles.actionButtonText, { color: colors.textPrimary }]}
              >
                Keep Receipt
              </Text>
            </TouchableOpacity>

            {/* Share */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.primaryButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={handleShare}
              disabled={sharing}
              accessible={true}
              accessibilityLabel="Share workout"
              accessibilityRole="button"
            >
              {sharing ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Ionicons name="share-outline" size={24} color="#000000" />
              )}
              <Text style={[styles.actionButtonText, styles.primaryButtonText]}>
                Flex
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

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
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 44,
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  viewShot: {
    // Transparent background for the ViewShot wrapper
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  placeholderContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    paddingTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    minHeight: 56,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    // Primary button styling
  },
  primaryButtonText: {
    color: '#000000',
  },
});

export default memo(ViralShareModal);
